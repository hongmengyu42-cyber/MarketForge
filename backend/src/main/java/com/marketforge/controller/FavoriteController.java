package com.marketforge.controller;

import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.ListingResponse;
import com.marketforge.entity.User;
import com.marketforge.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ListingResponse>>> getFavorites(
            @AuthenticationPrincipal User user) {
        List<ListingResponse> favorites = favoriteService.getFavoriteListings(user);
        return ResponseEntity.ok(ApiResponse.success(favorites));
    }

    @GetMapping("/ids")
    public ResponseEntity<ApiResponse<List<Long>>> getFavoriteIds(
            @AuthenticationPrincipal User user) {
        List<Long> ids = favoriteService.getFavoriteListingIds(user);
        return ResponseEntity.ok(ApiResponse.success(ids));
    }

    @PostMapping("/{listingId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleFavorite(
            @AuthenticationPrincipal User user,
            @PathVariable Long listingId) {
        boolean isFavorited = favoriteService.toggleFavorite(user, listingId);
        String msg = isFavorited ? "Saved to your favorites" : "Removed from favorites";
        return ResponseEntity.ok(ApiResponse.success(msg, Map.of("favorited", isFavorited, "listingId", listingId)));
    }

    @DeleteMapping("/{listingId}")
    public ResponseEntity<ApiResponse<Void>> removeFavorite(
            @AuthenticationPrincipal User user,
            @PathVariable Long listingId) {
        favoriteService.removeFavorite(user, listingId);
        return ResponseEntity.ok(ApiResponse.success("Removed from favorites", null));
    }
}
