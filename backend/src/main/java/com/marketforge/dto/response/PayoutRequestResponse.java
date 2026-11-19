package com.marketforge.dto.response;

import com.marketforge.entity.PayoutRequest;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PayoutRequestResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private Double amount;
    private String payoutMethod;
    private String destinationDetails;
    private String status;
    private String transactionReference;
    private String notes;
    private LocalDateTime processedAt;
    private LocalDateTime createdAt;

    public static PayoutRequestResponse from(PayoutRequest p) {
        return PayoutRequestResponse.builder()
                .id(p.getId())
                .userId(p.getUser() != null ? p.getUser().getId() : null)
                .userName(p.getUser() != null ? p.getUser().getName() : null)
                .userEmail(p.getUser() != null ? p.getUser().getEmail() : null)
                .amount(p.getAmount() != null ? p.getAmount() / 100.0 : 0)
                .payoutMethod(p.getPayoutMethod())
                .destinationDetails(p.getDestinationDetails())
                .status(p.getStatus())
                .transactionReference(p.getTransactionReference())
                .notes(p.getNotes())
                .processedAt(p.getProcessedAt())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
