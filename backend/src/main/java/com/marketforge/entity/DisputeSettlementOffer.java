package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "dispute_settlement_offers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DisputeSettlementOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispute_id", nullable = false)
    private Dispute dispute;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposed_by_id", nullable = false)
    private User proposedBy;

    @Column(name = "refund_amount", nullable = false)
    private Long refundAmount; // cents to buyer

    @Column(name = "release_amount", nullable = false)
    private Long releaseAmount; // cents to seller

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false, length = 32)
    @Builder.Default
    private String status = "PENDING"; // PENDING, ACCEPTED, REJECTED, EXPIRED

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = "PENDING";
        }
    }
}
