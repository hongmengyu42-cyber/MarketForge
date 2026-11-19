package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "hourly_contracts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HourlyContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @Column(nullable = false)
    private String title;

    @Column(name = "hourly_rate", nullable = false)
    private Long hourlyRate; // cents per hour

    @Column(name = "weekly_hour_cap")
    private Integer weeklyHourCap;

    @Column(nullable = false)
    @Builder.Default
    private String status = "active"; // active, paused, completed

    @Column(name = "total_hours_logged")
    @Builder.Default
    private Double totalHoursLogged = 0.0;

    @Column(name = "total_amount_billed")
    @Builder.Default
    private Long totalAmountBilled = 0L; // cents

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<WorkSession> workSessions;

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
