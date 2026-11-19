package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "payout_requests",
        indexes = {
                @Index(name = "idx_payout_user_status", columnList = "user_id, status")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PayoutRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Long amount; // in cents

    @Column(name = "payout_method", nullable = false, length = 32)
    @Builder.Default
    private String payoutMethod = "STRIPE_CONNECT"; // STRIPE_CONNECT, BANK_TRANSFER, PAYPAL

    @Column(name = "destination_details")
    private String destinationDetails; // e.g. "Stripe Connect (acct_123456)", "Bank Wire ****4821"

    @Column(nullable = false, length = 32)
    @Builder.Default
    private String status = "COMPLETED"; // PENDING, PROCESSING, COMPLETED, REJECTED

    @Column(name = "transaction_reference")
    private String transactionReference;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (processedAt == null) {
            processedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
