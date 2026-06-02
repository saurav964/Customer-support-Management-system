package com.support.backend.controller;

import com.support.backend.model.Comment;
import com.support.backend.model.User;
import com.support.backend.repository.CommentRepository;
import com.support.backend.repository.TicketRepository;
import com.support.backend.repository.UserRepository;
import com.support.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/tickets/{ticketId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final EmailService emailService;

    @GetMapping
    public ResponseEntity<List<Comment>> list(@PathVariable Long ticketId) {
        return ResponseEntity.ok(commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId));
    }

    @PostMapping
    public ResponseEntity<Comment> create(@PathVariable Long ticketId,
                                          @RequestBody Map<String, String> body,
                                          Authentication auth) {
        User author = userRepository.findByEmail(auth.getName()).orElseThrow();
        Comment comment = Comment.builder()
                .ticketId(ticketId)
                .agentName(author.getName())
                .agentEmail(author.getEmail())
                .message(body.get("message"))
                .build();
        Comment saved = commentRepository.save(comment);

        // Feature 6: Parse @mentions and notify the mentioned agent by email
        String message = body.get("message");
        if (message != null && message.contains("@")) {
            String ticketSubject = ticketRepository.findById(ticketId)
                    .map(t -> t.getSubject()).orElse("(unknown)");
            Pattern pattern = Pattern.compile("@([\\w.]+)");
            Matcher matcher = pattern.matcher(message);
            while (matcher.find()) {
                String mention = matcher.group(1).toLowerCase();
                userRepository.findAll().stream()
                        .filter(u -> !u.getEmail().equals(auth.getName())
                                && (u.getEmail().toLowerCase().startsWith(mention)
                                    || u.getName().toLowerCase().replace(" ", "").startsWith(mention)))
                        .findFirst()
                        .ifPresent(mentioned -> emailService.sendMentionNotification(
                                mentioned.getEmail(), mentioned.getName(),
                                ticketId, ticketSubject, author.getName()));
            }
        }

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long ticketId, @PathVariable Long id) {
        commentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
