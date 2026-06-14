package com.securemeet.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "meeting_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MeetingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String sessionId;       // OpenVidu session ID

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Enumerated(EnumType.STRING)
    private SessionStatus status;

    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime scheduledAt;

    @PrePersist
    public void prePersist() {
        if (this.scheduledAt == null) {
            this.startedAt = LocalDateTime.now();
            this.status = SessionStatus.ACTIVE;
        } else {
            this.status = SessionStatus.UPCOMING;
        }
    }

    public enum SessionStatus {
        ACTIVE, ENDED, UPCOMING
    }
}
