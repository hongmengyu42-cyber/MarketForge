package com.marketforge.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResolveDisputeRequest {
    @NotBlank
    private String verdict; // refund_buyer, payout_seller, split_50_50, custom_split

    @NotBlank
    @Size(max = 5000)
    private String rulingNotes;

    private Long customBuyerRefundAmount; // in cents
    private Long customSellerPayoutAmount; // in cents
}
