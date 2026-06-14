package com.securemeet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class UserDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfileResponse {
        private Long id;
        private String email;
        private String fullName;
        private String phoneNumber;
        private String profilePicture;
        private String bio;
        private String role;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateProfileRequest {
        private String fullName;
        private String email;
        private String phoneNumber;
        private String profilePicture;
        private String bio;
    }
}
