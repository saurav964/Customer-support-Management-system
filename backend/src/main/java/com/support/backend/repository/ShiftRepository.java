package com.support.backend.repository;

import com.support.backend.model.Shift;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
    List<Shift> findByAgentEmail(String agentEmail);
}
