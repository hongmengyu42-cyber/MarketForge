package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "dispute_resolutions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DisputeResolution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispute_id", nullable = false)
    private Dispute dispute;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private User admin;

    @Column(nullable = false, length = 32)
    private String verdict; // refund_buyer, payout_seller, split_50_50

    @Column(name = "ruling_notes", nullable = false, columnDefinition = "TEXT")
    private String rulingNotes;

    @Column(name = "buyer_refund_amount")
    @Builder.Default
    private Long buyerRefundAmount = 0L;

    @Column(name = "seller_payout_amount")
    @Builder.Default
    private Long sellerPayoutAmount = 0L;

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
