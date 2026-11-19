package com.marketforge.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class WalletTransactionResponse {
    private String id;
    private String type; // ESCROW_CAPTURE, ESCROW_RELEASE, PLATFORM_FEE, WITHDRAWAL, REFUND
    private String title;
    private Double amount;
    private String status; // COMPLETED, PENDING_CLEARANCE, PROCESSING, HELD_IN_ESCROW
    private String orderNumber;
    private Long orderId;
    private LocalDateTime date;
}
