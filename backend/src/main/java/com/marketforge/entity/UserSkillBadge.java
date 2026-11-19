package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_skill_badges")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserSkillBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private SkillAssessment assessment;

    @Column(nullable = false)
    private Integer score;

    @Column(name = "passed", nullable = false)
    @Builder.Default
    private Boolean passed = false;

    @Column(name = "earned_at")
    private LocalDateTime earnedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (passed && earnedAt == null) {
            earnedAt = LocalDateTime.now();
        }
    }
}
