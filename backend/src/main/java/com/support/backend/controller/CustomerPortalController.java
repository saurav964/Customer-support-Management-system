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
