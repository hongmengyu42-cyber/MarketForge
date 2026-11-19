package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "order_milestones")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderMilestone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "milestone_index")
    @Builder.Default
    private Integer milestoneIndex = 1;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "amount_total", nullable = false)
    private Long amountTotal; // cents

    @Column(name = "platform_fee_amount")
    @Builder.Default
    private Long platformFeeAmount = 0L;

    @Column(name = "seller_payout_amount")
    @Builder.Default
    private Long sellerPayoutAmount = 0L;

    @Column(nullable = false, length = 32)
    @Builder.Default
    private String status = "funded_in_escrow"; // funded_in_escrow, in_progress, delivered, approved

    @Column(name = "deliverable_notes", columnDefinition = "TEXT")
    private String deliverableNotes;

    @Column(name = "deliverable_url")
    private String deliverableUrl;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "revision_notes", columnDefinition = "TEXT")
    private String revisionNotes;

    @Column(name = "revision_requested_at")
    private LocalDateTime revisionRequestedAt;

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
