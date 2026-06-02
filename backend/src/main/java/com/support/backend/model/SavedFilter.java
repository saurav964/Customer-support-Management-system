package com.support.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_filters")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedFilter {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_email")
    private String agentEmail;

    private String name;

    @Column(name = "status_filter")
    private String statusFilter;

    @Column(name = "category_filter")
    private String categoryFilter;

    @Column(name = "search_query")
    private String searchQuery;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
