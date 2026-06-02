package com.support.backend.repository;

import com.support.backend.model.SavedFilter;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SavedFilterRepository extends JpaRepository<SavedFilter, Long> {
    List<SavedFilter> findByAgentEmail(String agentEmail);
}
