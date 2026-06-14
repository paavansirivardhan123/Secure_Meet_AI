package com.securemeet.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "meeting_invitees")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MeetingInvitee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private String email;
}
