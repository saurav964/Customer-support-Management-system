package com.support.backend.controller;

import com.support.backend.model.User;
import com.support.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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

    // Feature 6: Role check helper — only ADMIN can manage agents
    private boolean isNotAdmin(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .map(u -> u.getRole() != User.Role.ADMIN)
                .orElse(true);
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAgents() {
        List<Map<String, Object>> agents = userRepository.findByRole(User.Role.AGENT)
                .stream()
                .map(u -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id", u.getId());
                    m.put("email", u.getEmail());
                    m.put("name", u.getName());
                    m.put("skills", u.getSkills() != null ? u.getSkills() : "");
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(agents);
    }

    // Feature 2: Update agent skills for smart assignment
    @PatchMapping("/{id}/skills")
    public ResponseEntity<Map<String, String>> updateSkills(@PathVariable Long id,
                                                            @RequestBody Map<String, String> body) {
        User agent = userRepository.findById(id).orElseThrow();
        agent.setSkills(body.get("skills"));
        userRepository.save(agent);
        return ResponseEntity.ok(Map.of("message", "Skills updated"));
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> createAgent(@RequestBody Map<String, String> body, Authentication auth) {
        if (isNotAdmin(auth)) return ResponseEntity.status(403).body(Map.of("message", "Only admins can add agents"));
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
    public ResponseEntity<Void> deleteAgent(@PathVariable Long id, Authentication auth) {
        if (isNotAdmin(auth)) return ResponseEntity.status(403).build();
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
