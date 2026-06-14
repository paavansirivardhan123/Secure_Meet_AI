package com.securemeet.controller;

import com.securemeet.dto.UserDto;
import com.securemeet.entity.User;
import com.securemeet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/profile")
    public ResponseEntity<UserDto.ProfileResponse> getProfile() {
        User user = currentUser();
        return ResponseEntity.ok(convertToDto(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDto.ProfileResponse> updateProfile(@RequestBody UserDto.UpdateProfileRequest request) {
        User user = currentUser();

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim();
            if (!newEmail.equals(user.getEmail())) {
                throw new RuntimeException("Email changing is disabled. Contact admin to request a change.");
            }
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber().trim());
        }
        if (request.getProfilePicture() != null) {
            user.setProfilePicture(request.getProfilePicture());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }

        userRepository.save(user);
        return ResponseEntity.ok(convertToDto(user));
    }

    private UserDto.ProfileResponse convertToDto(User user) {
        return UserDto.ProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .profilePicture(user.getProfilePicture())
                .bio(user.getBio())
                .role(user.getRole().name())
                .build();
    }
}
