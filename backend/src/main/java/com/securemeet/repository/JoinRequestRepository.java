package com.securemeet.repository;

import com.securemeet.entity.JoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface JoinRequestRepository extends JpaRepository<JoinRequest, Long> {
    List<JoinRequest> findBySessionIdAndStatus(String sessionId, JoinRequest.RequestStatus status);
    Optional<JoinRequest> findBySessionIdAndUserId(String sessionId, Long userId);
    Optional<JoinRequest> findBySessionIdAndUserIdAndStatus(String sessionId, Long userId, JoinRequest.RequestStatus status);
}
