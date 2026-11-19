package com.marketforge.dto.response;

import com.marketforge.entity.DisputeSettlementOffer;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DisputeSettlementOfferDto {
    private Long id;
    private Long disputeId;
    private Long proposedById;
    private String proposedByName;
    private String proposedByRole; // BUYER, SELLER
    private Long refundAmount; // cents to buyer
    private Long releaseAmount; // cents to seller
    private String message;
    private String status; // PENDING, ACCEPTED, REJECTED, EXPIRED
    private LocalDateTime respondedAt;
    private LocalDateTime createdAt;

    public static DisputeSettlementOfferDto from(DisputeSettlementOffer o, Long buyerId, Long sellerId) {
        if (o == null) return null;
        String role = "OTHER";
        if (o.getProposedBy() != null) {
            if (buyerId != null && o.getProposedBy().getId().equals(buyerId)) role = "BUYER";
            else if (sellerId != null && o.getProposedBy().getId().equals(sellerId)) role = "SELLER";
        }
        return DisputeSettlementOfferDto.builder()
                .id(o.getId())
                .disputeId(o.getDispute() != null ? o.getDispute().getId() : null)
                .proposedById(o.getProposedBy() != null ? o.getProposedBy().getId() : null)
                .proposedByName(o.getProposedBy() != null ? o.getProposedBy().getName() : null)
                .proposedByRole(role)
                .refundAmount(o.getRefundAmount())
                .releaseAmount(o.getReleaseAmount())
                .message(o.getMessage())
                .status(o.getStatus())
                .respondedAt(o.getRespondedAt())
                .createdAt(o.getCreatedAt())
                .build();
    }
}
