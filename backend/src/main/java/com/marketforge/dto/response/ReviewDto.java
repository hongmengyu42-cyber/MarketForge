package com.marketforge.dto.response;

import com.marketforge.entity.Review;
import com.marketforge.entity.ReviewType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ReviewDto {
    private Long id;
    private Long orderId;
    private String orderNumber;
    private Long listingId;
    private String listingTitle;

    private Long reviewerId;
    private String reviewerName;
    private String reviewerAvatar;

    private Long targetUserId;
    private String targetUserName;
    private String targetUserAvatar;

    private ReviewType reviewType;
    private Integer rating;

    private Integer qualityRating;
    private Integer communicationRating;
    private Integer deadlineRating;

    private Integer clarityRating;
    private Integer cooperationRating;

    private Boolean wouldRecommend;
    private String comment;

    private String sellerResponse;
    private LocalDateTime respondedAt;

    private Boolean isRevealed;
    private LocalDateTime autoRevealAt;
    private LocalDateTime revealedAt;
    private LocalDateTime createdAt;

    public static ReviewDto from(Review r) {
        if (r == null) return null;
        return ReviewDto.builder()
                .id(r.getId())
                .orderId(r.getOrder() != null ? r.getOrder().getId() : null)
                .orderNumber(r.getOrder() != null ? r.getOrder().getOrderNumber() : null)
                .listingId(r.getListing() != null ? r.getListing().getId() : null)
                .listingTitle(r.getListing() != null ? r.getListing().getTitle() : null)
                .reviewerId(r.getReviewer() != null ? r.getReviewer().getId() : null)
                .reviewerName(r.getReviewer() != null ? r.getReviewer().getName() : null)
                .reviewerAvatar(r.getReviewer() != null ? r.getReviewer().getAvatarUrl() : null)
                .targetUserId(r.getTargetUser() != null ? r.getTargetUser().getId() : (r.getSeller() != null ? r.getSeller().getId() : null))
                .targetUserName(r.getTargetUser() != null ? r.getTargetUser().getName() : (r.getSeller() != null ? r.getSeller().getName() : null))
                .targetUserAvatar(r.getTargetUser() != null ? r.getTargetUser().getAvatarUrl() : (r.getSeller() != null ? r.getSeller().getAvatarUrl() : null))
                .reviewType(r.getReviewType())
                .rating(r.getRating())
                .qualityRating(r.getQualityRating())
                .communicationRating(r.getCommunicationRating())
                .deadlineRating(r.getDeadlineRating())
                .clarityRating(r.getClarityRating())
                .cooperationRating(r.getCooperationRating())
                .wouldRecommend(r.getWouldRecommend())
                .comment(r.getComment())
                .sellerResponse(r.getSellerResponse())
                .respondedAt(r.getRespondedAt())
                .isRevealed(r.getIsRevealed())
                .autoRevealAt(r.getAutoRevealAt())
                .revealedAt(r.getRevealedAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
