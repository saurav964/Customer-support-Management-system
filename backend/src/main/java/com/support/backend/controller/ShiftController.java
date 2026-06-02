package com.support.backend.controller;

import com.support.backend.model.Shift;
import com.support.backend.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shifts")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftRepository shiftRepository;

    @GetMapping
    public ResponseEntity<List<Shift>> list() {
        return ResponseEntity.ok(shiftRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Shift> create(@RequestBody Shift shift) {
        return ResponseEntity.ok(shiftRepository.save(shift));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        shiftRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
