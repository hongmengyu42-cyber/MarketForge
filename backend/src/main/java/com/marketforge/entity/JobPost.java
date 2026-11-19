package com.marketforge.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "jobs",
        indexes = {
                @Index(name = "idx_job_status_created", columnList = "status, created_at"),
                @Index(name = "idx_job_client", columnList = "client_id"),
                @Index(name = "idx_job_slug", columnList = "slug")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "budget_type", nullable = false, length = 32)
    @Builder.Default
    private String budgetType = "FIXED_PRICE"; // FIXED_PRICE, HOURLY

    @Column(name = "budget_amount", nullable = false)
    private Long budgetAmount; // in cents (e.g. 50000 = $500.00, or hourly rate cents)

    @Column(name = "budget_max")
    private Long budgetMax; // in cents (optional upper bound)

    @Column(name = "experience_level", length = 32)
    @Builder.Default
    private String experienceLevel = "INTERMEDIATE"; // ENTRY, INTERMEDIATE, EXPERT

    @Column(length = 64)
    private String duration; // e.g. "Less than 1 month", "1 to 3 months", "3+ months"

    @Column(nullable = false, length = 32)
    @Builder.Default
    private String status = "OPEN"; // OPEN, IN_REVIEW, HIRED, CLOSED, CANCELLED

    @Column(columnDefinition = "TEXT")
    private String skills; // comma separated skills: "React, Spring Boot, TypeScript"

    @Column(name = "proposals_count")
    @Builder.Default
    private Integer proposalsCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hired_freelancer_id")
    private User hiredFreelancer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(name = "deadline_at")
    private LocalDateTime deadlineAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @JsonIgnore
    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<JobProposal> proposals = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
