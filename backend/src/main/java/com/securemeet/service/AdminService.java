package com.securemeet.service;

import com.securemeet.entity.InviteToken;
import com.securemeet.entity.User;
import com.securemeet.repository.InviteTokenRepository;
import com.securemeet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final InviteTokenRepository inviteTokenRepository;
    private final EmailService emailService;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow();
    }

    public InviteToken createInvite(String email) {
        InviteToken token = InviteToken.builder()
                .token(UUID.randomUUID().toString())
                .email(email)
                .used(false)
                .createdBy(currentUser())
                .build();
        return inviteTokenRepository.save(token);
    }

    public InviteToken createInviteAndEmail(String email) {
        InviteToken token = createInvite(email);
        emailService.sendInviteEmail(token);
        return token;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public void deactivateUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(false);
        userRepository.save(user);
    }

    public void activateUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(true);
        userRepository.save(user);
    }
}
