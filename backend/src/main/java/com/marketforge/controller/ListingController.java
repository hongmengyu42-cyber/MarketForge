package com.marketforge.controller;

import com.marketforge.dto.request.CreateListingRequest;
import com.marketforge.dto.request.UpdateListingRequest;
import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.ListingResponse;
import com.marketforge.entity.User;
import com.marketforge.service.ListingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ListingController {

    private final ListingService listingService;

    @GetMapping("/api/v1/listings")
    public ResponseEntity<ApiResponse<Page<ListingResponse>>> getListings(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Long minPrice,
            @RequestParam(required = false) Long maxPrice,
            @RequestParam(required = false) Integer deliveryDays,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "created_at") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                listingService.getPublicListings(category, minPrice, maxPrice, deliveryDays, minRating, search, sort, page, size)));
    }

    @GetMapping("/api/v1/listings/{slug}")
    public ResponseEntity<ApiResponse<ListingResponse>> getListing(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(listingService.getListingBySlug(slug)));
    }

    @GetMapping("/api/v1/seller/listings")
    public ResponseEntity<ApiResponse<Page<ListingResponse>>> getMyListings(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(listingService.getSellerListings(currentUser, page, size)));
    }

    @PostMapping("/api/v1/listings")
    public ResponseEntity<ApiResponse<ListingResponse>> createListing(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateListingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Listing created", listingService.createListing(currentUser, request)));
    }

    @PatchMapping("/api/v1/listings/{id}")
    public ResponseEntity<ApiResponse<ListingResponse>> updateListing(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id,
            @Valid @RequestBody UpdateListingRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Listing updated",
                listingService.updateListing(currentUser, id, request)));
    }

    @PostMapping("/api/v1/listings/{id}/pause")
    public ResponseEntity<ApiResponse<ListingResponse>> pauseListing(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Listing paused",
                listingService.toggleStatus(currentUser, id, false)));
    }

    @PostMapping("/api/v1/listings/{id}/activate")
    public ResponseEntity<ApiResponse<ListingResponse>> activateListing(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Listing activated",
                listingService.toggleStatus(currentUser, id, true)));
    }

    @DeleteMapping("/api/v1/listings/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteListing(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id) {
        listingService.deleteListing(currentUser, id);
        return ResponseEntity.ok(ApiResponse.<Void>builder().success(true).message("Listing deleted").build());
    }
}
