package com.securemeet.dto;

import lombok.Data;
import java.time.LocalDateTime;

public class ChatDto {

    @Data
    public static class SendMessageRequest {
        private String sessionId;
        private String content;
    }

    @Data
    public static class MessageResponse {
        private Long id;
        private String senderName;
        private String senderEmail;
        private String content;
        private LocalDateTime sentAt;

        public MessageResponse(Long id, String senderName, String senderEmail,
                               String content, LocalDateTime sentAt) {
            this.id = id;
            this.senderName = senderName;
            this.senderEmail = senderEmail;
            this.content = content;
            this.sentAt = sentAt;
        }
    }

    @Data
    public static class SignalEvent {
        private String type;      // "raise_hand" | "lower_hand" | "reaction"
        private Long userId;
        private String userName;
        private String sessionId;
        private String payload;   // emoji or metadata
    }
}
