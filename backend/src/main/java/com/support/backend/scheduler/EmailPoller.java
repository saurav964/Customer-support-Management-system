package com.support.backend.scheduler;

import com.support.backend.service.EmailService;
import com.support.backend.service.TicketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailPoller {

    private final EmailService emailService;
    private final TicketService ticketService;

    @Value("${spring.mail.username}")
    private String supportEmail;

    // Feature: Auto follow-up — runs every hour, emails customers with 48h+ unresolved tickets
    @Scheduled(fixedDelay = 3600000)
    public void autoFollowUps() {
        ticketService.autoSendFollowUps();
    }

    // Feature 2: SLA breach alert — check every 5 minutes
    @Scheduled(fixedDelay = 300000)
    public void checkSlaBreaches() {
        ticketService.checkSlaBreaches();
    }

    // Feature 3: Daily performance report — every 24 hours
    @Scheduled(fixedDelay = 86400000, initialDelay = 10000)
    public void dailyPerformanceReport() {
        ticketService.sendDailyPerformanceReport();
    }

    // Feature 7: Check every minute for reminders that are due and email the agent
    @Scheduled(fixedDelay = 60000)
    public void processReminders() {
        ticketService.processReminders();
    }

    @Scheduled(fixedDelay = 3600000)
    public void autoCloseTickets() {
        log.info("Checking for resolved tickets to auto-close...");
        ticketService.autoCloseResolvedTickets();
    }

    @Scheduled(initialDelay = 5000, fixedDelay = 300000)
    public void autoMarkOverdue() {
        ticketService.autoMarkOverdue();
    }

    @Scheduled(fixedDelay = 600000) // every 10 minutes
    public void autoAssignAndEscalate() {
        ticketService.autoAssignUrgentTickets();
        ticketService.escalateHighPriorityTickets();
    }

    // Feature 2: Smart skill-based assignment — every 3 minutes
    @Scheduled(fixedDelay = 180000)
    public void autoAssignBySkill() {
        ticketService.autoAssignBySkill();
    }

    @Scheduled(fixedDelayString = "${mail.poll.interval-ms:60000}")
    public void pollEmails() {
        log.info("Polling inbox for new emails...");
        List<EmailService.EmailMessage> emails = emailService.fetchUnreadEmails();
        int newTickets = 0;
        int resolvedTickets = 0;
        for (EmailService.EmailMessage email : emails) {
            String subject = email.subject() != null ? email.subject() : "";
            String from = email.from() != null ? email.from().toLowerCase() : "";

            if (from.startsWith("no-reply") || from.startsWith("noreply")
                    || from.contains("accounts.google.com")
                    || from.equals(supportEmail.toLowerCase())
                    || subject.startsWith("[URGENT]") || subject.startsWith("[HIGH]")
                    || subject.startsWith("[MEDIUM]") || subject.startsWith("[LOW]")) {
                log.info("Skipping automated/internal email from: {}", email.from());
                continue;
            }

            if (subject.toLowerCase().startsWith("re:")) {
                boolean handled = ticketService.processCustomerReply(email);
                if (handled) {
                    log.info("Customer reply handled for: {}", email.from());
                    resolvedTickets++;
                } else {
                    log.info("No matching ticket found for reply, skipping: {}", subject);
                }
            } else {
                log.info("Creating ticket from: {} | Subject: {}", email.from(), subject);
                ticketService.createFromEmail(email);
                newTickets++;
            }
        }
        if (!emails.isEmpty()) {
            log.info("Processed {} email(s): {} new tickets, {} auto-resolved", emails.size(), newTickets, resolvedTickets);
        }
    }
}
