package com.marketforge.service;

import com.marketforge.dto.request.CreateReviewRequest;
import com.marketforge.dto.response.OrderReviewStatusResponse;
import com.marketforge.dto.response.ReviewDto;
import com.marketforge.dto.response.SellerReputationDto;
import com.marketforge.entity.*;
import com.marketforge.exception.BusinessException;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final ListingRepository listingRepository;
    private final SellerProfileRepository sellerProfileRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public Page<ReviewDto> getListingReviews(Long listingId, int page, int size) {
        return reviewRepository.findByListingIdRevealed(listingId, PageRequest.of(page, size))
                .map(ReviewDto::from);
    }

    @Transactional(readOnly = true)
    public Page<ReviewDto> getSellerReviews(Long sellerId, int page, int size) {
        return reviewRepository.findBySellerIdAndReviewTypeRevealed(sellerId, ReviewType.BUYER_TO_SELLER, PageRequest.of(page, size))
                .map(ReviewDto::from);
    }

    @Transactional
    public ReviewDto createReview(User currentUser, CreateReviewRequest req) {
        Order order = orderRepository.findById(req.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", req.getOrderId()));

        // Order must be completed
        if (order.getStatus() != Order.OrderStatus.CONFIRMED
                && order.getStatus() != Order.OrderStatus.RELEASED
                && order.getStatus() != Order.OrderStatus.PAID_OUT) {
            throw new BusinessException("INVALID_STATE", "Order must be completed before reviewing");
        }

        // Determine if reviewer is buyer or seller
        boolean isBuyer = order.getBuyer().getId().equals(currentUser.getId());
        boolean isSeller = order.getSeller().getId().equals(currentUser.getId());

        if (!isBuyer && !isSeller) {
            throw new BusinessException("FORBIDDEN", "Only the buyer or seller can review this order");
        }

        // Check if current user already reviewed this order
        if (reviewRepository.existsByOrderIdAndReviewerId(order.getId(), currentUser.getId())) {
            throw new BusinessException("ALREADY_REVIEWED", "You have already reviewed this order");
        }

        ReviewType reviewType = isBuyer ? ReviewType.BUYER_TO_SELLER : ReviewType.SELLER_TO_BUYER;
        User targetUser = isBuyer ? order.getSeller() : order.getBuyer();

        // Check if counterpart already submitted review
        Optional<Review> counterpartReviewOpt = reviewRepository.findByOrderIdAndReviewerId(order.getId(), targetUser.getId());
        boolean isRevealed = counterpartReviewOpt.isPresent();

        LocalDateTime now = LocalDateTime.now();

        Review review = Review.builder()
                .order(order)
                .listing(order.getListing())
                .reviewer(currentUser)
                .targetUser(targetUser)
                .seller(order.getSeller())
                .reviewType(reviewType)
                .rating(req.getRating())
                .qualityRating(req.getQualityRating())
                .communicationRating(req.getCommunicationRating())
                .deadlineRating(req.getDeadlineRating())
                .clarityRating(req.getClarityRating())
                .cooperationRating(req.getCooperationRating())
                .wouldRecommend(req.getWouldRecommend() != null ? req.getWouldRecommend() : true)
                .comment(req.getComment())
                .isRevealed(isRevealed)
                .autoRevealAt(isRevealed ? null : now.plusDays(14))
                .revealedAt(isRevealed ? now : null)
                .build();

        review = reviewRepository.save(review);

        if (isRevealed) {
            // Unlock counterpart's review as well
            Review counterpartReview = counterpartReviewOpt.get();
            counterpartReview.setIsRevealed(true);
            counterpartReview.setRevealedAt(now);
            reviewRepository.save(counterpartReview);

            // Update stats
            recalculateListingStats(order.getListing());
            recalculateSellerReputation(order.getSeller().getId());

            // Notify both parties: Double-blind lock released!
            notificationService.send(currentUser, "review", "Reviews Unlocked! 🎉",
                    "Both reviews for order #" + order.getOrderNumber() + " have been revealed. View your feedback!",
                    "/orders/" + order.getId());

            notificationService.send(targetUser, "review", "Reviews Unlocked! 🎉",
                    currentUser.getName() + " has submitted their review. Reviews for order #" + order.getOrderNumber() + " are now public!",
                    "/orders/" + order.getId());
        } else {
            // Notify counterpart that user left feedback and prompt them to review
            notificationService.send(targetUser, "review", "Feedback Submitted 🔒",
                    currentUser.getName() + " left feedback on order #" + order.getOrderNumber() + ". Submit your review to unlock and read it!",
                    "/orders/" + order.getId());
        }

        return ReviewDto.from(review);
    }

    @Transactional
    public OrderReviewStatusResponse getOrderReviewStatus(User currentUser, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        boolean isBuyer = order.getBuyer().getId().equals(currentUser.getId());
        boolean isSeller = order.getSeller().getId().equals(currentUser.getId());
        boolean isAdmin = Boolean.TRUE.equals(currentUser.getIsAdmin());

        if (!isBuyer && !isSeller && !isAdmin) {
            throw new BusinessException("FORBIDDEN", "You do not have access to this order's review status");
        }

        boolean isCompleted = order.getStatus() == Order.OrderStatus.CONFIRMED
                || order.getStatus() == Order.OrderStatus.RELEASED
                || order.getStatus() == Order.OrderStatus.PAID_OUT;

        List<Review> reviews = reviewRepository.findByOrderId(orderId);

        // Check if any review has reached 14-day auto-reveal expiration
        LocalDateTime now = LocalDateTime.now();
        boolean hasExpiredReview = false;
        for (Review r : reviews) {
            if (!Boolean.TRUE.equals(r.getIsRevealed()) && r.getAutoRevealAt() != null && now.isAfter(r.getAutoRevealAt())) {
                r.setIsRevealed(true);
                r.setRevealedAt(now);
                reviewRepository.save(r);
                hasExpiredReview = true;
            }
        }
        if (hasExpiredReview) {
            recalculateListingStats(order.getListing());
            recalculateSellerReputation(order.getSeller().getId());
        }

        Review myReview = reviews.stream()
                .filter(r -> r.getReviewer().getId().equals(currentUser.getId()))
                .findFirst()
                .orElse(null);

        Review counterpartReview = reviews.stream()
                .filter(r -> !r.getReviewer().getId().equals(currentUser.getId()))
                .findFirst()
                .orElse(null);

        boolean hasBuyerReviewed = reviews.stream().anyMatch(r -> r.getReviewType() == ReviewType.BUYER_TO_SELLER);
        boolean hasSellerReviewed = reviews.stream().anyMatch(r -> r.getReviewType() == ReviewType.SELLER_TO_BUYER);
        boolean isRevealed = reviews.stream().anyMatch(r -> Boolean.TRUE.equals(r.getIsRevealed()));

        LocalDateTime autoRevealAt = null;
        Long daysLeftToReveal = null;
        for (Review r : reviews) {
            if (!Boolean.TRUE.equals(r.getIsRevealed()) && r.getAutoRevealAt() != null) {
                autoRevealAt = r.getAutoRevealAt();
                daysLeftToReveal = Math.max(0, java.time.Duration.between(now, autoRevealAt).toDays());
                break;
            }
        }

        return OrderReviewStatusResponse.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .isCompleted(isCompleted)
                .canReview(isCompleted && myReview == null)
                .hasBuyerReviewed(hasBuyerReviewed)
                .hasSellerReviewed(hasSellerReviewed)
                .isRevealed(isRevealed)
                .autoRevealAt(autoRevealAt)
                .daysLeftToReveal(daysLeftToReveal)
                .myReview(ReviewDto.from(myReview))
                .counterpartReview(isRevealed || isAdmin ? ReviewDto.from(counterpartReview) : null)
                .build();
    }

    @Transactional(readOnly = true)
    public SellerReputationDto getSellerReputation(Long sellerId) {
        Double avgRating = reviewRepository.calculateSellerAverageRating(sellerId);
        Integer count = reviewRepository.countSellerRevealedReviews(sellerId);
        Double avgQuality = reviewRepository.calculateSellerAvgQuality(sellerId);
        Double avgComm = reviewRepository.calculateSellerAvgCommunication(sellerId);
        Double avgDeadline = reviewRepository.calculateSellerAvgDeadline(sellerId);
        Integer recommendedCount = reviewRepository.countSellerRecommendedReviews(sellerId);

        Double recRate = (count != null && count > 0)
                ? (recommendedCount != null ? (recommendedCount * 100.0) / count : 100.0)
                : 100.0;

        SellerProfile profile = sellerProfileRepository.findByUserId(sellerId).orElse(null);
        String sellerName = profile != null ? profile.getDisplayName() : "Seller";
        Boolean isTopRated = profile != null ? Boolean.TRUE.equals(profile.getIsTopRated()) : false;
        Integer completedCount = profile != null ? profile.getCompletedOrdersCount() : 0;

        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) distribution.put(i, 0L);
        List<Object[]> rawDist = reviewRepository.getSellerRatingDistribution(sellerId);
        if (rawDist != null) {
            for (Object[] row : rawDist) {
                if (row[0] != null && row[1] != null) {
                    distribution.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue());
                }
            }
        }

        return SellerReputationDto.builder()
                .sellerId(sellerId)
                .sellerName(sellerName)
                .averageRating(avgRating != null ? Math.round(avgRating * 100.0) / 100.0 : null)
                .reviewCount(count != null ? count : 0)
                .avgQualityRating(avgQuality != null ? Math.round(avgQuality * 100.0) / 100.0 : null)
                .avgCommunicationRating(avgComm != null ? Math.round(avgComm * 100.0) / 100.0 : null)
                .avgDeadlineRating(avgDeadline != null ? Math.round(avgDeadline * 100.0) / 100.0 : null)
                .recommendationRate(Math.round(recRate * 10.0) / 10.0)
                .isTopRated(isTopRated)
                .completedOrdersCount(completedCount != null ? completedCount : 0)
                .ratingDistribution(distribution)
                .build();
    }

    @Transactional
    public ReviewDto respondToReview(User seller, Long reviewId, String response) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", reviewId));
        if (!review.getSeller().getId().equals(seller.getId()))
            throw new BusinessException("FORBIDDEN", "Only the seller can respond to this review");
        if (review.getSellerResponse() != null)
            throw new BusinessException("ALREADY_RESPONDED", "Already responded to this review");

        review.setSellerResponse(response);
        review.setRespondedAt(LocalDateTime.now());
        return ReviewDto.from(reviewRepository.save(review));
    }

    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void autoRevealExpiredReviews() {
        LocalDateTime now = LocalDateTime.now();
        List<Review> expired = reviewRepository.findByIsRevealedFalseAndAutoRevealAtBefore(now);
        for (Review r : expired) {
            r.setIsRevealed(true);
            r.setRevealedAt(now);
            reviewRepository.save(r);
            if (r.getListing() != null) recalculateListingStats(r.getListing());
            if (r.getSeller() != null) recalculateSellerReputation(r.getSeller().getId());
            log.info("Auto-revealed review #{} after 14-day window", r.getId());
        }
    }

    public void recalculateSellerReputation(Long sellerId) {
        Double avgRating = reviewRepository.calculateSellerAverageRating(sellerId);
        Integer count = reviewRepository.countSellerRevealedReviews(sellerId);
        Double avgQuality = reviewRepository.calculateSellerAvgQuality(sellerId);
        Double avgComm = reviewRepository.calculateSellerAvgCommunication(sellerId);
        Double avgDeadline = reviewRepository.calculateSellerAvgDeadline(sellerId);
        Integer recommendedCount = reviewRepository.countSellerRecommendedReviews(sellerId);

        Double recRate = (count != null && count > 0)
                ? (recommendedCount != null ? (recommendedCount * 100.0) / count : 100.0)
                : 100.0;

        sellerProfileRepository.findByUserId(sellerId).ifPresent(profile -> {
            profile.setAverageRating(avgRating != null ? Math.round(avgRating * 100.0) / 100.0 : null);
            profile.setReviewCount(count != null ? count : 0);
            profile.setAvgQualityRating(avgQuality != null ? Math.round(avgQuality * 100.0) / 100.0 : null);
            profile.setAvgCommunicationRating(avgComm != null ? Math.round(avgComm * 100.0) / 100.0 : null);
            profile.setAvgDeadlineRating(avgDeadline != null ? Math.round(avgDeadline * 100.0) / 100.0 : null);
            profile.setRecommendationRate(Math.round(recRate * 10.0) / 10.0);

            int completed = profile.getCompletedOrdersCount() != null ? profile.getCompletedOrdersCount() : 0;
            boolean isTopRated = completed >= 5
                    && avgRating != null && avgRating >= 4.8
                    && (recRate >= 90.0);
            profile.setIsTopRated(isTopRated);

            sellerProfileRepository.save(profile);
        });
    }

    public void recalculateListingStats(Listing listing) {
        if (listing == null) return;
        Double avgRating = reviewRepository.calculateListingAverageRating(listing.getId());
        Integer count = reviewRepository.countListingRevealedReviews(listing.getId());
        listing.setAverageRating(avgRating != null ? Math.round(avgRating * 100.0) / 100.0 : null);
        listing.setReviewCount(count != null ? count : 0);
        listingRepository.save(listing);
    }
}
