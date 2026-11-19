package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "orders",
        indexes = {
                @Index(name = "idx_order_status_release", columnList = "status, auto_release_at"),
                @Index(name = "idx_order_buyer_status", columnList = "buyer_id, status"),
                @Index(name = "idx_order_seller_status", columnList = "seller_id, status")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", nullable = false, unique = true)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id")
    private Listing listing;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING_PAYMENT;

    // Money (cents)
    @Column(name = "amount_total", nullable = false)
    private Long amountTotal;

    @Column(name = "platform_fee_amount", nullable = false)
    private Long platformFeeAmount;

    @Column(name = "seller_payout_amount", nullable = false)
    private Long sellerPayoutAmount;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "usd";

    // Stripe references
    @Column(name = "stripe_payment_intent_id", unique = true)
    private String stripePaymentIntentId;

    @Column(name = "stripe_transfer_id", unique = true)
    private String stripeTransferId;

    @Column(name = "stripe_charge_id")
    private String stripeChargeId;

    // Timeline
    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "auto_release_at")
    private LocalDateTime autoReleaseAt;

    @Column(name = "released_at")
    private LocalDateTime releasedAt;

    @Column(name = "paid_out_at")
    private LocalDateTime paidOutAt;

    @Column(name = "dispute_deadline_at")
    private LocalDateTime disputeDeadlineAt;

    @Column(name = "expected_delivery_at")
    private LocalDateTime expectedDeliveryAt;

    @Column(name = "requirements", columnDefinition = "TEXT")
    private String requirements;

    @Column(name = "requirements_submitted_at")
    private LocalDateTime requirementsSubmittedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationships
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OrderDelivery> deliveries;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OrderMilestone> milestones;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OrderStatusTransition> statusTransitions;

    @OneToOne(mappedBy = "order", fetch = FetchType.LAZY)
    private Dispute dispute;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Review> reviews;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum OrderStatus {
        PENDING_PAYMENT, AUTHORIZED, IN_PROGRESS, DELIVERED, REVISION_REQUESTED,
        CONFIRMED, DISPUTED, RELEASED, PAID_OUT, REFUNDED, CANCELLED, FAILED
    }
}
