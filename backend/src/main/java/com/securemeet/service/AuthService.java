package com.securemeet.service;

import com.securemeet.dto.AuthDto;
import com.securemeet.entity.InviteToken;
import com.securemeet.entity.User;
import com.securemeet.repository.InviteTokenRepository;
import com.securemeet.repository.UserRepository;
import com.securemeet.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final InviteTokenRepository inviteTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();
        return new AuthDto.AuthResponse(token, user.getEmail(), user.getFullName(), user.getRole().name(), user.getPhoneNumber(), user.getProfilePicture(), user.getBio());
    }

    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request) {
        InviteToken invite = inviteTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Invalid invite token"));

        if (invite.isUsed()) throw new RuntimeException("Invite token already used");
        if (invite.isExpired()) throw new RuntimeException("Invite token expired");
        if (!invite.getEmail().equals(request.getEmail()))
            throw new RuntimeException("Email does not match invite");
        if (userRepository.existsByEmail(request.getEmail()))
            throw new RuntimeException("Email already registered");

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(User.Role.USER)
                .active(true)
                .build();
        userRepository.save(user);

        invite.setUsed(true);
        inviteTokenRepository.save(invite);

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);
        return new AuthDto.AuthResponse(token, user.getEmail(), user.getFullName(), user.getRole().name(), user.getPhoneNumber(), user.getProfilePicture(), user.getBio());
    }
}
