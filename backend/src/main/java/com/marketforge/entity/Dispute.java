package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "disputes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Dispute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "raised_by_id", nullable = false)
    private User raisedBy;

    @Column(nullable = false)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private String status = "open"; // open, under_review, evidence_requested, resolved_refund, resolved_release, resolved_partial

    @Column(name = "stage", length = 32)
    @Builder.Default
    private String stage = "MUTUAL_NEGOTIATION"; // MUTUAL_NEGOTIATION, ARBITRATION_REVIEW, RESOLVED

    @Column(name = "claim_amount")
    private Long claimAmount; // cents

    @Column(name = "refund_amount")
    @Builder.Default
    private Long refundAmount = 0L;

    @Column(name = "release_amount")
    @Builder.Default
    private Long releaseAmount = 0L;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by_admin_id")
    private User resolvedByAdmin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_mediator_id")
    private User assignedMediator;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "dispute", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    @Builder.Default
    private List<DisputeMessage> messages = new ArrayList<>();

    @OneToMany(mappedBy = "dispute", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<DisputeAttachment> attachments = new ArrayList<>();

    @OneToMany(mappedBy = "dispute", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<DisputeSettlementOffer> settlementOffers = new ArrayList<>();

    @OneToOne(mappedBy = "dispute", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private DisputeResolution latestResolution;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "open";
        if (stage == null) stage = "MUTUAL_NEGOTIATION";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
