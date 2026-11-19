package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "work_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private HourlyContract contract;

    @Column(name = "hours_logged", nullable = false)
    private Double hoursLogged;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "amount_billed")
    private Long amountBilled; // cents

    @Column(nullable = false)
    @Builder.Default
    private String status = "pending"; // pending, approved, rejected

    @Column(name = "worked_at")
    private LocalDateTime workedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

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
