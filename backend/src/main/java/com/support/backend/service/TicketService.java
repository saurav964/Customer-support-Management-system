package com.support.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.support.backend.dto.DashboardStats;
import com.support.backend.model.KnowledgeBase;
import com.support.backend.model.Ticket;
import com.support.backend.repository.KnowledgeBaseRepository;
import com.support.backend.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final TicketRepository ticketRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final ClaudeAiService claudeAiService;
    private final EmailService emailService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Ticket createFromEmail(EmailService.EmailMessage email) {
        Ticket ticket = Ticket.builder()
                .subject(email.subject())
                .body(email.body())
                .fromEmail(email.from())
                .fromName(email.fromName())
                .build();

        ticket = ticketRepository.save(ticket);
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
            String aiResponse = claudeAiService.generateResponse(
                    ticket.getSubject(), ticket.getBody(), knowledgeContext);
            ticket.setAiResponse(aiResponse);

            emailService.sendReply(ticket.getFromEmail(), ticket.getSubject(), aiResponse);
            ticket.setAiSent(true);
            ticket.setStatus(Ticket.TicketStatus.IN_PROGRESS);
        } catch (Exception e) {
            log.error("AI enrichment failed for ticket {}: {}", ticket.getId(), e.getMessage());
        }
        ticketRepository.save(ticket);
    }

    private String buildKnowledgeContext(String category) {
        List<KnowledgeBase> articles = knowledgeBaseRepository.findByCategory(category);
        if (articles.isEmpty()) {
            articles = knowledgeBaseRepository.findAll();
        }
        return articles.stream()
                .map(a -> "## " + a.getTitle() + "\n" + a.getContent())
                .collect(Collectors.joining("\n\n"));
    }

    public List<Ticket> getAll(String status, String category) {
        if (status != null && category != null) {
            return ticketRepository.findByStatusAndCategory(
                    Ticket.TicketStatus.valueOf(status.toUpperCase()), category);
        }
        if (status != null) {
            return ticketRepository.findByStatus(Ticket.TicketStatus.valueOf(status.toUpperCase()));
        }
        if (category != null) {
            return ticketRepository.findByCategory(category);
        }
        return ticketRepository.findAll();
    }

    public Ticket getById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
    }

    public Ticket updateStatus(Long id, String status) {
        Ticket ticket = getById(id);
        ticket.setStatus(Ticket.TicketStatus.valueOf(status.toUpperCase()));
        if (ticket.getStatus() == Ticket.TicketStatus.RESOLVED) {
            ticket.setResolvedAt(LocalDateTime.now());
        }
        return ticketRepository.save(ticket);
    }

    public Ticket assignTo(Long id, String agentEmail) {
        Ticket ticket = getById(id);
        ticket.setAssignedTo(agentEmail);
        ticket.setStatus(Ticket.TicketStatus.IN_PROGRESS);
        return ticketRepository.save(ticket);
    }

    public Ticket triggerAiResponse(Long id) {
        Ticket ticket = getById(id);
        try {
            String aiJson = claudeAiService.categorizeTicket(ticket.getSubject(), ticket.getBody());
            JsonNode node = objectMapper.readTree(aiJson);
            ticket.setCategory(node.path("category").asText(ticket.getCategory() != null ? ticket.getCategory() : "General"));
            String priority = node.path("priority").asText("MEDIUM");
            ticket.setPriority(Ticket.Priority.valueOf(priority));

            String knowledgeContext = buildKnowledgeContext(ticket.getCategory());
            String aiResponse = claudeAiService.generateResponse(
                    ticket.getSubject(), ticket.getBody(), knowledgeContext);
            ticket.setAiResponse(aiResponse);

            emailService.sendReply(ticket.getFromEmail(), ticket.getSubject(), aiResponse);
            ticket.setAiSent(true);
            ticket.setStatus(Ticket.TicketStatus.IN_PROGRESS);
            log.info("AI response sent for ticket {}", id);
        } catch (Exception e) {
            log.error("AI response failed for ticket {}: {}", id, e.getMessage());
            throw new RuntimeException("AI response failed: " + e.getMessage(), e);
        }
        return ticketRepository.save(ticket);
    }

    public boolean processCustomerReply(EmailService.EmailMessage email) {
        String originalSubject = email.subject().replaceAll("(?i)^(re:\\s*)+", "").trim();
        List<Ticket> matches = ticketRepository.findByFromEmailAndSubjectIgnoreCaseAndStatusNot(
                email.from(), originalSubject, Ticket.TicketStatus.RESOLVED);
        if (matches.isEmpty()) return false;

        String body = email.body() != null ? email.body() : "";
        boolean isResolved = claudeAiService.isCustomerSatisfied(body);
        log.info("Customer satisfaction check for '{}': {}", body.substring(0, Math.min(body.length(), 50)), isResolved ? "SATISFIED" : "NOT SATISFIED");

        if (isResolved) {
            Ticket ticket = matches.get(0);
            ticket.setStatus(Ticket.TicketStatus.RESOLVED);
            ticket.setResolvedAt(LocalDateTime.now());
            ticketRepository.save(ticket);
            log.info("Ticket {} auto-resolved by customer reply", ticket.getId());
            return true;
        }
        log.info("Customer reply received but not satisfied — ticket stays IN_PROGRESS");
        return true;
    }

    public Ticket replyToTicket(Long id, String replyMessage, String agentEmail) {
        Ticket ticket = getById(id);
        emailService.sendReply(ticket.getFromEmail(), ticket.getSubject(), replyMessage);
        ticket.setStatus(Ticket.TicketStatus.IN_PROGRESS);
        ticket.setAssignedTo(agentEmail);
        return ticketRepository.save(ticket);
    }

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
                .aiResolvedTickets(aiResolved)
                .byStatus(byStatus)
                .byCategory(byCategory)
                .build();
    }
}
