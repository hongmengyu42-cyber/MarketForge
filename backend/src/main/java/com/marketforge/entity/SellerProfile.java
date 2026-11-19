package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "seller_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SellerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "display_name")
    private String displayName;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "stripe_account_id")
    private String stripeAccountId;

    @Column(name = "onboarding_status")
    @Builder.Default
    private String onboardingStatus = "pending"; // pending, onboarding, active

    @Column(name = "hourly_rate")
    private Integer hourlyRate; // cents

    @Column(name = "average_rating", columnDefinition = "DECIMAL(3,2)")
    private Double averageRating;

    @Column(name = "avg_quality_rating", columnDefinition = "DECIMAL(3,2)")
    private Double avgQualityRating;

    @Column(name = "avg_communication_rating", columnDefinition = "DECIMAL(3,2)")
    private Double avgCommunicationRating;

    @Column(name = "avg_deadline_rating", columnDefinition = "DECIMAL(3,2)")
    private Double avgDeadlineRating;

    @Column(name = "recommendation_rate", columnDefinition = "DECIMAL(5,2)")
    private Double recommendationRate;

    @Column(name = "is_top_rated")
    @Builder.Default
    private Boolean isTopRated = false;

    @Column(name = "review_count")
    @Builder.Default
    private Integer reviewCount = 0;

    @Column(name = "completed_orders_count")
    @Builder.Default
    private Integer completedOrdersCount = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "sellerProfile", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Listing> listings;

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
