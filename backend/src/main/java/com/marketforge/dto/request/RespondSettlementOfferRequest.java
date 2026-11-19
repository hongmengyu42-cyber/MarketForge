package com.marketforge.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RespondSettlementOfferRequest {
    @NotBlank
    private String action; // ACCEPT, REJECT
}
