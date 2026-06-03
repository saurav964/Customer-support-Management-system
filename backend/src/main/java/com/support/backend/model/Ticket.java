package com.support.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "from_email", nullable = false)
    private String fromEmail;

    @Column(name = "from_name")
    private String fromName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TicketStatus status = TicketStatus.OPEN;

    private String category;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Column(name = "ai_response", columnDefinition = "TEXT")
    private String aiResponse;

    @Column(name = "ai_sent")
    @Builder.Default
    private Boolean aiSent = false;

    @Column(name = "assigned_to")
    private String assignedTo;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Builder.Default
    private Boolean overdue = false;

    private String tags;

    private String sentiment;

    @Column(name = "sla_deadline")
    private LocalDateTime slaDeadline;

    @Column(name = "first_response_at")
    private LocalDateTime firstResponseAt;

    @Column(name = "csat_score")
    private Integer csatScore;

    @Column(name = "csat_sent")
    @Builder.Default
    private Boolean csatSent = false;

    @Column(name = "merged_into_id")
    private Long mergedIntoId;

    @Column(name = "follow_up_sent")
    @Builder.Default
    private Boolean followUpSent = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum TicketStatus {
        OPEN, IN_PROGRESS, RESOLVED, CLOSED
    }

    public enum Priority {
        LOW, MEDIUM, HIGH, URGENT
    }
}
