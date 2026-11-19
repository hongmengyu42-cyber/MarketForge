package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews",
        uniqueConstraints = @UniqueConstraint(columnNames = {"order_id", "reviewer_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id")
    private Listing listing;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id")
    private User targetUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id")
    private User seller;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_type", length = 32)
    @Builder.Default
    private ReviewType reviewType = ReviewType.BUYER_TO_SELLER;

    @Column(nullable = false)
    private Integer rating; // Overall 1-5

    // Sub-ratings for Buyer reviewing Seller
    @Column(name = "quality_rating")
    private Integer qualityRating; // 1-5

    @Column(name = "communication_rating")
    private Integer communicationRating; // 1-5

    @Column(name = "deadline_rating")
    private Integer deadlineRating; // 1-5

    // Sub-ratings for Seller reviewing Buyer
    @Column(name = "clarity_rating")
    private Integer clarityRating; // 1-5

    @Column(name = "cooperation_rating")
    private Integer cooperationRating; // 1-5

    @Column(name = "would_recommend")
    @Builder.Default
    private Boolean wouldRecommend = true;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "seller_response", columnDefinition = "TEXT")
    private String sellerResponse;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    // Double-blind fields
    @Column(name = "is_revealed")
    @Builder.Default
    private Boolean isRevealed = false;

    @Column(name = "auto_reveal_at")
    private LocalDateTime autoRevealAt;

    @Column(name = "revealed_at")
    private LocalDateTime revealedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isRevealed == null) {
            isRevealed = false;
        }
        if (wouldRecommend == null) {
            wouldRecommend = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
