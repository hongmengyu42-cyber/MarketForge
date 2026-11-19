package com.marketforge.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentIntentResponse {

    private String paymentIntentId;

    private String clientSecret;

    private Double amount;

    private Double platformFee;

    private Double totalAmount;

    private String currency;

    private String status;

    private String publishableKey;

    private boolean isMockMode;

    private Long orderId;

    private String description;
}
