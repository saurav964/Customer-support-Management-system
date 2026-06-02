package com.support.backend.controller;

import com.support.backend.model.User;
import com.support.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/agents")
@RequiredArgsConstructor
public class AgentController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAgents() {
        List<Map<String, Object>> agents = userRepository.findByRole(User.Role.AGENT)
                .stream()
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "email", u.getEmail(),
                        "name", u.getName()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(agents);
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> createAgent(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String name = body.get("name");
        String password = body.getOrDefault("password", "agent123");
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already exists"));
        }
        userRepository.save(User.builder()
                .email(email)
                .name(name)
                .password(passwordEncoder.encode(password))
                .role(User.Role.AGENT)
                .build());
        return ResponseEntity.ok(Map.of("message", "Agent created successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAgent(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
