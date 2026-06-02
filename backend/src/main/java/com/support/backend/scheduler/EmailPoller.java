package com.support.backend.scheduler;

import com.support.backend.service.EmailService;
import com.support.backend.service.TicketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailPoller {

    private final EmailService emailService;
    private final TicketService ticketService;

    @Scheduled(fixedDelayString = "${mail.poll.interval-ms:60000}")
    public void pollEmails() {
        log.info("Polling inbox for new emails...");
        List<EmailService.EmailMessage> emails = emailService.fetchUnreadEmails();
        int newTickets = 0;
        int resolvedTickets = 0;
        for (EmailService.EmailMessage email : emails) {
            String subject = email.subject() != null ? email.subject() : "";
            String from = email.from() != null ? email.from().toLowerCase() : "";

            if (from.startsWith("no-reply") || from.startsWith("noreply") || from.contains("accounts.google.com")) {
                log.info("Skipping automated/no-reply email from: {}", email.from());
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
