package com.support.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.support.backend.dto.DashboardStats;
import com.support.backend.model.AuditLog;
import com.support.backend.model.KnowledgeBase;
import com.support.backend.model.Reminder;
import com.support.backend.model.Ticket;
import com.support.backend.repository.AuditLogRepository;
import com.support.backend.repository.KnowledgeBaseRepository;
import com.support.backend.repository.ReminderRepository;
import com.support.backend.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.PrintWriter;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final TicketRepository ticketRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final com.support.backend.repository.UserRepository agentRepository;
    private final AuditLogRepository auditLogRepository;
    private final ReminderRepository reminderRepository;
    private final ClaudeAiService claudeAiService;
    private final EmailService emailService;
    private final SseEmitterService sseEmitterService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    // ─── Create ───────────────────────────────────────────────────────────────

    public Ticket createFromEmail(EmailService.EmailMessage email) {
        Ticket ticket = Ticket.builder()
                .subject(email.subject())
                .body(email.body())
                .fromEmail(email.from())
                .fromName(email.fromName())
                .build();

        ticket = ticketRepository.save(ticket);

        // Feature 1: Immediate acknowledgment so customer knows we received their request
        emailService.sendAcknowledgment(ticket.getFromEmail(), ticket.getFromName(), ticket.getId(), ticket.getSubject());

        enrichWithAi(ticket);
        return ticket;
    }

    private void enrichWithAi(Ticket ticket) {
        try {
            String aiJson = claudeAiService.categorizeTicket(ticket.getSubject(), ticket.getBody());
            JsonNode node = objectMapper.readTree(aiJson);
            ticket.setCategory(node.path("category").asText("General"));
            String priority = node.path("priority").asText("MEDIUM");
            ticket.setPriority(Ticket.Priority.valueOf(priority));

            String knowledgeContext = buildKnowledgeContext(ticket.getCategory());
            String aiResponse = claudeAiService.generateResponse(ticket.getSubject(), ticket.getBody(), knowledgeContext);
            ticket.setAiResponse(aiResponse);

            emailService.sendReply(ticket.getFromEmail(), ticket.getSubject(), aiResponse);
            ticket.setAiSent(true);
            ticket.setStatus(Ticket.TicketStatus.IN_PROGRESS);

            try {
                String sentiment = claudeAiService.analyzeSentiment(ticket.getBody());
                ticket.setSentiment(sentiment);
            } catch (Exception ignored) {}

            // Feature 5: Business-hours SLA — only counts Mon-Fri 9am-6pm
            int slaHours = switch (ticket.getPriority()) {
                case URGENT -> 1; case HIGH -> 4; case MEDIUM -> 8; default -> 24;
            };
            ticket.setSlaDeadline(addBusinessHours(LocalDateTime.now(), slaHours));

            if (ticket.getPriority() == Ticket.Priority.HIGH || ticket.getPriority() == Ticket.Priority.URGENT) {
                emailService.sendAgentNotification(ticket.getId(), ticket.getSubject(), ticket.getFromEmail(), priority);
            }
        } catch (Exception e) {
            log.error("AI enrichment failed for ticket {}: {}", ticket.getId(), e.getMessage());
        }
        Ticket saved = ticketRepository.save(ticket);

        // Feature 2: Audit log
        logAudit(saved.getId(), "TICKET_CREATED",
                "Ticket created from email. Priority: " + saved.getPriority() + ", Category: " + saved.getCategory(),
                "SYSTEM");
        sseEmitterService.broadcast("ticket-update", saved.getId().toString());
    }

    // ─── Read ────────────────────────────────────────────────────────────────

    public List<Ticket> getAll(String status, String category) {
        if (status != null && category != null)
            return ticketRepository.findByStatusAndCategory(Ticket.TicketStatus.valueOf(status.toUpperCase()), category);
        if (status != null)
            return ticketRepository.findByStatus(Ticket.TicketStatus.valueOf(status.toUpperCase()));
        if (category != null)
            return ticketRepository.findByCategory(category);
        return ticketRepository.findAll();
    }

    public Ticket getById(Long id) {
        return ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
    }

    // ─── Update ──────────────────────────────────────────────────────────────

    public Ticket updateStatus(Long id, String status, String performedBy) {
        Ticket ticket = getById(id);
        String oldStatus = ticket.getStatus().name();
        ticket.setStatus(Ticket.TicketStatus.valueOf(status.toUpperCase()));

        if (ticket.getStatus() == Ticket.TicketStatus.RESOLVED || ticket.getStatus() == Ticket.TicketStatus.CLOSED) {
            ticket.setResolvedAt(LocalDateTime.now());
        }

        // Feature 4: Send CSAT survey once when ticket is resolved
        if (ticket.getStatus() == Ticket.TicketStatus.RESOLVED && !Boolean.TRUE.equals(ticket.getCsatSent())) {
            emailService.sendCsatSurvey(ticket.getFromEmail(), ticket.getFromName(),
                    ticket.getId(), ticket.getSubject(), baseUrl);
            ticket.setCsatSent(true);
        }

        Ticket saved = ticketRepository.save(ticket);

        logAudit(saved.getId(), "STATUS_CHANGED",
                "Status changed from " + oldStatus + " to " + status.toUpperCase(), performedBy);
        sseEmitterService.broadcast("ticket-update", saved.getId().toString());
        return saved;
    }

    public Ticket assignTo(Long id, String agentEmail, String performedBy) {
        Ticket ticket = getById(id);
        String oldAssignee = ticket.getAssignedTo();
        ticket.setAssignedTo(agentEmail);
        ticket.setStatus(Ticket.TicketStatus.IN_PROGRESS);
        Ticket saved = ticketRepository.save(ticket);

        logAudit(saved.getId(), "ASSIGNED",
                "Assigned to " + agentEmail + (oldAssignee != null ? " (was: " + oldAssignee + ")" : ""), performedBy);
        sseEmitterService.broadcast("ticket-update", saved.getId().toString());
        return saved;
    }

    public Ticket replyToTicket(Long id, String replyMessage, String agentEmail) {
        Ticket ticket = getById(id);
        emailService.sendReply(ticket.getFromEmail(), ticket.getSubject(), replyMessage);
        ticket.setStatus(Ticket.TicketStatus.IN_PROGRESS);
        ticket.setAssignedTo(agentEmail);

        // Feature 3: Record first time an agent actually replies
        if (ticket.getFirstResponseAt() == null) {
            ticket.setFirstResponseAt(LocalDateTime.now());
        }

        Ticket saved = ticketRepository.save(ticket);
        logAudit(saved.getId(), "AGENT_REPLIED", "Manual reply sent by " + agentEmail, agentEmail);
        sseEmitterService.broadcast("ticket-update", saved.getId().toString());
        return saved;
    }

    public Ticket updateTags(Long id, String tags) {
        Ticket ticket = getById(id);
        ticket.setTags(tags);
        Ticket saved = ticketRepository.save(ticket);
        logAudit(saved.getId(), "TAGS_UPDATED", "Tags set to: " + tags, "AGENT");
        return saved;
    }

    // ─── Feature 9: Ticket Merging ────────────────────────────────────────────
    // Closes the secondary ticket and links it to the primary.
    // Customers with the duplicate ticket are no longer confused by two open threads.

    public Ticket mergeTickets(Long primaryId, Long secondaryId, String performedBy) {
        Ticket primary = getById(primaryId);
        Ticket secondary = getById(secondaryId);

        secondary.setStatus(Ticket.TicketStatus.CLOSED);
        secondary.setResolvedAt(LocalDateTime.now());
        secondary.setMergedIntoId(primaryId);
        ticketRepository.save(secondary);

        logAudit(secondaryId, "TICKET_MERGED", "Merged into ticket #" + primaryId, performedBy);
        logAudit(primaryId, "TICKET_MERGED", "Ticket #" + secondaryId + " was merged into this ticket", performedBy);

        sseEmitterService.broadcast("ticket-update", primaryId.toString());
        sseEmitterService.broadcast("ticket-update", secondaryId.toString());
        return primary;
    }

    // ─── Audit Log ───────────────────────────────────────────────────────────

    public List<AuditLog> getAuditLog(Long ticketId) {
        return auditLogRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
    }

    private void logAudit(Long ticketId, String action, String details, String performedBy) {
        try {
            auditLogRepository.save(AuditLog.builder()
                    .ticketId(ticketId)
                    .action(action)
                    .details(details)
                    .performedBy(performedBy != null ? performedBy : "SYSTEM")
                    .build());
        } catch (Exception e) {
            log.error("Audit log failed: {}", e.getMessage());
        }
    }

    // ─── Feature 5: Business Hours SLA ───────────────────────────────────────
    // Adds N business hours (Mon-Fri 9am-6pm) to a datetime.
    // A ticket created Friday 5pm with 4h SLA won't breach until Monday 10am.

    private LocalDateTime addBusinessHours(LocalDateTime from, int hoursToAdd) {
        LocalDateTime current = from;
        int added = 0;
        while (added < hoursToAdd) {
            current = current.plusHours(1);
            DayOfWeek day = current.getDayOfWeek();
            int hour = current.getHour();
            if (day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY && hour >= 9 && hour < 18) {
                added++;
            }
        }
        return current;
    }

    // ─── AI operations ───────────────────────────────────────────────────────

    public Ticket triggerAiResponse(Long id) {
        Ticket ticket = getById(id);
        try {
            String aiJson = claudeAiService.categorizeTicket(ticket.getSubject(), ticket.getBody());
            JsonNode node = objectMapper.readTree(aiJson);
            ticket.setCategory(node.path("category").asText(ticket.getCategory() != null ? ticket.getCategory() : "General"));
            String priority = node.path("priority").asText("MEDIUM");
            ticket.setPriority(Ticket.Priority.valueOf(priority));

            String knowledgeContext = buildKnowledgeContext(ticket.getCategory());
            String aiResponse = claudeAiService.generateResponse(ticket.getSubject(), ticket.getBody(), knowledgeContext);
            ticket.setAiResponse(aiResponse);

            emailService.sendReply(ticket.getFromEmail(), ticket.getSubject(), aiResponse);
            ticket.setAiSent(true);
            ticket.setStatus(Ticket.TicketStatus.IN_PROGRESS);
            log.info("AI response sent for ticket {}", id);
        } catch (Exception e) {
            log.error("AI response failed for ticket {}: {}", id, e.getMessage());
            throw new RuntimeException("AI response failed: " + e.getMessage(), e);
        }
        Ticket saved = ticketRepository.save(ticket);
        logAudit(saved.getId(), "AI_RESPONDED", "AI response generated and sent to customer", "SYSTEM");
        sseEmitterService.broadcast("ticket-update", saved.getId().toString());
        return saved;
    }

    public boolean processCustomerReply(EmailService.EmailMessage email) {
        String originalSubject = email.subject().replaceAll("(?i)^(re:\\s*)+", "").trim();
        List<Ticket> matches = ticketRepository.findByFromEmailAndSubjectIgnoreCaseAndStatusNot(
                email.from(), originalSubject, Ticket.TicketStatus.CLOSED);
        if (matches.isEmpty()) return false;

        String body = email.body() != null ? email.body() : "";
        boolean isResolved = claudeAiService.isCustomerSatisfied(body);
        log.info("Customer satisfaction for '{}': {}", body.substring(0, Math.min(body.length(), 50)), isResolved ? "SATISFIED" : "NOT SATISFIED");

        if (isResolved) {
            Ticket ticket = matches.get(0);
            ticket.setStatus(Ticket.TicketStatus.RESOLVED);
            ticket.setResolvedAt(LocalDateTime.now());

            // Send CSAT survey — customer said thank you but we still want a formal 1-5 star rating
            if (!Boolean.TRUE.equals(ticket.getCsatSent())) {
                emailService.sendCsatSurvey(ticket.getFromEmail(), ticket.getFromName(),
                        ticket.getId(), ticket.getSubject(), baseUrl);
                ticket.setCsatSent(true);
            }

            ticketRepository.save(ticket);
            logAudit(ticket.getId(), "STATUS_CHANGED", "Resolved via satisfied customer reply", "CUSTOMER");
            sseEmitterService.broadcast("ticket-update", ticket.getId().toString());
            log.info("Ticket {} resolved by customer reply", ticket.getId());
            return true;
        }
        return true;
    }

    public String suggestReply(Long id, String draft) {
        Ticket ticket = getById(id);
        return claudeAiService.suggestReply(draft, ticket.getBody());
    }

    // ─── Bulk ops ────────────────────────────────────────────────────────────

    public void bulkUpdateStatus(List<Long> ids, String status, String performedBy) {
        ids.forEach(id -> {
            try { updateStatus(id, status, performedBy); }
            catch (Exception e) { log.error("Bulk update failed for ticket {}: {}", id, e.getMessage()); }
        });
    }

    public void bulkDelete(List<Long> ids) {
        ids.forEach(id -> {
            try { ticketRepository.deleteById(id); }
            catch (Exception e) { log.error("Bulk delete failed for ticket {}: {}", id, e.getMessage()); }
        });
    }

    public void bulkAssign(List<Long> ids, String agentEmail) {
        ids.forEach(id -> {
            try { assignTo(id, agentEmail, "AGENT"); }
            catch (Exception e) { log.error("Bulk assign failed for ticket {}: {}", id, e.getMessage()); }
        });
    }

    public void deleteById(Long id) {
        ticketRepository.deleteById(id);
    }

    // ─── Scheduled tasks ─────────────────────────────────────────────────────

    public void autoMarkOverdue() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(2);
        List<Ticket> overdueTickets = ticketRepository.findOverdueTickets(Ticket.TicketStatus.OPEN, cutoff);
        log.info("Overdue check: found {} OPEN tickets older than 2h", overdueTickets.size());
        for (Ticket ticket : overdueTickets) {
            ticket.setOverdue(true);
            ticketRepository.save(ticket);
            logAudit(ticket.getId(), "OVERDUE_MARKED", "Ticket exceeded 2h without resolution", "SYSTEM");
            sseEmitterService.broadcast("ticket-update", ticket.getId().toString());
        }
    }

    public void autoCloseResolvedTickets() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);
        List<Ticket> toClose = ticketRepository.findByStatusAndResolvedAtBefore(Ticket.TicketStatus.RESOLVED, cutoff);
        for (Ticket ticket : toClose) {
            ticket.setStatus(Ticket.TicketStatus.CLOSED);
            ticketRepository.save(ticket);
            logAudit(ticket.getId(), "STATUS_CHANGED", "Auto-closed after 24h of being resolved", "SYSTEM");
            sseEmitterService.broadcast("ticket-update", ticket.getId().toString());
        }
    }

    public void autoAssignUrgentTickets() {
        List<Ticket> unassigned = ticketRepository.findAll().stream()
                .filter(t -> t.getPriority() == Ticket.Priority.URGENT
                        && t.getAssignedTo() == null
                        && (t.getStatus() == Ticket.TicketStatus.OPEN || t.getStatus() == Ticket.TicketStatus.IN_PROGRESS))
                .toList();
        if (unassigned.isEmpty()) return;
        List<com.support.backend.model.User> agents = agentRepository.findByRole(com.support.backend.model.User.Role.AGENT);
        if (agents.isEmpty()) return;
        for (int i = 0; i < unassigned.size(); i++) {
            Ticket ticket = unassigned.get(i);
            String agentEmail = agents.get(i % agents.size()).getEmail();
            ticket.setAssignedTo(agentEmail);
            ticket.setStatus(Ticket.TicketStatus.IN_PROGRESS);
            ticketRepository.save(ticket);
            logAudit(ticket.getId(), "ASSIGNED", "Auto-assigned URGENT ticket to " + agentEmail, "SYSTEM");
        }
    }

    public void escalateHighPriorityTickets() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(1);
        ticketRepository.findByStatus(Ticket.TicketStatus.OPEN).stream()
                .filter(t -> t.getPriority() == Ticket.Priority.HIGH
                        && t.getCreatedAt() != null && t.getCreatedAt().isBefore(cutoff))
                .forEach(t -> {
                    t.setPriority(Ticket.Priority.URGENT);
                    ticketRepository.save(t);
                    logAudit(t.getId(), "PRIORITY_CHANGED", "Escalated from HIGH to URGENT after 1h without response", "SYSTEM");
                    sseEmitterService.broadcast("ticket-update", t.getId().toString());
                });
    }

    // Feature 7: Process due reminders
    public void processReminders() {
        List<Reminder> due = reminderRepository.findBySentFalseAndRemindAtBefore(LocalDateTime.now());
        for (Reminder reminder : due) {
            try {
                ticketRepository.findById(reminder.getTicketId()).ifPresent(ticket ->
                        emailService.sendReminderEmail(
                                reminder.getAgentEmail(), reminder.getTicketId(),
                                ticket.getSubject(), reminder.getNote()));
                reminder.setSent(true);
                reminderRepository.save(reminder);
                log.info("Reminder sent for ticket #{}", reminder.getTicketId());
            } catch (Exception e) {
                log.error("Reminder processing failed: {}", e.getMessage());
            }
        }
    }

    // ─── Analytics & Stats ───────────────────────────────────────────────────

    public DashboardStats getDashboardStats() {
        Map<String, Long> byStatus = new HashMap<>();
        for (Object[] row : ticketRepository.countByStatus()) {
            byStatus.put(row[0].toString(), (Long) row[1]);
        }
        Map<String, Long> byCategory = new HashMap<>();
        for (Object[] row : ticketRepository.countByCategory()) {
            if (row[0] != null) byCategory.put(row[0].toString(), (Long) row[1]);
        }
        long aiResolved = ticketRepository.findAll().stream()
                .filter(t -> Boolean.TRUE.equals(t.getAiSent())).count();

        return DashboardStats.builder()
                .totalTickets(ticketRepository.count())
                .openTickets(byStatus.getOrDefault("OPEN", 0L))
                .resolvedTickets(byStatus.getOrDefault("RESOLVED", 0L))
                .closedTickets(byStatus.getOrDefault("CLOSED", 0L))
                .overdueTickets(ticketRepository.countByOverdueTrueAndStatus(Ticket.TicketStatus.OPEN))
                .aiResolvedTickets(aiResolved)
                .byStatus(byStatus)
                .byCategory(byCategory)
                .build();
    }

    public DashboardStats getAgentStats(String agentEmail) {
        List<Ticket> myTickets = ticketRepository.findByAssignedTo(agentEmail);
        long total = myTickets.size();
        long open = myTickets.stream().filter(t -> t.getStatus() == Ticket.TicketStatus.OPEN).count();
        long inProgress = myTickets.stream().filter(t -> t.getStatus() == Ticket.TicketStatus.IN_PROGRESS).count();
        long resolved = myTickets.stream().filter(t -> t.getStatus() == Ticket.TicketStatus.RESOLVED).count();
        long closed = myTickets.stream().filter(t -> t.getStatus() == Ticket.TicketStatus.CLOSED).count();
        long overdue = myTickets.stream().filter(t -> Boolean.TRUE.equals(t.getOverdue()) && t.getStatus() == Ticket.TicketStatus.OPEN).count();

        Map<String, Long> byStatus = new HashMap<>();
        byStatus.put("OPEN", open); byStatus.put("IN_PROGRESS", inProgress);
        byStatus.put("RESOLVED", resolved); byStatus.put("CLOSED", closed);

        Map<String, Long> byCategory = myTickets.stream()
                .filter(t -> t.getCategory() != null)
                .collect(Collectors.groupingBy(Ticket::getCategory, Collectors.counting()));

        return DashboardStats.builder()
                .totalTickets(total).openTickets(open).resolvedTickets(resolved)
                .closedTickets(closed).overdueTickets(overdue).aiResolvedTickets(inProgress)
                .byStatus(byStatus).byCategory(byCategory).build();
    }

    public Map<String, Object> getAnalytics() {
        List<Ticket> all = ticketRepository.findAll();

        Map<String, Long> perDay = new java.util.LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            java.time.LocalDate day = java.time.LocalDate.now().minusDays(i);
            long count = all.stream().filter(t -> t.getCreatedAt() != null && t.getCreatedAt().toLocalDate().equals(day)).count();
            perDay.put(day.toString(), count);
        }

        double avgResolutionMinutes = all.stream()
                .filter(t -> t.getResolvedAt() != null && t.getCreatedAt() != null)
                .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getResolvedAt()).toMinutes())
                .average().orElse(0);

        // Feature 3: First response time
        double avgFirstResponseMinutes = all.stream()
                .filter(t -> t.getFirstResponseAt() != null && t.getCreatedAt() != null)
                .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getFirstResponseAt()).toMinutes())
                .average().orElse(0);

        // Feature 4: CSAT score average
        OptionalDouble csatOpt = all.stream().filter(t -> t.getCsatScore() != null)
                .mapToInt(Ticket::getCsatScore).average();
        double avgCsat = csatOpt.isPresent() ? Math.round(csatOpt.getAsDouble() * 10.0) / 10.0 : 0;
        long csatCount = all.stream().filter(t -> t.getCsatScore() != null).count();

        long aiHandled = all.stream().filter(t -> Boolean.TRUE.equals(t.getAiSent())).count();
        long humanHandled = all.stream().filter(t -> t.getAssignedTo() != null && !Boolean.TRUE.equals(t.getAiSent())).count();

        Map<String, Long> byCategory = all.stream()
                .filter(t -> t.getCategory() != null)
                .collect(Collectors.groupingBy(Ticket::getCategory, Collectors.counting()));

        Map<String, Object> result = new HashMap<>();
        result.put("ticketsPerDay", perDay);
        result.put("avgResolutionHours", formatDuration(avgResolutionMinutes));
        result.put("avgFirstResponse", formatDuration(avgFirstResponseMinutes));
        result.put("avgCsatScore", avgCsat);
        result.put("csatCount", csatCount);
        result.put("aiHandled", aiHandled);
        result.put("humanHandled", humanHandled);
        result.put("byCategory", byCategory);
        result.put("totalResolved", all.stream().filter(t -> t.getStatus() == Ticket.TicketStatus.RESOLVED).count());
        result.put("totalClosed", all.stream().filter(t -> t.getStatus() == Ticket.TicketStatus.CLOSED).count());
        return result;
    }

    private String formatDuration(double minutes) {
        if (minutes == 0) return "N/A";
        if (minutes < 60) return Math.round(minutes) + " min";
        return Math.round(minutes / 60.0 * 10.0) / 10.0 + " hrs";
    }

    public Map<String, Object> getAgentPerformance() {
        List<Ticket> all = ticketRepository.findAll();
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        List<com.support.backend.model.User> agents = agentRepository.findByRole(com.support.backend.model.User.Role.AGENT);
        for (com.support.backend.model.User agent : agents) {
            long total = all.stream().filter(t -> agent.getEmail().equals(t.getAssignedTo())).count();
            long resolved = all.stream().filter(t -> agent.getEmail().equals(t.getAssignedTo())
                    && (t.getStatus() == Ticket.TicketStatus.RESOLVED || t.getStatus() == Ticket.TicketStatus.CLOSED)).count();
            result.put(agent.getName(), Map.of("total", total, "resolved", resolved, "email", agent.getEmail()));
        }
        return result;
    }

    public Map<String, Object> getSatisfactionScore() {
        List<Ticket> all = ticketRepository.findAll();
        long total = all.stream().filter(t -> Boolean.TRUE.equals(t.getAiSent())).count();
        long satisfied = all.stream().filter(t ->
                t.getStatus() == Ticket.TicketStatus.RESOLVED || t.getStatus() == Ticket.TicketStatus.CLOSED).count();
        double score = total > 0 ? Math.round((double) satisfied / total * 100.0) : 0;
        return Map.of("score", score, "satisfied", satisfied, "total", total);
    }

    // ─── Other ───────────────────────────────────────────────────────────────

    public List<Ticket> getByAgent(String agentEmail, String status, String category) {
        // Agent sees: their assigned tickets + all unassigned tickets
        List<Ticket> all = ticketRepository.findAll().stream()
                .filter(t -> agentEmail.equals(t.getAssignedTo()) || t.getAssignedTo() == null)
                .collect(Collectors.toList());

        if (status != null) {
            Ticket.TicketStatus s = Ticket.TicketStatus.valueOf(status.toUpperCase());
            all = all.stream().filter(t -> t.getStatus() == s).collect(Collectors.toList());
        }
        if (category != null) {
            all = all.stream().filter(t -> category.equals(t.getCategory())).collect(Collectors.toList());
        }
        return all;
    }

    public List<Ticket> getByCustomerEmail(String email) {
        return ticketRepository.findByFromEmailOrderByCreatedAtDesc(email);
    }

    public List<Ticket> findDuplicates(Long id) {
        Ticket ticket = getById(id);
        return ticketRepository.findAll().stream()
                .filter(t -> !t.getId().equals(id)
                        && t.getFromEmail().equals(ticket.getFromEmail())
                        && t.getStatus() != Ticket.TicketStatus.CLOSED
                        && t.getSubject() != null && ticket.getSubject() != null
                        && (t.getSubject().toLowerCase().contains(ticket.getSubject().toLowerCase().substring(0, Math.min(10, ticket.getSubject().length())))
                        || ticket.getSubject().toLowerCase().contains(t.getSubject().toLowerCase().substring(0, Math.min(10, t.getSubject().length())))))
                .toList();
    }

    public void analyzeSentiment(Ticket ticket) {
        try {
            ticket.setSentiment(claudeAiService.analyzeSentiment(ticket.getBody()));
            ticketRepository.save(ticket);
        } catch (Exception e) {
            log.error("Sentiment analysis failed: {}", e.getMessage());
        }
    }

    public void exportToCsv(PrintWriter writer) {
        writer.println("ID,Subject,From Email,From Name,Status,Category,Priority,AI Sent,Assigned To,CSAT,Created At,Resolved At,First Response At");
        ticketRepository.findAll().forEach(t -> writer.printf(
                "%d,\"%s\",\"%s\",\"%s\",%s,%s,%s,%s,\"%s\",%s,%s,%s,%s%n",
                t.getId(), escape(t.getSubject()), t.getFromEmail(),
                t.getFromName() != null ? t.getFromName() : "",
                t.getStatus(), t.getCategory() != null ? t.getCategory() : "",
                t.getPriority(), Boolean.TRUE.equals(t.getAiSent()) ? "Yes" : "No",
                t.getAssignedTo() != null ? t.getAssignedTo() : "",
                t.getCsatScore() != null ? t.getCsatScore() : "",
                t.getCreatedAt(), t.getResolvedAt() != null ? t.getResolvedAt() : "",
                t.getFirstResponseAt() != null ? t.getFirstResponseAt() : ""));
        writer.flush();
    }

    private String buildKnowledgeContext(String category) {
        List<KnowledgeBase> articles = knowledgeBaseRepository.findByCategory(category);
        if (articles.isEmpty()) articles = knowledgeBaseRepository.findAll();
        return articles.stream().map(a -> "## " + a.getTitle() + "\n" + a.getContent())
                .collect(Collectors.joining("\n\n"));
    }

    private String escape(String value) {
        return value != null ? value.replace("\"", "\"\"") : "";
    }
}
