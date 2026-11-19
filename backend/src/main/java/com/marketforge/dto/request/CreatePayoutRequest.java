package com.marketforge.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreatePayoutRequest {

    @NotNull(message = "Withdrawal amount is required")
    @Min(value = 10, message = "Minimum withdrawal amount is $10.00")
    private Double amount; // In dollars

    @NotBlank(message = "Payout method is required")
    private String payoutMethod; // STRIPE_CONNECT, BANK_TRANSFER, PAYPAL

    private String destinationDetails;
}
