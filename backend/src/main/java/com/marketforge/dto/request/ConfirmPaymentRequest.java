package com.marketforge.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmPaymentRequest {

    @NotBlank(message = "Payment Intent ID is required")
    private String paymentIntentId;

    private Long orderId;

    private Long listingId;

    private Long milestoneId;
}
