package com.support.backend.controller;

import com.support.backend.model.Reminder;
import com.support.backend.repository.ReminderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ReminderController {

    private final ReminderRepository reminderRepository;

    @GetMapping("/api/tickets/{ticketId}/reminders")
    public ResponseEntity<List<Reminder>> list(@PathVariable Long ticketId, Authentication auth) {
        return ResponseEntity.ok(reminderRepository.findByTicketId(ticketId).stream()
                .filter(r -> r.getAgentEmail().equals(auth.getName()))
                .toList());
    }

    @PostMapping("/api/tickets/{ticketId}/reminders")
    public ResponseEntity<Reminder> create(@PathVariable Long ticketId,
                                            @RequestBody Map<String, String> body,
                                            Authentication auth) {
        Reminder reminder = Reminder.builder()
                .ticketId(ticketId)
                .agentEmail(auth.getName())
                .note(body.get("note"))
                .remindAt(LocalDateTime.parse(body.get("remindAt")))
                .build();
        return ResponseEntity.ok(reminderRepository.save(reminder));
    }

    @DeleteMapping("/api/reminders/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        reminderRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
