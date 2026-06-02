package com.support.backend.config;

import com.support.backend.model.User;
import com.support.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        createUserIfNotExists("admin@support.com", "admin123", "Admin User", User.Role.ADMIN);
        createUserIfNotExists("ravi@support.com",  "admin123", "Ravi Sharma",  User.Role.AGENT);
        createUserIfNotExists("priya@support.com", "admin123", "Priya Mehta",  User.Role.AGENT);
        createUserIfNotExists("arjun@support.com", "admin123", "Arjun Kapoor", User.Role.AGENT);
    }

    private void createUserIfNotExists(String email, String password, String name, User.Role role) {
        if (userRepository.findByEmail(email).isEmpty()) {
            userRepository.save(User.builder()
                    .email(email)
                    .password(passwordEncoder.encode(password))
                    .name(name)
                    .role(role)
                    .build());
            log.info("Created user: {}", email);
        }
    }
}
