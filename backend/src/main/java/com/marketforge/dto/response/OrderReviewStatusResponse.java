package com.marketforge.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class OrderReviewStatusResponse {
    private Long orderId;
    private String orderNumber;
    private boolean isCompleted;
    private boolean canReview;
    private boolean hasBuyerReviewed;
    private boolean hasSellerReviewed;
    private boolean isRevealed;
    private LocalDateTime autoRevealAt;
    private Long daysLeftToReveal;

    private ReviewDto myReview;
    private ReviewDto counterpartReview;
}
