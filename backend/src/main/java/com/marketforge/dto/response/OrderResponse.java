package com.marketforge.dto.response;

import com.marketforge.entity.*;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class OrderResponse {
    private Long id;
    private String orderNumber;
    private String status;
    private Double amountTotal;
    private Double platformFeeAmount;
    private Double sellerPayoutAmount;
    private String currency;
    private LocalDateTime deliveredAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime autoReleaseAt;
    private LocalDateTime expectedDeliveryAt;
    private String requirements;
    private LocalDateTime requirementsSubmittedAt;
    private LocalDateTime createdAt;
    private Long conversationId;

    private ListingInfo listing;
    private UserInfo buyer;
    private UserInfo seller;

    @Builder.Default
    private List<DeliveryInfo> deliveries = new ArrayList<>();

    @Builder.Default
    private List<MilestoneInfo> milestones = new ArrayList<>();

    @Builder.Default
    private List<StatusTransitionInfo> statusTransitions = new ArrayList<>();

    private ReviewInfo review;
    private DisputeInfo dispute;

    @Data @Builder
    public static class ListingInfo {
        private Long id;
        private String title;
        private String slug;
        private String imageUrl;
        private Integer deliveryDays;
        private String categoryName;
    }

    @Data @Builder
    public static class UserInfo {
        private Long id;
        private String name;
        private String displayName;
        private String email;
        private String avatarUrl;
    }

    @Data @Builder
    public static class DeliveryInfo {
        private Long id;
        private String notes;
        private String sourceUrl;
        private String attachments;
        private LocalDateTime createdAt;
        private Long sellerId;
        private String sellerName;
    }

    @Data @Builder
    public static class MilestoneInfo {
        private Long id;
        private Integer milestoneIndex;
        private String title;
        private String description;
        private Double amount;
        private Double platformFeeAmount;
        private Double sellerPayoutAmount;
        private String status;
        private String deliverableNotes;
        private String deliverableUrl;
        private String revisionNotes;
        private LocalDateTime revisionRequestedAt;
        private LocalDateTime deliveredAt;
        private LocalDateTime approvedAt;
        private LocalDateTime createdAt;
    }

    @Data @Builder
    public static class StatusTransitionInfo {
        private Long id;
        private String fromStatus;
        private String toStatus;
        private String reason;
        private String triggeredByName;
        private LocalDateTime createdAt;
    }

    @Data @Builder
    public static class ReviewInfo {
        private Long id;
        private Integer rating;
        private String comment;
        private LocalDateTime createdAt;
    }

    @Data @Builder
    public static class DisputeInfo {
        private Long id;
        private String reason;
        private String description;
        private String status;
        private LocalDateTime createdAt;
    }

    public static OrderResponse from(Order o) {
        return from(o, null, null, null, null, null);
    }

    public static OrderResponse from(
            Order o,
            List<OrderDelivery> deliveries,
            List<OrderMilestone> milestones,
            List<OrderStatusTransition> transitions,
            Review review,
            Long conversationId
    ) {
        OrderResponseBuilder b = OrderResponse.builder()
                .id(o.getId())
                .orderNumber(o.getOrderNumber())
                .status(o.getStatus() != null ? o.getStatus().name().toLowerCase() : null)
                .amountTotal(o.getAmountTotal() != null ? o.getAmountTotal() / 100.0 : 0)
                .platformFeeAmount(o.getPlatformFeeAmount() != null ? o.getPlatformFeeAmount() / 100.0 : 0)
                .sellerPayoutAmount(o.getSellerPayoutAmount() != null ? o.getSellerPayoutAmount() / 100.0 : 0)
                .currency(o.getCurrency())
                .deliveredAt(o.getDeliveredAt())
                .confirmedAt(o.getConfirmedAt())
                .autoReleaseAt(o.getAutoReleaseAt())
                .expectedDeliveryAt(o.getExpectedDeliveryAt())
                .requirements(o.getRequirements())
                .requirementsSubmittedAt(o.getRequirementsSubmittedAt())
                .createdAt(o.getCreatedAt())
                .conversationId(conversationId);

        if (o.getListing() != null) {
            var l = o.getListing();
            String imgUrl = (l.getImages() != null && !l.getImages().isEmpty())
                    ? l.getImages().get(0).getImageUrl() : null;
            String catName = l.getCategory() != null ? l.getCategory().getName() : null;
            b.listing(ListingInfo.builder()
                    .id(l.getId())
                    .title(l.getTitle())
                    .slug(l.getSlug())
                    .imageUrl(imgUrl)
                    .deliveryDays(l.getDeliveryDays())
                    .categoryName(catName)
                    .build());
        }

        if (o.getBuyer() != null) {
            User buyer = o.getBuyer();
            b.buyer(UserInfo.builder()
                    .id(buyer.getId())
                    .name(buyer.getName())
                    .displayName(buyer.getName())
                    .email(buyer.getEmail())
                    .avatarUrl(buyer.getAvatarUrl())
                    .build());
        }

        if (o.getSeller() != null) {
            User seller = o.getSeller();
            String avatar = seller.getAvatarUrl();
            String displayName = seller.getName();
            if (seller.getSellerProfile() != null) {
                if (avatar == null) avatar = seller.getSellerProfile().getAvatarUrl();
                if (seller.getSellerProfile().getDisplayName() != null) {
                    displayName = seller.getSellerProfile().getDisplayName();
                }
            }
            b.seller(UserInfo.builder()
                    .id(seller.getId())
                    .name(seller.getName())
                    .displayName(displayName)
                    .email(seller.getEmail())
                    .avatarUrl(avatar)
                    .build());
        }

        if (deliveries != null && !deliveries.isEmpty()) {
            List<DeliveryInfo> delList = new ArrayList<>();
            for (OrderDelivery d : deliveries) {
                delList.add(DeliveryInfo.builder()
                        .id(d.getId())
                        .notes(d.getNotes())
                        .sourceUrl(d.getSourceUrl())
                        .attachments(d.getAttachments())
                        .createdAt(d.getCreatedAt())
                        .sellerId(d.getSeller() != null ? d.getSeller().getId() : null)
                        .sellerName(d.getSeller() != null ? d.getSeller().getName() : null)
                        .build());
            }
            b.deliveries(delList);
        }

        if (milestones != null && !milestones.isEmpty()) {
            List<MilestoneInfo> mList = new ArrayList<>();
            for (OrderMilestone m : milestones) {
                mList.add(MilestoneInfo.builder()
                        .id(m.getId())
                        .milestoneIndex(m.getMilestoneIndex())
                        .title(m.getTitle())
                        .description(m.getDescription())
                        .amount(m.getAmountTotal() != null ? m.getAmountTotal() / 100.0 : 0)
                        .platformFeeAmount(m.getPlatformFeeAmount() != null ? m.getPlatformFeeAmount() / 100.0 : 0)
                        .sellerPayoutAmount(m.getSellerPayoutAmount() != null ? m.getSellerPayoutAmount() / 100.0 : 0)
                        .status(m.getStatus())
                        .deliverableNotes(m.getDeliverableNotes())
                        .deliverableUrl(m.getDeliverableUrl())
                        .revisionNotes(m.getRevisionNotes())
                        .revisionRequestedAt(m.getRevisionRequestedAt())
                        .deliveredAt(m.getDeliveredAt())
                        .approvedAt(m.getApprovedAt())
                        .createdAt(m.getCreatedAt())
                        .build());
            }
            b.milestones(mList);
        }

        if (transitions != null && !transitions.isEmpty()) {
            List<StatusTransitionInfo> tList = new ArrayList<>();
            for (OrderStatusTransition t : transitions) {
                tList.add(StatusTransitionInfo.builder()
                        .id(t.getId())
                        .fromStatus(t.getFromStatus())
                        .toStatus(t.getToStatus())
                        .reason(t.getReason())
                        .triggeredByName(t.getTriggeredBy() != null ? t.getTriggeredBy().getName() : "System")
                        .createdAt(t.getCreatedAt())
                        .build());
            }
            b.statusTransitions(tList);
        }

        if (review != null) {
            b.review(ReviewInfo.builder()
                    .id(review.getId())
                    .rating(review.getRating())
                    .comment(review.getComment())
                    .createdAt(review.getCreatedAt())
                    .build());
        }

        if (o.getDispute() != null) {
            b.dispute(DisputeInfo.builder()
                    .id(o.getDispute().getId())
                    .reason(o.getDispute().getReason())
                    .description(o.getDispute().getDescription())
                    .status(o.getDispute().getStatus() != null ? o.getDispute().getStatus().toLowerCase() : null)
                    .createdAt(o.getDispute().getCreatedAt())
                    .build());
        }

        return b.build();
    }
}
