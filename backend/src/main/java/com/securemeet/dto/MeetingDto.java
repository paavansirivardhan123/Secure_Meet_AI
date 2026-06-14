package com.securemeet.dto;

import lombok.Data;

public class MeetingDto {

    @Data
    public static class CreateSessionRequest {
        private String title;
        private String scheduledAt;
        private java.util.List<String> invitees;
    }

    @Data
    public static class SessionResponse {
        private String sessionId;
        private String title;
        private String token;       // OpenVidu connection token
        private String status;
        private Long hostId;

        public SessionResponse(String sessionId, String title, String token, String status, Long hostId) {
            this.sessionId = sessionId;
            this.title = title;
            this.token = token;
            this.status = status;
            this.hostId = hostId;
        }
    }

    @Data
    public static class JoinRequest {
        private String sessionId;
    }

    @Data
    public static class ReportRequest {
        private String sessionId;
        private Long reportedUserId;
        private String reason;
    }

    @Data
    public static class ReportNotification {
        private Long reportId;
        private String reportedUserName;
        private String reportedByName;
        private String sessionId;
        private String reason;

        public ReportNotification(Long reportId, String reportedUserName, String reportedByName,
                                  String sessionId, String reason) {
            this.reportId = reportId;
            this.reportedUserName = reportedUserName;
            this.reportedByName = reportedByName;
            this.sessionId = sessionId;
            this.reason = reason;
        }
    }

    @Data
    public static class KickNotification {
        private Long userId;
        private String sessionId;
        private String reason;

        public KickNotification(Long userId, String sessionId, String reason) {
            this.userId = userId;
            this.sessionId = sessionId;
            this.reason = reason;
        }
    }

    @Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class JoinRequestResponse {
        private Long requestId;
        private String sessionId;
        private Long userId;
        private String fullName;
        private String email;
        private String status;
    }

    @Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class DashboardSessionResponse {
        private String sessionId;
        private String title;
        private String hostName;
        private Long hostId;
        private String status;
        private String startedAt;
        private String endedAt;
        private String scheduledAt;
        private String duration;
    }

    @Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class DashboardDataResponse {
        private java.util.List<DashboardSessionResponse> ongoing;
        private java.util.List<DashboardSessionResponse> upcoming;
        private java.util.List<DashboardSessionResponse> history;
    }

    @Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class NotificationMessage {
        private String type;
        private String title;
        private String sessionId;
        private String hostName;
        private String scheduledAt;
    }
}
