package com.marketforge.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentIntentRequest {

    private Long orderId;

    private Long listingId;

    private Long milestoneId;

    private Long customOfferId;

    @NotNull(message = "Amount is required")
    private Double amount; // In dollars (e.g. 150.00)

    private String currency; // Default USD
}
