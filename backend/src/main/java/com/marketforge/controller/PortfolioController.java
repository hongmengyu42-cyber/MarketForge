package com.marketforge.controller;

import com.marketforge.dto.request.PortfolioItemRequest;
import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.PortfolioItemResponse;
import com.marketforge.entity.User;
import com.marketforge.service.PortfolioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<PortfolioItemResponse>>> getMyPortfolio(
            @AuthenticationPrincipal User user) {
        List<PortfolioItemResponse> items = portfolioService.getPortfolioForUser(user.getId());
        return ResponseEntity.ok(ApiResponse.success(items));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<List<PortfolioItemResponse>>> getUserPortfolio(
            @PathVariable Long userId) {
        List<PortfolioItemResponse> items = portfolioService.getPortfolioForUser(userId);
        return ResponseEntity.ok(ApiResponse.success(items));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PortfolioItemResponse>> createPortfolioItem(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PortfolioItemRequest request) {
        PortfolioItemResponse item = portfolioService.createPortfolioItem(user, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Portfolio project published successfully", item));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PortfolioItemResponse>> updatePortfolioItem(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody PortfolioItemRequest request) {
        PortfolioItemResponse item = portfolioService.updatePortfolioItem(user, id, request);
        return ResponseEntity.ok(ApiResponse.success("Portfolio project updated successfully", item));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePortfolioItem(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        portfolioService.deletePortfolioItem(user, id);
        return ResponseEntity.ok(ApiResponse.success("Portfolio item deleted successfully", null));
    }
}
