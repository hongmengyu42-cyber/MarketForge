package com.marketforge.dto.response;

import com.marketforge.entity.Dispute;
import com.marketforge.entity.Order;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class DisputeResponse {
    private Long id;
    private Long orderId;
    private String orderNumber;
    private Long orderAmount;
    private String currency;
    private String listingTitle;
    private String listingSlug;

    private Long buyerId;
    private String buyerName;
    private String buyerAvatar;

    private Long sellerId;
    private String sellerName;
    private String sellerAvatar;

    private Long raisedById;
    private String raisedByName;
    private String raisedByRole;

    private String reason;
    private String description;
    private String status;
    private String stage;

    private Long claimAmount;
    private Long refundAmount;
    private Long releaseAmount;

    private LocalDateTime resolvedAt;
    private String resolvedByAdminName;
    private String assignedMediatorName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<DisputeMessageDto> messages = new ArrayList<>();

    @Builder.Default
    private List<DisputeAttachmentDto> attachments = new ArrayList<>();

    @Builder.Default
    private List<DisputeSettlementOfferDto> settlementOffers = new ArrayList<>();

    private DisputeResolutionDto latestResolution;

    public static DisputeResponse from(Dispute d) {
        if (d == null) return null;
        Order order = d.getOrder();
        Long buyerId = order != null && order.getBuyer() != null ? order.getBuyer().getId() : null;
        Long sellerId = order != null && order.getSeller() != null ? order.getSeller().getId() : null;

        String raisedRole = "OTHER";
        if (d.getRaisedBy() != null) {
            if (buyerId != null && d.getRaisedBy().getId().equals(buyerId)) raisedRole = "BUYER";
            else if (sellerId != null && d.getRaisedBy().getId().equals(sellerId)) raisedRole = "SELLER";
        }

        List<DisputeMessageDto> msgDtos = new ArrayList<>();
        if (d.getMessages() != null) {
            for (var m : d.getMessages()) {
                msgDtos.add(DisputeMessageDto.from(m, buyerId, sellerId));
            }
        }

        List<DisputeAttachmentDto> attDtos = new ArrayList<>();
        if (d.getAttachments() != null) {
            for (var a : d.getAttachments()) {
                attDtos.add(DisputeAttachmentDto.from(a));
            }
        }

        List<DisputeSettlementOfferDto> offDtos = new ArrayList<>();
        if (d.getSettlementOffers() != null) {
            for (var o : d.getSettlementOffers()) {
                offDtos.add(DisputeSettlementOfferDto.from(o, buyerId, sellerId));
            }
        }

        return DisputeResponse.builder()
                .id(d.getId())
                .orderId(order != null ? order.getId() : null)
                .orderNumber(order != null ? order.getOrderNumber() : null)
                .orderAmount(order != null ? order.getAmountTotal() : 0L)
                .currency(order != null ? order.getCurrency() : "usd")
                .listingTitle(order != null && order.getListing() != null ? order.getListing().getTitle() : null)
                .listingSlug(order != null && order.getListing() != null ? order.getListing().getSlug() : null)
                .buyerId(buyerId)
                .buyerName(order != null && order.getBuyer() != null ? order.getBuyer().getName() : null)
                .buyerAvatar(order != null && order.getBuyer() != null ? order.getBuyer().getAvatarUrl() : null)
                .sellerId(sellerId)
                .sellerName(order != null && order.getSeller() != null ? order.getSeller().getName() : null)
                .sellerAvatar(order != null && order.getSeller() != null ? order.getSeller().getAvatarUrl() : null)
                .raisedById(d.getRaisedBy() != null ? d.getRaisedBy().getId() : null)
                .raisedByName(d.getRaisedBy() != null ? d.getRaisedBy().getName() : null)
                .raisedByRole(raisedRole)
                .reason(d.getReason())
                .description(d.getDescription())
                .status(d.getStatus())
                .stage(d.getStage())
                .claimAmount(d.getClaimAmount())
                .refundAmount(d.getRefundAmount())
                .releaseAmount(d.getReleaseAmount())
                .resolvedAt(d.getResolvedAt())
                .resolvedByAdminName(d.getResolvedByAdmin() != null ? d.getResolvedByAdmin().getName() : null)
                .assignedMediatorName(d.getAssignedMediator() != null ? d.getAssignedMediator().getName() : null)
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .messages(msgDtos)
                .attachments(attDtos)
                .settlementOffers(offDtos)
                .latestResolution(DisputeResolutionDto.from(d.getLatestResolution()))
                .build();
    }
}
