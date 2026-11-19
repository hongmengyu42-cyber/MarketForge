package com.marketforge.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "job_proposals",
        indexes = {
                @Index(name = "idx_proposal_job_freelancer", columnList = "job_id, freelancer_id", unique = true),
                @Index(name = "idx_proposal_status", columnList = "status")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private JobPost job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "freelancer_id", nullable = false)
    private User freelancer;

    @Column(name = "bid_amount", nullable = false)
    private Long bidAmount; // cents

    @Column(name = "delivery_days", nullable = false)
    @Builder.Default
    private Integer deliveryDays = 7;

    @Column(name = "cover_letter", columnDefinition = "TEXT", nullable = false)
    private String coverLetter;

    @Column(columnDefinition = "TEXT")
    private String attachments; // JSON or URLs

    @Column(nullable = false, length = 32)
    @Builder.Default
    private String status = "SUBMITTED"; // SUBMITTED, SHORTLISTED, INTERVIEWING, ACCEPTED, DECLINED

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
