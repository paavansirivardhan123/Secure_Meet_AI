package com.securemeet.dto;

import lombok.Data;

public class AuthDto {

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Data
    public static class RegisterRequest {
        private String token;   // invite token
        private String email;
        private String password;
        private String fullName;
    }

    @Data
    public static class AuthResponse {
        private String accessToken;
        private String email;
        private String fullName;
        private String role;
        private String phoneNumber;
        private String profilePicture;
        private String bio;

        public AuthResponse(String accessToken, String email, String fullName, String role, String phoneNumber, String profilePicture, String bio) {
            this.accessToken = accessToken;
            this.email = email;
            this.fullName = fullName;
            this.role = role;
            this.phoneNumber = phoneNumber;
            this.profilePicture = profilePicture;
            this.bio = bio;
        }
    }
}
