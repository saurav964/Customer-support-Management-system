package com.support.backend.controller;

import com.support.backend.model.KnowledgeBase;
import com.support.backend.service.KnowledgeBaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/knowledge")
@RequiredArgsConstructor
public class KnowledgeBaseController {

    private final KnowledgeBaseService service;

    @GetMapping
    public ResponseEntity<List<KnowledgeBase>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<KnowledgeBase> create(@RequestBody KnowledgeBase article) {
        return ResponseEntity.ok(service.create(article));
    }

    @PutMapping("/{id}")
    public ResponseEntity<KnowledgeBase> update(@PathVariable Long id,
                                                  @RequestBody KnowledgeBase article) {
        return ResponseEntity.ok(service.update(id, article));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
