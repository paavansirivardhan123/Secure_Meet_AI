package com.securemeet.controller;

import com.securemeet.dto.MeetingDto;
import com.securemeet.service.MeetingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;

    @PostMapping("/create")
    public ResponseEntity<MeetingDto.SessionResponse> createSession(
            @RequestBody MeetingDto.CreateSessionRequest request) throws Exception {
        return ResponseEntity.ok(meetingService.createSession(request));
    }

    @PostMapping("/join/{sessionId}")
    public ResponseEntity<MeetingDto.SessionResponse> joinSession(@PathVariable String sessionId) throws Exception {
        return ResponseEntity.ok(meetingService.joinSession(sessionId));
    }

    @PostMapping("/report")
    public ResponseEntity<Void> reportUser(@RequestBody MeetingDto.ReportRequest request) {
        meetingService.reportUser(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/end/{sessionId}")
    public ResponseEntity<Void> endSession(@PathVariable String sessionId) throws Exception {
        meetingService.endSession(sessionId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/dashboard")
    public ResponseEntity<com.securemeet.dto.MeetingDto.DashboardDataResponse> getDashboardData() {
        return ResponseEntity.ok(meetingService.getDashboardData());
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveSessions() {
        return ResponseEntity.ok(meetingService.getActiveSessions());
    }

    @GetMapping("/{sessionId}/requests")
    public ResponseEntity<java.util.List<com.securemeet.dto.MeetingDto.JoinRequestResponse>> getPendingRequests(@PathVariable String sessionId) {
        java.util.List<com.securemeet.dto.MeetingDto.JoinRequestResponse> dtos = meetingService.getPendingRequests(sessionId)
                .stream()
                .map(r -> new com.securemeet.dto.MeetingDto.JoinRequestResponse(
                        r.getId(),
                        r.getSessionId(),
                        r.getUser().getId(),
                        r.getUser().getFullName(),
                        r.getUser().getEmail(),
                        r.getStatus().name()
                ))
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/requests/{requestId}/approve")
    public ResponseEntity<Void> approveRequest(@PathVariable Long requestId) {
        meetingService.approveJoinRequest(requestId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/requests/{requestId}/reject")
    public ResponseEntity<Void> rejectRequest(@PathVariable Long requestId) {
        meetingService.rejectJoinRequest(requestId);
        return ResponseEntity.ok().build();
    }
}
