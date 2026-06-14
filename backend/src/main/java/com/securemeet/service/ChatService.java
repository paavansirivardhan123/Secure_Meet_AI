package com.securemeet.service;

import com.securemeet.dto.ChatDto;
import com.securemeet.entity.ChatMessage;
import com.securemeet.entity.MeetingSession;
import com.securemeet.entity.User;
import com.securemeet.repository.ChatMessageRepository;
import com.securemeet.repository.MeetingSessionRepository;
import com.securemeet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final MeetingSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow();
    }

    public ChatDto.MessageResponse sendMessage(ChatDto.SendMessageRequest request) {
        User sender = currentUser();
        MeetingSession session = sessionRepository.findBySessionId(request.getSessionId())
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getStatus() == MeetingSession.SessionStatus.ENDED)
            throw new RuntimeException("Session has ended");

        if (request.getContent() == null || request.getContent().isBlank())
            throw new RuntimeException("Message cannot be empty");

        String sanitized = request.getContent().trim();
        if (sanitized.length() > 2000)
            sanitized = sanitized.substring(0, 2000);

        ChatMessage msg = ChatMessage.builder()
                .session(session)
                .sender(sender)
                .content(sanitized)
                .build();
        chatMessageRepository.save(msg);

        ChatDto.MessageResponse response = new ChatDto.MessageResponse(
                msg.getId(), sender.getFullName(), sender.getEmail(),
                msg.getContent(), msg.getSentAt()
        );

        // Broadcast to everyone in session
        messagingTemplate.convertAndSend(
                "/topic/session/" + request.getSessionId() + "/chat", response);

        return response;
    }

    public List<ChatDto.MessageResponse> getHistory(String sessionId) {
        return chatMessageRepository.findBySessionSessionIdOrderBySentAtAsc(sessionId)
                .stream()
                .map(m -> new ChatDto.MessageResponse(
                        m.getId(), m.getSender().getFullName(), m.getSender().getEmail(),
                        m.getContent(), m.getSentAt()))
                .collect(Collectors.toList());
    }

    public void broadcastSignal(ChatDto.SignalEvent event) {
        messagingTemplate.convertAndSend(
                "/topic/session/" + event.getSessionId() + "/signals", event);
    }
}
