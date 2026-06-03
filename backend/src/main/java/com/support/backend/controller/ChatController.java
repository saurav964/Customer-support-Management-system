package com.support.backend.controller;

import com.support.backend.service.EmailService;
import com.support.backend.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final TicketService ticketService;
    private final EmailService emailService;

    // Live chat widget — creates a ticket from chat form submission
    @PostMapping("/submit")
    public ResponseEntity<Map<String, String>> submit(@RequestBody Map<String, String> body) {
        String name    = body.getOrDefault("name", "Customer");
        String email   = body.getOrDefault("email", "unknown@email.com");
        String subject = body.getOrDefault("subject", "Chat message");
        String message = body.getOrDefault("message", "");

        // Create ticket from chat message
        EmailService.EmailMessage chatEmail = new EmailService.EmailMessage(email, name, subject, message);
        ticketService.createFromEmail(chatEmail);

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Your message has been received. Check your email for confirmation."));
    }
}
