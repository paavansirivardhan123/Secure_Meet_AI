package com.securemeet.controller;

import com.securemeet.dto.AuthDto;
import com.securemeet.entity.User;
import com.securemeet.repository.UserRepository;
import com.securemeet.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<AuthDto.AuthResponse> login(@RequestBody AuthDto.LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDto.AuthResponse> register(@RequestBody AuthDto.RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElseThrow();
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        response.put("role", user.getRole().name());
        response.put("phoneNumber", user.getPhoneNumber());
        response.put("profilePicture", user.getProfilePicture());
        response.put("bio", user.getBio());
        return ResponseEntity.ok(response);
    }
}
