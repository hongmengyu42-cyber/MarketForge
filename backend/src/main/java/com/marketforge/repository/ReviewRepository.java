package com.marketforge.repository;

import com.marketforge.entity.Review;
import com.marketforge.entity.ReviewType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByOrderId(Long orderId);

    Optional<Review> findByOrderIdAndReviewerId(Long orderId, Long reviewerId);

    boolean existsByOrderIdAndReviewerId(Long orderId, Long reviewerId);

    @Query("SELECT r FROM Review r WHERE r.listing.id = :listingId AND r.isRevealed = true ORDER BY r.createdAt DESC")
    Page<Review> findByListingIdRevealed(@Param("listingId") Long listingId, Pageable pageable);

    @Query("SELECT r FROM Review r WHERE r.seller.id = :sellerId AND r.isRevealed = true AND r.reviewType = :reviewType ORDER BY r.createdAt DESC")
    Page<Review> findBySellerIdAndReviewTypeRevealed(@Param("sellerId") Long sellerId, @Param("reviewType") ReviewType reviewType, Pageable pageable);

    @Query("SELECT r FROM Review r WHERE r.targetUser.id = :targetUserId AND r.isRevealed = true ORDER BY r.createdAt DESC")
    Page<Review> findByTargetUserIdRevealed(@Param("targetUserId") Long targetUserId, Pageable pageable);

    List<Review> findByIsRevealedFalseAndAutoRevealAtBefore(LocalDateTime threshold);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.listing.id = :listingId AND r.isRevealed = true AND r.reviewType = 'BUYER_TO_SELLER'")
    Double calculateListingAverageRating(@Param("listingId") Long listingId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.listing.id = :listingId AND r.isRevealed = true AND r.reviewType = 'BUYER_TO_SELLER'")
    Integer countListingRevealedReviews(@Param("listingId") Long listingId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.seller.id = :sellerId AND r.isRevealed = true AND r.reviewType = 'BUYER_TO_SELLER'")
    Double calculateSellerAverageRating(@Param("sellerId") Long sellerId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.seller.id = :sellerId AND r.isRevealed = true AND r.reviewType = 'BUYER_TO_SELLER'")
    Integer countSellerRevealedReviews(@Param("sellerId") Long sellerId);

    @Query("SELECT AVG(r.qualityRating) FROM Review r WHERE r.seller.id = :sellerId AND r.isRevealed = true AND r.reviewType = 'BUYER_TO_SELLER' AND r.qualityRating IS NOT NULL")
    Double calculateSellerAvgQuality(@Param("sellerId") Long sellerId);

    @Query("SELECT AVG(r.communicationRating) FROM Review r WHERE r.seller.id = :sellerId AND r.isRevealed = true AND r.reviewType = 'BUYER_TO_SELLER' AND r.communicationRating IS NOT NULL")
    Double calculateSellerAvgCommunication(@Param("sellerId") Long sellerId);

    @Query("SELECT AVG(r.deadlineRating) FROM Review r WHERE r.seller.id = :sellerId AND r.isRevealed = true AND r.reviewType = 'BUYER_TO_SELLER' AND r.deadlineRating IS NOT NULL")
    Double calculateSellerAvgDeadline(@Param("sellerId") Long sellerId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.seller.id = :sellerId AND r.isRevealed = true AND r.reviewType = 'BUYER_TO_SELLER' AND r.wouldRecommend = true")
    Integer countSellerRecommendedReviews(@Param("sellerId") Long sellerId);

    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.seller.id = :sellerId AND r.isRevealed = true AND r.reviewType = 'BUYER_TO_SELLER' GROUP BY r.rating")
    List<Object[]> getSellerRatingDistribution(@Param("sellerId") Long sellerId);
}
