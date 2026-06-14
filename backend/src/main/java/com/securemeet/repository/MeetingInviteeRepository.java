package com.securemeet.repository;

import com.securemeet.entity.MeetingInvitee;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MeetingInviteeRepository extends JpaRepository<MeetingInvitee, Long> {
    List<MeetingInvitee> findByEmail(String email);
    List<MeetingInvitee> findBySessionId(String sessionId);
    boolean existsBySessionIdAndEmail(String sessionId, String email);
}
