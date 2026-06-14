package com.securemeet.service;

import com.securemeet.dto.MeetingDto;
import com.securemeet.entity.MeetingSession;
import com.securemeet.entity.Report;
import com.securemeet.entity.User;
import com.securemeet.repository.MeetingSessionRepository;
import com.securemeet.repository.ReportRepository;
import com.securemeet.repository.UserRepository;
import com.securemeet.repository.JoinRequestRepository;
import com.securemeet.entity.MeetingInvitee;
import com.securemeet.repository.MeetingInviteeRepository;
import io.openvidu.java.client.*;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class MeetingService {

    private final OpenVidu openVidu;
    private final MeetingSessionRepository sessionRepository;
    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final JoinRequestRepository joinRequestRepository;
    private final MeetingInviteeRepository meetingInviteeRepository;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow();
    }

    public MeetingDto.SessionResponse createSession(MeetingDto.CreateSessionRequest request) throws Exception {
        if (request.getScheduledAt() != null && !request.getScheduledAt().isBlank()) {
            String uuidSessionId = java.util.UUID.randomUUID().toString();
            MeetingSession entity = MeetingSession.builder()
                    .sessionId(uuidSessionId)
                    .title(request.getTitle())
                    .createdBy(currentUser())
                    .scheduledAt(LocalDateTime.parse(request.getScheduledAt()))
                    .status(MeetingSession.SessionStatus.UPCOMING)
                    .build();
            sessionRepository.save(entity);

            // Save invitees if provided
            if (request.getInvitees() != null && !request.getInvitees().isEmpty()) {
                for (String email : request.getInvitees()) {
                    if (email != null && !email.trim().isBlank()) {
                        MeetingInvitee invitee = MeetingInvitee.builder()
                                .sessionId(uuidSessionId)
                                .email(email.trim())
                                .build();
                        meetingInviteeRepository.save(invitee);

                        // Notify participant via WS
                        MeetingDto.NotificationMessage notif = MeetingDto.NotificationMessage.builder()
                                .type("MEETING_SCHEDULED")
                                .title(request.getTitle())
                                .sessionId(uuidSessionId)
                                .hostName(currentUser().getFullName())
                                .scheduledAt(request.getScheduledAt())
                                .build();
                        messagingTemplate.convertAndSend("/topic/notifications/" + email.trim(), notif);
                    }
                }
            }

            return new MeetingDto.SessionResponse(uuidSessionId, request.getTitle(), "", "UPCOMING", entity.getCreatedBy().getId());
        }

        SessionProperties properties = new SessionProperties.Builder().build();
        Session session = openVidu.createSession(properties);

        MeetingSession entity = MeetingSession.builder()
                .sessionId(session.getSessionId())
                .title(request.getTitle())
                .createdBy(currentUser())
                .build();
        sessionRepository.save(entity);

        // Save invitees if provided for immediate session
        if (request.getInvitees() != null && !request.getInvitees().isEmpty()) {
            for (String email : request.getInvitees()) {
                if (email != null && !email.trim().isBlank()) {
                    MeetingInvitee invitee = MeetingInvitee.builder()
                            .sessionId(session.getSessionId())
                            .email(email.trim())
                            .build();
                    meetingInviteeRepository.save(invitee);

                    // Notify participant via WS
                    MeetingDto.NotificationMessage notif = MeetingDto.NotificationMessage.builder()
                            .type("MEETING_STARTED")
                            .title(request.getTitle())
                            .sessionId(session.getSessionId())
                            .hostName(currentUser().getFullName())
                            .scheduledAt(null)
                            .build();
                    messagingTemplate.convertAndSend("/topic/notifications/" + email.trim(), notif);
                }
            }
        }

        String token = createToken(session);
        return new MeetingDto.SessionResponse(session.getSessionId(), request.getTitle(), token, "ACTIVE", entity.getCreatedBy().getId());
    }

    public MeetingDto.SessionResponse joinSession(String sessionId) throws Exception {
        MeetingSession entity = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (entity.getStatus() == MeetingSession.SessionStatus.ENDED)
            throw new RuntimeException("Session has ended");

        User user = currentUser();

        Session session = openVidu.getActiveSession(sessionId);
        if (session == null) {
            if (entity.getStatus() == MeetingSession.SessionStatus.UPCOMING) {
                if (entity.getCreatedBy().getId().equals(user.getId())) {
                    SessionProperties properties = new SessionProperties.Builder().customSessionId(sessionId).build();
                    session = openVidu.createSession(properties);
                    entity.setStatus(MeetingSession.SessionStatus.ACTIVE);
                    entity.setStartedAt(LocalDateTime.now());
                    sessionRepository.save(entity);
                } else {
                    throw new RuntimeException("Host has not started this meeting yet.");
                }
            } else {
                throw new RuntimeException("Session not active in OpenVidu");
            }
        }

        // 1. If host: join immediately
        if (entity.getCreatedBy().getId().equals(user.getId())) {
            String token = createToken(session);
            return new MeetingDto.SessionResponse(sessionId, entity.getTitle(), token, "ACTIVE", entity.getCreatedBy().getId());
        }

        // 2. If participant, check JoinRequest
        java.util.Optional<com.securemeet.entity.JoinRequest> optReq = joinRequestRepository.findBySessionIdAndUserId(sessionId, user.getId());

        if (optReq.isPresent()) {
            com.securemeet.entity.JoinRequest req = optReq.get();
            if (req.getStatus() == com.securemeet.entity.JoinRequest.RequestStatus.APPROVED) {
                String token = createToken(session);
                return new MeetingDto.SessionResponse(sessionId, entity.getTitle(), token, "ACTIVE", entity.getCreatedBy().getId());
            } else if (req.getStatus() == com.securemeet.entity.JoinRequest.RequestStatus.REJECTED) {
                return new MeetingDto.SessionResponse(sessionId, entity.getTitle(), "", "REJECTED", entity.getCreatedBy().getId());
            } else {
                // PENDING, return status PENDING_APPROVAL
                broadcastJoinRequest(req);
                return new MeetingDto.SessionResponse(sessionId, entity.getTitle(), "", "PENDING_APPROVAL", entity.getCreatedBy().getId());
            }
        } else {
            // No request exists yet. Create one
            com.securemeet.entity.JoinRequest newReq = com.securemeet.entity.JoinRequest.builder()
                    .sessionId(sessionId)
                    .user(user)
                    .status(com.securemeet.entity.JoinRequest.RequestStatus.PENDING)
                    .build();
            joinRequestRepository.save(newReq);

            // Notify Host
            broadcastJoinRequest(newReq);

            return new MeetingDto.SessionResponse(sessionId, entity.getTitle(), "", "PENDING_APPROVAL", entity.getCreatedBy().getId());
        }
    }

    private String createToken(Session session) throws OpenViduJavaClientException, OpenViduHttpException {
        ConnectionProperties props = new ConnectionProperties.Builder()
                .type(ConnectionType.WEBRTC)
                .role(OpenViduRole.PUBLISHER)
                .build();
        Connection connection = session.createConnection(props);
        return connection.getToken();
    }

    public void reportUser(MeetingDto.ReportRequest request) {
        User reporter = currentUser();
        User reported = userRepository.findById(request.getReportedUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        MeetingSession session = sessionRepository.findBySessionId(request.getSessionId())
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getCreatedBy().getId().equals(reported.getId())) {
            throw new RuntimeException("Cannot report the host of the meeting");
        }

        Report report = Report.builder()
                .reportedBy(reporter)
                .reportedUser(reported)
                .session(session)
                .reason(request.getReason())
                .build();
        reportRepository.save(report);

        // Notify admin via WebSocket
        MeetingDto.ReportNotification notification = new MeetingDto.ReportNotification(
                report.getId(),
                reported.getFullName(),
                reporter.getFullName(),
                request.getSessionId(),
                request.getReason()
        );
        messagingTemplate.convertAndSend("/topic/admin/reports", notification);

        // Kick reported user from session
        MeetingDto.KickNotification kick = new MeetingDto.KickNotification(
                reported.getId(),
                request.getSessionId(),
                "You have been removed from the session due to a report."
        );
        messagingTemplate.convertAndSend("/topic/session/" + request.getSessionId() + "/kick", kick);
    }

    public void endSession(String sessionId) throws Exception {
        MeetingSession entity = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        entity.setStatus(MeetingSession.SessionStatus.ENDED);
        entity.setEndedAt(LocalDateTime.now());
        sessionRepository.save(entity);

        Session session = openVidu.getActiveSession(sessionId);
        if (session != null) session.close();

        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/ended", "Session ended by host.");
    }

    public List<MeetingSession> getActiveSessions() {
        return sessionRepository.findByStatus(MeetingSession.SessionStatus.ACTIVE);
    }

    public List<Report> getPendingReports() {
        return reportRepository.findByStatus(Report.ReportStatus.PENDING);
    }

    private void broadcastJoinRequest(com.securemeet.entity.JoinRequest req) {
        MeetingDto.JoinRequestResponse lobbyDto = new MeetingDto.JoinRequestResponse(
                req.getId(),
                req.getSessionId(),
                req.getUser().getId(),
                req.getUser().getFullName(),
                req.getUser().getEmail(),
                req.getStatus().name()
        );
        messagingTemplate.convertAndSend("/topic/session/" + req.getSessionId() + "/lobby", lobbyDto);
    }

    public List<com.securemeet.entity.JoinRequest> getPendingRequests(String sessionId) {
        return joinRequestRepository.findBySessionIdAndStatus(sessionId, com.securemeet.entity.JoinRequest.RequestStatus.PENDING);
    }

    public void approveJoinRequest(Long requestId) {
        com.securemeet.entity.JoinRequest req = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Join request not found"));
        req.setStatus(com.securemeet.entity.JoinRequest.RequestStatus.APPROVED);
        joinRequestRepository.save(req);

        // Notify participant via WebSocket
        messagingTemplate.convertAndSend(
                "/topic/session/" + req.getSessionId() + "/join-status/" + req.getUser().getId(),
                java.util.Map.of("status", "APPROVED", "requestId", requestId)
        );

        // Notify host to update lobby list
        broadcastJoinRequest(req);
    }

    public void rejectJoinRequest(Long requestId) {
        com.securemeet.entity.JoinRequest req = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Join request not found"));
        req.setStatus(com.securemeet.entity.JoinRequest.RequestStatus.REJECTED);
        joinRequestRepository.save(req);

        // Notify participant via WebSocket
        messagingTemplate.convertAndSend(
                "/topic/session/" + req.getSessionId() + "/join-status/" + req.getUser().getId(),
                java.util.Map.of("status", "REJECTED", "requestId", requestId)
        );

        // Notify host to update lobby list
        broadcastJoinRequest(req);
    }

    public MeetingDto.DashboardDataResponse getDashboardData() {
        User user = currentUser();

        // 1. Fetch user's invited session IDs
        List<String> invitedSessionIds = meetingInviteeRepository.findByEmail(user.getEmail())
                .stream()
                .map(com.securemeet.entity.MeetingInvitee::getSessionId)
                .collect(java.util.stream.Collectors.toList());

        // 2. Fetch all meeting sessions where host is the user or sessionId is in invited list
        List<MeetingSession> allUserSessions;
        if (invitedSessionIds.isEmpty()) {
            allUserSessions = sessionRepository.findByCreatedById(user.getId());
        } else {
            allUserSessions = sessionRepository.findByCreatedByIdOrSessionIdIn(user.getId(), invitedSessionIds);
        }

        // 3. Categorize by status
        List<MeetingSession> activeList = allUserSessions.stream()
                .filter(s -> s.getStatus() == MeetingSession.SessionStatus.ACTIVE)
                .collect(java.util.stream.Collectors.toList());
        List<MeetingSession> upcomingList = allUserSessions.stream()
                .filter(s -> s.getStatus() == MeetingSession.SessionStatus.UPCOMING)
                .collect(java.util.stream.Collectors.toList());
        List<MeetingSession> endedList = allUserSessions.stream()
                .filter(s -> s.getStatus() == MeetingSession.SessionStatus.ENDED)
                .collect(java.util.stream.Collectors.toList());

        List<MeetingDto.DashboardSessionResponse> ongoing = activeList.stream()
                .map(s -> MeetingDto.DashboardSessionResponse.builder()
                        .sessionId(s.getSessionId())
                        .title(s.getTitle())
                        .hostName(s.getCreatedBy().getFullName())
                        .hostId(s.getCreatedBy().getId())
                        .status(s.getStatus().name())
                        .startedAt(formatDateTime(s.getStartedAt()))
                        .endedAt("")
                        .scheduledAt("")
                        .duration("")
                        .build())
                .collect(java.util.stream.Collectors.toList());

        List<MeetingDto.DashboardSessionResponse> upcoming = upcomingList.stream()
                .map(s -> MeetingDto.DashboardSessionResponse.builder()
                        .sessionId(s.getSessionId())
                        .title(s.getTitle())
                        .hostName(s.getCreatedBy().getFullName())
                        .hostId(s.getCreatedBy().getId())
                        .status(s.getStatus().name())
                        .startedAt("")
                        .endedAt("")
                        .scheduledAt(formatDateTime(s.getScheduledAt()))
                        .duration("")
                        .build())
                .collect(java.util.stream.Collectors.toList());

        List<MeetingDto.DashboardSessionResponse> history = endedList.stream()
                .map(s -> MeetingDto.DashboardSessionResponse.builder()
                        .sessionId(s.getSessionId())
                        .title(s.getTitle())
                        .hostName(s.getCreatedBy().getFullName())
                        .hostId(s.getCreatedBy().getId())
                        .status(s.getStatus().name())
                        .startedAt(formatDateTime(s.getStartedAt()))
                        .endedAt(formatDateTime(s.getEndedAt()))
                        .scheduledAt("")
                        .duration(calculateDuration(s.getStartedAt(), s.getEndedAt()))
                        .build())
                .collect(java.util.stream.Collectors.toList());

        return new MeetingDto.DashboardDataResponse(ongoing, upcoming, history);
    }

    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) return "";
        return dateTime.format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    private String calculateDuration(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) return "";
        java.time.Duration duration = java.time.Duration.between(start, end);
        long hours = duration.toHours();
        long minutes = duration.toMinutesPart();
        long seconds = duration.toSecondsPart();

        if (hours > 0) {
            return String.format("%dh %dm", hours, minutes);
        } else if (minutes > 0) {
            return String.format("%dm %ds", minutes, seconds);
        } else {
            return String.format("%ds", seconds);
        }
    }
}
