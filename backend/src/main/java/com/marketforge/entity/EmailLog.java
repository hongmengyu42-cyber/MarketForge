package com.marketforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Column(name = "recipient_name")
    private String recipientName;

    @Column(nullable = false)
    private String subject;

    @Column(name = "template_type", length = 64)
    private String templateType;

    @Column(name = "html_body", columnDefinition = "LONGTEXT")
    private String htmlBody;

    @Column(length = 32)
    @Builder.Default
    private String status = "SENT"; // SENT, SIMULATED_SUCCESS, FAILED

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @PrePersist
    protected void onCreate() {
        if (sentAt == null) {
            sentAt = LocalDateTime.now();
        }
    }
}
