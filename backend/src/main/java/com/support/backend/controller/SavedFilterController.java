package com.support.backend.controller;

import com.support.backend.model.SavedFilter;
import com.support.backend.repository.SavedFilterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/saved-filters")
@RequiredArgsConstructor
public class SavedFilterController {

    private final SavedFilterRepository savedFilterRepository;

    @GetMapping
    public ResponseEntity<List<SavedFilter>> list(Authentication auth) {
        return ResponseEntity.ok(savedFilterRepository.findByAgentEmail(auth.getName()));
    }

    @PostMapping
    public ResponseEntity<SavedFilter> create(@RequestBody Map<String, String> body, Authentication auth) {
        SavedFilter filter = SavedFilter.builder()
                .agentEmail(auth.getName())
                .name(body.get("name"))
                .statusFilter(body.get("statusFilter"))
                .categoryFilter(body.get("categoryFilter"))
                .searchQuery(body.get("searchQuery"))
                .build();
        return ResponseEntity.ok(savedFilterRepository.save(filter));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        savedFilterRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
