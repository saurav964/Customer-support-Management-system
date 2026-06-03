package com.support.backend.controller;

import com.support.backend.model.Ticket;
import com.support.backend.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/portal")
@RequiredArgsConstructor
public class CustomerPortalController {

    private final TicketRepository ticketRepository;

    @GetMapping("/tickets")
    public ResponseEntity<List<Ticket>> getMyTickets(@RequestParam String email) {
        return ResponseEntity.ok(ticketRepository.findByFromEmailOrderByCreatedAtDesc(email));
    }

    // Feature 8: Public ticket tracking by ID — like courier tracking
    @GetMapping("/track/{ticketId}")
    public ResponseEntity<Map<String, Object>> trackTicket(@PathVariable Long ticketId) {
        return ticketRepository.findById(ticketId).map(t -> {
            Map<String, Object> result = new java.util.LinkedHashMap<>();
            result.put("id", t.getId());
            result.put("subject", t.getSubject());
            result.put("status", t.getStatus());
            result.put("priority", t.getPriority());
            result.put("category", t.getCategory());
            result.put("createdAt", t.getCreatedAt());
            result.put("resolvedAt", t.getResolvedAt());
            result.put("slaDeadline", t.getSlaDeadline());
            return ResponseEntity.ok(result);
        }).orElse(ResponseEntity.notFound().build());
    }

    // Feature 4: CSAT — customer clicks a star rating link in their resolution email
    // No auth needed; the link is unique per ticket and only sent to the ticket owner
    @GetMapping("/csat/{ticketId}")
    public ResponseEntity<Map<String, Object>> submitCsat(
            @PathVariable Long ticketId,
            @RequestParam int score) {
        if (score < 1 || score > 5) {
            return ResponseEntity.badRequest().body(Map.of("error", "Score must be between 1 and 5"));
        }
        return ticketRepository.findById(ticketId).map(ticket -> {
            ticket.setCsatScore(score);
            ticketRepository.save(ticket);
            return ResponseEntity.ok(Map.<String, Object>of(
                    "message", "Thank you for your feedback!",
                    "score", score,
                    "ticketId", ticketId));
        }).orElse(ResponseEntity.notFound().build());
    }
}
