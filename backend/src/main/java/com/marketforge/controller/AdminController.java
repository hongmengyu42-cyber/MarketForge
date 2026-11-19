package com.marketforge.controller;

import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.PayoutRequestResponse;
import com.marketforge.entity.*;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.*;
import com.marketforge.service.EmailService;
import com.marketforge.service.NotificationService;
import com.marketforge.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ListingRepository listingRepository;
    private final DisputeRepository disputeRepository;
    private final FinancialLedgerAccountRepository ledgerAccountRepository;
    private final FinancialLedgerEntryRepository ledgerEntryRepository;
    private final CategoryRepository categoryRepository;
    private final EmailService emailService;
    private final OrderService orderService;
    private final NotificationService notificationService;
    private final PayoutRequestRepository payoutRequestRepository;

    @GetMapping("/dashboard/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        Map<String, Object> stats = new LinkedHashMap<>();

        stats.put("totalUsers", userRepository.count());
        stats.put("totalListings", listingRepository.count());
        stats.put("activeListings", listingRepository.countActive());
        stats.put("totalOrders", orderRepository.count());
        stats.put("activeOrders", orderRepository.countActiveOrders());
        stats.put("openDisputes", disputeRepository.countOpenDisputes());

        Long totalRevenue = orderRepository.sumCompletedOrdersRevenue();
        stats.put("totalRevenue", totalRevenue != null ? totalRevenue / 100.0 : 0);

        // Ledger account balances
        List<FinancialLedgerAccount> accounts = ledgerAccountRepository.findAll();
        List<Map<String, Object>> ledgerBalances = accounts.stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("code", a.getCode());
            m.put("name", a.getName());
            m.put("type", a.getType());
            m.put("balance", a.getBalance() / 100.0);
            return m;
        }).toList();
        stats.put("ledgerAccounts", ledgerBalances);

        // Recent ledger entries
        Page<FinancialLedgerEntry> recentEntries = ledgerEntryRepository.findRecentEntries(PageRequest.of(0, 10));
        stats.put("recentLedgerEntries", recentEntries.getContent().stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.getId());
            m.put("accountCode", e.getAccount().getCode());
            m.put("entryType", e.getEntryType());
            m.put("amount", e.getAmount() / 100.0);
            m.put("description", e.getDescription());
            m.put("createdAt", e.getCreatedAt());
            return m;
        }).toList());

        // Category breakdown
        List<Category> categories = categoryRepository.findAll();
        stats.put("categoriesBreakdown", categories.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", c.getName());
            m.put("listingCount", c.getListingCount());
            return m;
        }).toList());

        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Page<User>>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isAdmin,
            @RequestParam(required = false) Boolean flagged,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                userRepository.findUsersWithFilters(search, isAdmin, flagged, PageRequest.of(page, size, Sort.by("createdAt").descending()))));
    }

    @PostMapping("/users/{id}/toggle-role")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleRole(
            @AuthenticationPrincipal User admin, @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        String role = body.getOrDefault("role", "seller");

        if ("admin".equals(role)) {
            user.setIsAdmin(!Boolean.TRUE.equals(user.getIsAdmin()));
        } else if ("seller".equals(role)) {
            if (user.getSellerProfile() == null) {
                SellerProfile sp = SellerProfile.builder()
                        .user(user).onboardingStatus("active").build();
                user.setSellerProfile(sp);
            } else {
                String current = user.getSellerProfile().getOnboardingStatus();
                user.getSellerProfile().setOnboardingStatus("active".equals(current) ? "pending" : "active");
            }
        }

        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Role toggled",
                Map.of("id", user.getId(), "isAdmin", user.getIsAdmin(),
                        "isSeller", user.isSeller())));
    }

    @GetMapping("/listings")
    public ResponseEntity<ApiResponse<Page<Listing>>> getListings(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                listingRepository.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))));
    }

    @PostMapping("/listings/{id}/moderate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> moderateListing(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Listing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Listing", id));

        String action = body.getOrDefault("action", "approve");
        switch (action) {
            case "approve" -> listing.setStatus(Listing.ListingStatus.ACTIVE);
            case "reject", "suspend" -> listing.setStatus(Listing.ListingStatus.ARCHIVED);
            case "request_changes" -> listing.setStatus(Listing.ListingStatus.DRAFT);
        }
        listingRepository.save(listing);

        return ResponseEntity.ok(ApiResponse.success("Listing moderated",
                Map.of("id", listing.getId(), "status", listing.getStatus())));
    }

    @GetMapping("/emails")
    public ResponseEntity<ApiResponse<Page<com.marketforge.dto.response.EmailLogDto>>> getEmailLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                emailService.getEmailLogs(PageRequest.of(page, size))));
    }

    // ─────────────────────────────────────────────────────────────────
    // PHASE 2 — ADMIN ORDER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<Order>>> getOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        org.springframework.data.domain.Pageable pageable =
                org.springframework.data.domain.PageRequest.of(page, size,
                        Sort.by("createdAt").descending());

        org.springframework.data.domain.Page<Order> orders;
        if (status != null && !status.isBlank()) {
            try {
                Order.OrderStatus orderStatus = Order.OrderStatus.valueOf(status.toUpperCase());
                orders = orderRepository.findByStatus(orderStatus, pageable);
            } catch (IllegalArgumentException e) {
                orders = orderRepository.findAll(pageable);
            }
        } else {
            orders = orderRepository.findAll(pageable);
        }

        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<ApiResponse<Order>> getOrder(@PathVariable Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id));
        return ResponseEntity.ok(ApiResponse.success(order));
    }

    @PostMapping("/orders/{id}/action")
    public ResponseEntity<ApiResponse<Map<String, Object>>> adminOrderAction(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id));

        String action = body.getOrDefault("action", "");
        String reason = body.getOrDefault("reason", "Admin action");

        switch (action) {
            case "cancel" -> {
                order.setStatus(Order.OrderStatus.CANCELLED);
                orderRepository.save(order);
                notificationService.send(order.getBuyer(), "order", "Order Cancelled by Admin",
                        "Order #" + order.getOrderNumber() + " was cancelled by an administrator. Reason: " + reason,
                        "/orders/" + order.getId());
                notificationService.send(order.getSeller(), "order", "Order Cancelled by Admin",
                        "Order #" + order.getOrderNumber() + " was cancelled. Reason: " + reason,
                        "/orders/" + order.getId());
            }
            case "complete" -> {
                order.setStatus(Order.OrderStatus.RELEASED);
                orderRepository.save(order);
            }
            case "force_refund" -> {
                order.setStatus(Order.OrderStatus.REFUNDED);
                orderRepository.save(order);
                notificationService.send(order.getBuyer(), "payment", "Refund Initiated",
                        "A refund has been initiated for order #" + order.getOrderNumber() + ".",
                        "/orders/" + order.getId());
            }
            default -> throw new com.marketforge.exception.BusinessException(
                    "UNKNOWN_ACTION", "Unknown admin action: " + action);
        }

        return ResponseEntity.ok(ApiResponse.success("Action '" + action + "' applied to order #" + order.getOrderNumber(),
                Map.of("orderId", order.getId(), "newStatus", order.getStatus())));
    }

    @GetMapping("/orders/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOrderStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", orderRepository.count());
        stats.put("active", orderRepository.countActiveOrders());
        stats.put("completed", orderRepository.countByStatus(Order.OrderStatus.RELEASED));
        stats.put("cancelled", orderRepository.countByStatus(Order.OrderStatus.CANCELLED));
        stats.put("disputed", orderRepository.countByStatus(Order.OrderStatus.DISPUTED));
        Long revenue = orderRepository.sumCompletedOrdersRevenue();
        stats.put("totalRevenue", revenue != null ? revenue / 100.0 : 0.0);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }


    @GetMapping("/payouts")
    public ResponseEntity<ApiResponse<List<PayoutRequestResponse>>> getPayouts() {
        List<PayoutRequest> requests = payoutRequestRepository.findAll(Sort.by("createdAt").descending());
        List<PayoutRequestResponse> responses = requests.stream()
                .map(PayoutRequestResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @PostMapping("/payouts/{id}/action")
    public ResponseEntity<ApiResponse<PayoutRequestResponse>> payoutAction(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        PayoutRequest payout = payoutRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PayoutRequest", id));

        String action = body.getOrDefault("action", "approve");
        String notes = body.get("notes");

        if ("approve".equalsIgnoreCase(action)) {
            payout.setStatus("COMPLETED");
            payout.setProcessedAt(LocalDateTime.now());
            if (notes != null) payout.setNotes(notes);
            payoutRequestRepository.save(payout);

            notificationService.send(payout.getUser(), "wallet", "Payout Approved",
                    "Your payout request for $" + String.format("%.2f", payout.getAmount() / 100.0) + " has been approved and disbursed.",
                    "/wallet");
        } else if ("reject".equalsIgnoreCase(action)) {
            payout.setStatus("REJECTED");
            payout.setProcessedAt(LocalDateTime.now());
            if (notes != null) payout.setNotes(notes);
            payoutRequestRepository.save(payout);

            notificationService.send(payout.getUser(), "wallet", "Payout Rejected",
                    "Your payout request for $" + String.format("%.2f", payout.getAmount() / 100.0) + " was rejected" +
                            (notes != null && !notes.isBlank() ? ": " + notes : "."),
                    "/wallet");
        } else {
            throw new com.marketforge.exception.BusinessException("UNKNOWN_ACTION", "Unknown payout action: " + action);
        }

        return ResponseEntity.ok(ApiResponse.success("Payout " + payout.getStatus(), PayoutRequestResponse.from(payout)));
    }

    @GetMapping("/analytics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPlatformAnalytics() {
        Map<String, Object> response = new LinkedHashMap<>();

        long totalUsers = userRepository.count();
        long totalOrders = orderRepository.count();
        long activeOrders = orderRepository.countActiveOrders();
        long completedOrders = orderRepository.countByStatus(Order.OrderStatus.RELEASED);
        long disputedOrders = orderRepository.countByStatus(Order.OrderStatus.DISPUTED);
        Long gmvCents = orderRepository.sumCompletedOrdersRevenue();
        double gmv = gmvCents != null ? gmvCents / 100.0 : 0.0;
        double netRevenue = gmv * 0.10;

        LocalDateTime now = LocalDateTime.now();
        java.time.format.DateTimeFormatter monthFmt = java.time.format.DateTimeFormatter.ofPattern("MMM yyyy");

        Map<String, Double> monthlyGmvMap = new LinkedHashMap<>();
        Map<String, Integer> monthlyOrderCountMap = new LinkedHashMap<>();
        Map<String, Integer> monthlyUsersMap = new LinkedHashMap<>();

        for (int i = 5; i >= 0; i--) {
            String mKey = now.minusMonths(i).format(monthFmt);
            monthlyGmvMap.put(mKey, 0.0);
            monthlyOrderCountMap.put(mKey, 0);
            monthlyUsersMap.put(mKey, 0);
        }

        Page<Order> allOrders = orderRepository.findAll(PageRequest.of(0, 500, Sort.by("createdAt").descending()));
        for (Order o : allOrders.getContent()) {
            if (o.getCreatedAt() != null) {
                String mKey = o.getCreatedAt().format(monthFmt);
                if (monthlyGmvMap.containsKey(mKey)) {
                    if (o.getStatus() == Order.OrderStatus.RELEASED || o.getStatus() == Order.OrderStatus.CONFIRMED || o.getStatus() == Order.OrderStatus.PAID_OUT) {
                        monthlyGmvMap.put(mKey, monthlyGmvMap.get(mKey) + (o.getAmountTotal() != null ? o.getAmountTotal() / 100.0 : 0.0));
                    }
                    monthlyOrderCountMap.put(mKey, monthlyOrderCountMap.get(mKey) + 1);
                }
            }
        }

        List<User> recentUsers = userRepository.findAll(Sort.by("createdAt").descending());
        for (User u : recentUsers) {
            if (u.getCreatedAt() != null) {
                String mKey = u.getCreatedAt().format(monthFmt);
                if (monthlyUsersMap.containsKey(mKey)) {
                    monthlyUsersMap.put(mKey, monthlyUsersMap.get(mKey) + 1);
                }
            }
        }

        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        for (String mKey : monthlyGmvMap.keySet()) {
            Map<String, Object> item = new LinkedHashMap<>();
            double mGmv = monthlyGmvMap.get(mKey);
            item.put("month", mKey);
            item.put("gmv", Math.round(mGmv * 100.0) / 100.0);
            item.put("revenue", Math.round((mGmv * 0.10) * 100.0) / 100.0);
            item.put("orderCount", monthlyOrderCountMap.get(mKey));
            item.put("newUsers", monthlyUsersMap.get(mKey));
            monthlyTrend.add(item);
        }

        response.put("totalUsers", totalUsers);
        response.put("totalOrders", totalOrders);
        response.put("activeOrders", activeOrders);
        response.put("completedOrders", completedOrders);
        response.put("disputedOrders", disputedOrders);
        response.put("gmv", Math.round(gmv * 100.0) / 100.0);
        response.put("netRevenue", Math.round(netRevenue * 100.0) / 100.0);
        response.put("completionRate", totalOrders > 0 ? Math.round(((double) completedOrders / totalOrders * 100.0) * 10.0) / 10.0 : 100.0);
        response.put("disputeRate", totalOrders > 0 ? Math.round(((double) disputedOrders / totalOrders * 100.0) * 10.0) / 10.0 : 0.0);
        response.put("monthlyTrend", monthlyTrend);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

}
