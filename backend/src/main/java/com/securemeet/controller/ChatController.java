package com.securemeet.controller;

import com.securemeet.dto.ChatDto;
import com.securemeet.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/send")
    public ResponseEntity<ChatDto.MessageResponse> send(@RequestBody ChatDto.SendMessageRequest request) {
        return ResponseEntity.ok(chatService.sendMessage(request));
    }

    @GetMapping("/history/{sessionId}")
    public ResponseEntity<List<ChatDto.MessageResponse>> history(@PathVariable String sessionId) {
        return ResponseEntity.ok(chatService.getHistory(sessionId));
    }

    @PostMapping("/signal")
    public ResponseEntity<Void> signal(@RequestBody ChatDto.SignalEvent event) {
        chatService.broadcastSignal(event);
        return ResponseEntity.ok().build();
    }
}
