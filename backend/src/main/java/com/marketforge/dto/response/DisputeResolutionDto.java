package com.marketforge.dto.response;

import com.marketforge.entity.DisputeResolution;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DisputeResolutionDto {
    private Long id;
    private Long disputeId;
    private Long adminId;
    private String adminName;
    private String verdict;
    private String rulingNotes;
    private Long buyerRefundAmount;
    private Long sellerPayoutAmount;
    private LocalDateTime createdAt;

    public static DisputeResolutionDto from(DisputeResolution r) {
        if (r == null) return null;
        return DisputeResolutionDto.builder()
                .id(r.getId())
                .disputeId(r.getDispute() != null ? r.getDispute().getId() : null)
                .adminId(r.getAdmin() != null ? r.getAdmin().getId() : null)
                .adminName(r.getAdmin() != null ? r.getAdmin().getName() : "MarketForge Arbitrator")
                .verdict(r.getVerdict())
                .rulingNotes(r.getRulingNotes())
                .buyerRefundAmount(r.getBuyerRefundAmount())
                .sellerPayoutAmount(r.getSellerPayoutAmount())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
