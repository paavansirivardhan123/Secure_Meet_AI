package com.securemeet.repository;

import com.securemeet.entity.MeetingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MeetingSessionRepository extends JpaRepository<MeetingSession, Long> {
    Optional<MeetingSession> findBySessionId(String sessionId);
    List<MeetingSession> findByStatus(MeetingSession.SessionStatus status);
    List<MeetingSession> findByCreatedById(Long createdById);
    List<MeetingSession> findByCreatedByIdOrSessionIdIn(Long createdById, List<String> sessionIds);
}
