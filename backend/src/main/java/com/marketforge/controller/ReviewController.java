package com.marketforge.controller;

import com.marketforge.dto.request.CreateReviewRequest;
import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.OrderReviewStatusResponse;
import com.marketforge.dto.response.ReviewDto;
import com.marketforge.dto.response.SellerReputationDto;
import com.marketforge.entity.User;
import com.marketforge.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping("/listing/{listingId}")
    public ResponseEntity<ApiResponse<Page<ReviewDto>>> getListingReviews(
            @PathVariable Long listingId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(reviewService.getListingReviews(listingId, page, size)));
    }

    @GetMapping("/seller/{sellerId}")
    public ResponseEntity<ApiResponse<Page<ReviewDto>>> getSellerReviews(
            @PathVariable Long sellerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(reviewService.getSellerReviews(sellerId, page, size)));
    }

    @GetMapping("/seller/{sellerId}/reputation")
    public ResponseEntity<ApiResponse<SellerReputationDto>> getSellerReputation(
            @PathVariable Long sellerId) {
        return ResponseEntity.ok(ApiResponse.success(reviewService.getSellerReputation(sellerId)));
    }

    @GetMapping("/order/{orderId}/status")
    public ResponseEntity<ApiResponse<OrderReviewStatusResponse>> getOrderReviewStatus(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success(reviewService.getOrderReviewStatus(currentUser, orderId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReviewDto>> createReview(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Review submitted", reviewService.createReview(currentUser, request)));
    }

    @PostMapping("/{id}/respond")
    public ResponseEntity<ApiResponse<ReviewDto>> respondToReview(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success("Response posted",
                reviewService.respondToReview(currentUser, id, body.get("response"))));
    }
}
