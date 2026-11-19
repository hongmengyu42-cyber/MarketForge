package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "financial_ledger_entries",
        indexes = {
                @Index(name = "idx_ledger_transaction_group", columnList = "transaction_group_id"),
                @Index(name = "idx_ledger_order_created", columnList = "order_id, created_at")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FinancialLedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_group_id", nullable = false)
    private UUID transactionGroupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private FinancialLedgerAccount account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(name = "entry_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private EntryType entryType;

    @Column(nullable = false)
    private Long amount; // cents, strictly positive

    @Column(nullable = false, length = 255)
    private String description;

    @Column(columnDefinition = "JSON")
    private String metadata;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (transactionGroupId == null) {
            transactionGroupId = UUID.randomUUID();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum EntryType {
        DEBIT, CREDIT
    }
}
