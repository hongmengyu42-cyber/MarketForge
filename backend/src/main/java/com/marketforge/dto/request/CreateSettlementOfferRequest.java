package com.marketforge.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateSettlementOfferRequest {
    @NotNull
    @PositiveOrZero
    private Long refundAmount; // cents to buyer

    @NotNull
    @PositiveOrZero
    private Long releaseAmount; // cents to seller

    @Size(max = 2000)
    private String message;
}
