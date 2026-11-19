package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "portfolio_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "project_url")
    private String projectUrl;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "image_urls", columnDefinition = "TEXT")
    private String imageUrls; // comma-separated or JSON list of screenshot URLs

    @Column(name = "skills_used")
    private String skillsUsed; // comma-separated, e.g. "React,TypeScript,Tailwind,Spring Boot"

    @Column(name = "completion_date")
    private String completionDate; // e.g. "October 2026"

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
