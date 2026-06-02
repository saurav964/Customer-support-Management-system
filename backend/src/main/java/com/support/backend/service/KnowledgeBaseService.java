package com.support.backend.service;

import com.support.backend.model.KnowledgeBase;
import com.support.backend.repository.KnowledgeBaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class KnowledgeBaseService {

    private final KnowledgeBaseRepository repository;

    public List<KnowledgeBase> getAll() {
        return repository.findAll();
    }

    public KnowledgeBase create(KnowledgeBase article) {
        return repository.save(article);
    }

    public KnowledgeBase update(Long id, KnowledgeBase updated) {
        KnowledgeBase existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Article not found: " + id));
        existing.setTitle(updated.getTitle());
        existing.setContent(updated.getContent());
        existing.setCategory(updated.getCategory());
        return repository.save(existing);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
