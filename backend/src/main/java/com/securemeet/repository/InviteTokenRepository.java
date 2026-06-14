package com.securemeet.repository;

import com.securemeet.entity.InviteToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface InviteTokenRepository extends JpaRepository<InviteToken, Long> {
    Optional<InviteToken> findByToken(String token);
    Optional<InviteToken> findByEmailAndUsedFalse(String email);
}
