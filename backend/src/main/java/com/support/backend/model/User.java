package com.support.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.AGENT;

    // Feature: Skills — comma-separated categories this agent handles
    // e.g. "Billing,Account" — used for smart auto-assignment
    @Column(name = "skills")
    private String skills;

    public enum Role {
        ADMIN, AGENT
    }
}
