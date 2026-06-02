package com.support.backend.controller;

import com.support.backend.dto.DashboardStats;
import com.support.backend.dto.TicketReplyRequest;
import com.support.backend.model.Ticket;
import com.support.backend.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @GetMapping("/tickets")
    public ResponseEntity<List<Ticket>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(ticketService.getAll(status, category));
    }

    @GetMapping("/tickets/{id}")
    public ResponseEntity<Ticket> get(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getById(id));
    }

    @PatchMapping("/tickets/{id}/status")
    public ResponseEntity<Ticket> updateStatus(@PathVariable Long id,
                                                @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ticketService.updateStatus(id, body.get("status")));
    }

    @PatchMapping("/tickets/{id}/assign")
    public ResponseEntity<Ticket> assign(@PathVariable Long id,
                                          @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ticketService.assignTo(id, body.get("agentEmail")));
    }

    @PostMapping("/tickets/{id}/ai-respond")
    public ResponseEntity<Ticket> aiRespond(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.triggerAiResponse(id));
    }

    @PostMapping("/tickets/{id}/reply")
    public ResponseEntity<Ticket> reply(@PathVariable Long id,
                                         @Valid @RequestBody TicketReplyRequest request,
                                         Authentication auth) {
        return ResponseEntity.ok(ticketService.replyToTicket(id, request.getMessage(), auth.getName()));
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<DashboardStats> stats() {
        return ResponseEntity.ok(ticketService.getDashboardStats());
    }
}
