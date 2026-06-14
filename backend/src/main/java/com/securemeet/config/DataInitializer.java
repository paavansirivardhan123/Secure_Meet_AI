package com.securemeet.config;

import com.securemeet.entity.User;
import com.securemeet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail("admin@securemeet.com")) {
            User admin = User.builder()
                    .email("admin@securemeet.com")
                    .password(passwordEncoder.encode("Admin@1234"))
                    .fullName("System Admin")
                    .role(User.Role.ADMIN)
                    .active(true)
                    .build();
            userRepository.save(admin);
            System.out.println("=== DEFAULT ADMIN CREATED ===");
            System.out.println("Email: admin@securemeet.com");
            System.out.println("Password: Admin@1234");
            System.out.println("=============================");
        }
    }
}
