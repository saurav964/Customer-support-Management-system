package com.support.backend.controller;

import com.support.backend.dto.DashboardStats;
import com.support.backend.dto.TicketReplyRequest;
import com.support.backend.model.AuditLog;
import com.support.backend.model.Ticket;
import com.support.backend.model.User;
import com.support.backend.repository.UserRepository;
import com.support.backend.service.PresenceService;
import com.support.backend.service.TicketService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;
    private final UserRepository userRepository;
    private final PresenceService presenceService;

    @GetMapping("/tickets")
    public ResponseEntity<List<Ticket>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.AGENT)
            return ResponseEntity.ok(ticketService.getByAgent(auth.getName(), status, category));
        return ResponseEntity.ok(ticketService.getAll(status, category));
    }

    @GetMapping("/tickets/{id}")
    public ResponseEntity<Ticket> get(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getById(id));
    }

    @PatchMapping("/tickets/{id}/status")
    public ResponseEntity<Ticket> updateStatus(@PathVariable Long id,
                                                @RequestBody Map<String, String> body,
                                                Authentication auth) {
        return ResponseEntity.ok(ticketService.updateStatus(id, body.get("status"), auth.getName()));
    }

    @PatchMapping("/tickets/{id}/assign")
    public ResponseEntity<Ticket> assign(@PathVariable Long id,
                                          @RequestBody Map<String, String> body,
                                          Authentication auth) {
        return ResponseEntity.ok(ticketService.assignTo(id, body.get("agentEmail"), auth.getName()));
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

    // Feature 6: Role-based — only ADMIN can delete tickets
    @DeleteMapping("/tickets/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }
        ticketService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/tickets/{id}/tags")
    public ResponseEntity<Ticket> updateTags(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ticketService.updateTags(id, body.get("tags")));
    }

    @GetMapping("/tickets/{id}/duplicates")
    public ResponseEntity<List<Ticket>> duplicates(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.findDuplicates(id));
    }

    @PostMapping("/tickets/{id}/suggest-reply")
    public ResponseEntity<Map<String, String>> suggestReply(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(Map.of("suggestion", ticketService.suggestReply(id, body.get("draft"))));
    }

    // Feature 2: Audit log — every change to this ticket with who did it and when
    @GetMapping("/tickets/{id}/audit-log")
    public ResponseEntity<List<AuditLog>> auditLog(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getAuditLog(id));
    }

    // Feature 9: Merge — closes secondary ticket and links it to this one
    @PostMapping("/tickets/{id}/merge/{secondaryId}")
    public ResponseEntity<Ticket> merge(@PathVariable Long id,
                                         @PathVariable Long secondaryId,
                                         Authentication auth) {
        return ResponseEntity.ok(ticketService.mergeTickets(id, secondaryId, auth.getName()));
    }

    // Feature 10: Collision detection — register your presence while viewing a ticket
    @PostMapping("/tickets/{id}/presence")
    public ResponseEntity<Void> heartbeat(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        presenceService.heartbeat(id, auth.getName(), user.getName());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/tickets/{id}/presence")
    public ResponseEntity<List<Map<String, String>>> viewers(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(presenceService.getViewers(id, auth.getName()));
    }

    @PostMapping("/tickets/bulk-status")
    public ResponseEntity<Void> bulkStatus(@RequestBody Map<String, Object> body, Authentication auth) {
        List<Long> ids = ((List<?>) body.get("ids")).stream().map(i -> Long.valueOf(i.toString())).toList();
        ticketService.bulkUpdateStatus(ids, body.get("status").toString(), auth.getName());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/tickets/bulk-delete")
    public ResponseEntity<Void> bulkDelete(@RequestBody Map<String, Object> body, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }
        List<Long> ids = ((List<?>) body.get("ids")).stream().map(i -> Long.valueOf(i.toString())).toList();
        ticketService.bulkDelete(ids);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/tickets/bulk-assign")
    public ResponseEntity<Void> bulkAssign(@RequestBody Map<String, Object> body) {
        List<Long> ids = ((List<?>) body.get("ids")).stream().map(i -> Long.valueOf(i.toString())).toList();
        ticketService.bulkAssign(ids, body.get("agentEmail").toString());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/tickets/customer")
    public ResponseEntity<List<Ticket>> byCustomer(@RequestParam String email) {
        return ResponseEntity.ok(ticketService.getByCustomerEmail(email));
    }

    @GetMapping("/tickets/export")
    public void exportCsv(HttpServletResponse response) throws IOException {
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=tickets.csv");
        ticketService.exportToCsv(response.getWriter());
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> analytics() {
        return ResponseEntity.ok(ticketService.getAnalytics());
    }

    @GetMapping("/analytics/agents")
    public ResponseEntity<Map<String, Object>> agentPerformance() {
        return ResponseEntity.ok(ticketService.getAgentPerformance());
    }

    @GetMapping("/analytics/satisfaction")
    public ResponseEntity<Map<String, Object>> satisfaction() {
        return ResponseEntity.ok(ticketService.getSatisfactionScore());
    }

    @GetMapping("/analytics/heatmap")
    public ResponseEntity<Map<String, Object>> heatmap() {
        return ResponseEntity.ok(ticketService.getHeatmap());
    }

    @GetMapping("/analytics/sla-compliance")
    public ResponseEntity<Map<String, Object>> slaCompliance() {
        return ResponseEntity.ok(ticketService.getSlaCompliance());
    }

    // Feature 9: Agent corrects AI category
    @PatchMapping("/tickets/{id}/category")
    public ResponseEntity<Ticket> updateCategory(@PathVariable Long id,
                                                  @RequestBody Map<String, String> body,
                                                  Authentication auth) {
        return ResponseEntity.ok(ticketService.updateCategory(id, body.get("category"), auth.getName()));
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<DashboardStats> stats(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.AGENT)
            return ResponseEntity.ok(ticketService.getAgentStats(auth.getName()));
        return ResponseEntity.ok(ticketService.getDashboardStats());
    }
}
