package com.securemeet.repository;

import com.securemeet.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findBySessionSessionIdOrderBySentAtAsc(String sessionId);
}
