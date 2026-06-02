package com.support.backend.service;

import com.support.backend.config.JwtUtil;
import com.support.backend.dto.LoginRequest;
import com.support.backend.dto.LoginResponse;
import com.support.backend.model.User;
import com.support.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        log.info("Login attempt for: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null) {
            log.warn("User not found: {}", request.getEmail());
            throw new RuntimeException("Invalid email or password");
        }

        log.info("User found: {} | role: {}", user.getEmail(), user.getRole());

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Password mismatch for: {}", request.getEmail());
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getEmail());
        log.info("Login successful for: {}", user.getEmail());
        return new LoginResponse(token, user.getEmail(), user.getName(), user.getRole().name());
    }
}
