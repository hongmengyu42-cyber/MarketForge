package com.marketforge.controller;

import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.ListingResponse;
import com.marketforge.entity.Listing;
import com.marketforge.entity.Order;
import com.marketforge.entity.SellerProfile;
import com.marketforge.entity.User;
import com.marketforge.exception.BusinessException;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.ListingRepository;
import com.marketforge.repository.OrderMilestoneRepository;
import com.marketforge.repository.OrderRepository;
import com.marketforge.repository.SellerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class SellerController {

    private final SellerProfileRepository sellerProfileRepository;
    private final ListingRepository listingRepository;
    private final OrderRepository orderRepository;
    private final OrderMilestoneRepository milestoneRepository;

    @GetMapping("/api/v1/seller/profile")
    public ResponseEntity<ApiResponse<SellerProfile>> getProfile(@AuthenticationPrincipal User currentUser) {
        SellerProfile sp = sellerProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new BusinessException("You do not have a seller profile"));
        return ResponseEntity.ok(ApiResponse.success(sp));
    }

    @GetMapping({"/api/v1/sellers/{id}", "/api/v1/seller/{id}"})
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPublicSellerProfile(@PathVariable Long id) {
        SellerProfile sp = sellerProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Seller", id));
        List<Listing> listings = listingRepository.findBySellerProfileIdAndStatus(id, Listing.ListingStatus.ACTIVE);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", sp.getId());
        data.put("userId", sp.getUser() != null ? sp.getUser().getId() : null);
        data.put("name", sp.getUser() != null ? sp.getUser().getName() : sp.getDisplayName());
        data.put("displayName", sp.getDisplayName() != null ? sp.getDisplayName() : (sp.getUser() != null ? sp.getUser().getName() : "Freelancer"));
        data.put("bio", sp.getBio());
        data.put("avatarUrl", sp.getAvatarUrl());
        data.put("averageRating", sp.getAverageRating() != null ? sp.getAverageRating() : 5.0);
        data.put("reviewCount", sp.getReviewCount());
        data.put("completedOrdersCount", sp.getCompletedOrdersCount());
        data.put("hourlyRate", sp.getHourlyRate() != null ? sp.getHourlyRate() / 100.0 : null);
        data.put("createdAt", sp.getCreatedAt());
        data.put("listings", listings.stream().map(ListingResponse::fromPublic).toList());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/api/v1/seller/onboard")
    public ResponseEntity<ApiResponse<SellerProfile>> onboard(@AuthenticationPrincipal User currentUser) {
        if (sellerProfileRepository.existsByUserId(currentUser.getId()))
            throw new BusinessException("ALREADY_SELLER", "You already have a seller profile");

        SellerProfile sp = SellerProfile.builder()
                .user(currentUser)
                .onboardingStatus("active")
                .displayName(currentUser.getName())
                .build();
        sp = sellerProfileRepository.save(sp);
        return ResponseEntity.ok(ApiResponse.success("Seller profile created", sp));
    }

    @GetMapping("/api/v1/seller/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboard(@AuthenticationPrincipal User currentUser) {
        SellerProfile sp = sellerProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new BusinessException("You do not have a seller profile"));
        Map<String, Object> dashboard = Map.of(
                "displayName", sp.getDisplayName() != null ? sp.getDisplayName() : currentUser.getName(),
                "onboardingStatus", sp.getOnboardingStatus(),
                "averageRating", sp.getAverageRating() != null ? sp.getAverageRating() : 0,
                "reviewCount", sp.getReviewCount(),
                "completedOrders", sp.getCompletedOrdersCount()
        );
        return ResponseEntity.ok(ApiResponse.success(dashboard));
    }

    @GetMapping("/api/v1/seller/analytics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSellerAnalytics(@AuthenticationPrincipal User currentUser) {
        SellerProfile sp = sellerProfileRepository.findByUserId(currentUser.getId()).orElse(null);
        Long sellerId = currentUser.getId();

        Long earnedCents = orderRepository.sumEarnedBySellerId(sellerId);
        Long activeMilestonesCents = milestoneRepository.sumApprovedMilestonesPayoutForActiveOrders(sellerId);
        Long escrowCents = orderRepository.sumEscrowBySellerId(sellerId);

        long totalEarnedCents = (earnedCents != null ? earnedCents : 0) + (activeMilestonesCents != null ? activeMilestonesCents : 0);
        long inEscrowCents = escrowCents != null ? escrowCents : 0;

        Pageable pageable = PageRequest.of(0, 100, Sort.by("createdAt").descending());
        Page<Order> ordersPage = orderRepository.findBySellerId(sellerId, pageable);
        List<Order> orders = ordersPage.getContent();

        long completedCount = 0;
        long activeCount = 0;
        long cancelledCount = 0;
        long disputedCount = 0;

        Map<String, Double> monthlyEarningsMap = new LinkedHashMap<>();
        Map<String, Integer> monthlyOrdersMap = new LinkedHashMap<>();

        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("MMM yyyy");
        for (int i = 5; i >= 0; i--) {
            String mKey = now.minusMonths(i).format(monthFmt);
            monthlyEarningsMap.put(mKey, 0.0);
            monthlyOrdersMap.put(mKey, 0);
        }

        for (Order o : orders) {
            Order.OrderStatus st = o.getStatus();
            if (st == Order.OrderStatus.RELEASED || st == Order.OrderStatus.CONFIRMED || st == Order.OrderStatus.PAID_OUT) {
                completedCount++;
                if (o.getCreatedAt() != null) {
                    String mKey = o.getCreatedAt().format(monthFmt);
                    if (monthlyEarningsMap.containsKey(mKey)) {
                        double current = monthlyEarningsMap.get(mKey);
                        monthlyEarningsMap.put(mKey, current + (o.getSellerPayoutAmount() != null ? o.getSellerPayoutAmount() / 100.0 : 0.0));
                    }
                }
            } else if (st == Order.OrderStatus.IN_PROGRESS || st == Order.OrderStatus.DELIVERED || st == Order.OrderStatus.REVISION_REQUESTED || st == Order.OrderStatus.AUTHORIZED) {
                activeCount++;
            } else if (st == Order.OrderStatus.CANCELLED || st == Order.OrderStatus.FAILED) {
                cancelledCount++;
            } else if (st == Order.OrderStatus.DISPUTED) {
                disputedCount++;
            }

            if (o.getCreatedAt() != null) {
                String mKey = o.getCreatedAt().format(monthFmt);
                if (monthlyOrdersMap.containsKey(mKey)) {
                    monthlyOrdersMap.put(mKey, monthlyOrdersMap.get(mKey) + 1);
                }
            }
        }

        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        for (String mKey : monthlyEarningsMap.keySet()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("month", mKey);
            item.put("earnings", Math.round(monthlyEarningsMap.get(mKey) * 100.0) / 100.0);
            item.put("orderCount", monthlyOrdersMap.get(mKey));
            monthlyTrend.add(item);
        }

        long totalOrders = orders.size();
        double completionRate = totalOrders > 0 ? (double) completedCount / totalOrders * 100.0 : 100.0;
        double avgOrderValue = completedCount > 0 ? (double) totalEarnedCents / completedCount / 100.0 : 0.0;

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalEarnings", totalEarnedCents / 100.0);
        response.put("inEscrow", inEscrowCents / 100.0);
        response.put("completedOrders", completedCount);
        response.put("activeOrders", activeCount);
        response.put("cancelledOrders", cancelledCount);
        response.put("disputedOrders", disputedCount);
        response.put("totalOrders", totalOrders);
        response.put("completionRate", Math.round(completionRate * 10.0) / 10.0);
        response.put("averageOrderValue", Math.round(avgOrderValue * 100.0) / 100.0);
        response.put("rating", sp != null && sp.getAverageRating() != null ? sp.getAverageRating() : 5.0);
        response.put("reviewCount", sp != null && sp.getReviewCount() != null ? sp.getReviewCount() : 0);
        response.put("monthlyTrend", monthlyTrend);

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
