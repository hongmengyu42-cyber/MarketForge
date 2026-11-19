package com.marketforge.dto.response;

import com.marketforge.entity.CustomOffer;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CustomOfferResponse {

    private Long id;
    private Long conversationId;
    private Long listingId;
    private Long sellerId;
    private String sellerName;
    private Long buyerId;
    private String buyerName;
    private String title;
    private String description;
    private Long priceAmount;
    private Integer deliveryDays;
    private String status;
    private Long orderId;
    private LocalDateTime createdAt;

    public static CustomOfferResponse from(CustomOffer offer) {
        return CustomOfferResponse.builder()
                .id(offer.getId())
                .conversationId(offer.getConversation() != null ? offer.getConversation().getId() : null)
                .listingId(offer.getListing() != null ? offer.getListing().getId() : null)
                .sellerId(offer.getSeller() != null ? offer.getSeller().getId() : null)
                .sellerName(offer.getSeller() != null ? offer.getSeller().getName() : null)
                .buyerId(offer.getBuyer() != null ? offer.getBuyer().getId() : null)
                .buyerName(offer.getBuyer() != null ? offer.getBuyer().getName() : null)
                .title(offer.getTitle())
                .description(offer.getDescription())
                .priceAmount(offer.getPriceAmount())
                .deliveryDays(offer.getDeliveryDays())
                .status(offer.getStatus())
                .orderId(offer.getOrder() != null ? offer.getOrder().getId() : null)
                .createdAt(offer.getCreatedAt())
                .build();
    }
}
