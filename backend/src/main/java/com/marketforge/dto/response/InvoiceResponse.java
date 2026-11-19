package com.marketforge.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class InvoiceResponse {
    private String invoiceNumber;
    private String orderNumber;
    private Long orderId;
    private LocalDateTime issueDate;
    private String currency;

    private String buyerName;
    private String buyerEmail;

    private String sellerName;
    private String sellerDisplayName;
    private String sellerEmail;

    private String serviceTitle;
    private Double subtotal;
    private Double platformFee;
    private Double totalAmount;
    private Double sellerPayoutAmount;
    private String status;
    private String escrowStatus;
}
