package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "listings",
        indexes = {
                @Index(name = "idx_listing_status_category", columnList = "status, category_id"),
                @Index(name = "idx_listing_seller", columnList = "seller_profile_id")
        })
@SQLDelete(sql = "UPDATE listings SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Listing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_profile_id", nullable = false)
    private SellerProfile sellerProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "price_amount", nullable = false)
    private Long priceAmount; // cents

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "usd";

    @Column(name = "delivery_days", nullable = false)
    private Integer deliveryDays;

    @Column(name = "revisions_included")
    @Builder.Default
    private Integer revisionsIncluded = 1;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ListingStatus status = ListingStatus.DRAFT;

    // Denormalized stats
    @Column(name = "average_rating", columnDefinition = "DECIMAL(3,2)")
    private Double averageRating;

    @Column(name = "review_count")
    @Builder.Default
    private Integer reviewCount = 0;

    @Column(name = "completed_orders_count")
    @Builder.Default
    private Integer completedOrdersCount = 0;

    @Column(name = "view_count")
    @Builder.Default
    private Integer viewCount = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "listing_skill",
            joinColumns = @JoinColumn(name = "listing_id"),
            inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    private List<Skill> skills;

    @OneToMany(mappedBy = "listing", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("id ASC")
    private List<ListingImage> images;

    @OneToMany(mappedBy = "listing", fetch = FetchType.LAZY)
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

    public enum ListingStatus {
        DRAFT, ACTIVE, PAUSED, ARCHIVED
    }
}
