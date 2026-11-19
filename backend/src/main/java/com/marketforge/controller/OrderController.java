package com.marketforge.controller;

import com.marketforge.dto.request.*;
import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.OrderResponse;
import com.marketforge.entity.User;
import com.marketforge.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> getOrders(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "buyer") String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrders(currentUser, role, page, size)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Order created", orderService.createOrder(currentUser, request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrder(currentUser, id)));
    }

    @PostMapping("/{id}/requirements")
    public ResponseEntity<ApiResponse<OrderResponse>> submitRequirements(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id,
            @Valid @RequestBody SubmitRequirementsRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Requirements submitted successfully",
                orderService.submitRequirements(currentUser, id, request)));
    }

    @PostMapping("/{id}/deliver")
    public ResponseEntity<ApiResponse<OrderResponse>> deliverOrder(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id,
            @RequestBody DeliverOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Work delivered successfully",
                orderService.deliverOrder(currentUser, id, request)));
    }

    @PostMapping("/{id}/revision")
    public ResponseEntity<ApiResponse<OrderResponse>> requestRevision(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id,
            @Valid @RequestBody RequestRevisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Revision requested",
                orderService.requestRevision(currentUser, id, request)));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<OrderResponse>> confirmDelivery(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Delivery approved and escrow funds released",
                orderService.confirmDelivery(currentUser, id)));
    }

    @PostMapping("/{id}/milestones")
    public ResponseEntity<ApiResponse<OrderResponse>> addMilestone(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id,
            @Valid @RequestBody CreateMilestoneRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Milestone created",
                orderService.addMilestone(currentUser, id, request)));
    }

    @PostMapping("/{id}/milestones/{milestoneId}/deliver")
    public ResponseEntity<ApiResponse<OrderResponse>> deliverMilestone(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id,
            @PathVariable Long milestoneId,
            @RequestBody DeliverOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Milestone deliverable submitted",
                orderService.deliverMilestone(currentUser, id, milestoneId, request)));
    }

    @PostMapping("/{id}/milestones/{milestoneId}/revision")
    public ResponseEntity<ApiResponse<OrderResponse>> requestMilestoneRevision(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id,
            @PathVariable Long milestoneId,
            @Valid @RequestBody RequestRevisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Milestone revision requested",
                orderService.requestMilestoneRevision(currentUser, id, milestoneId, request)));
    }

    @PostMapping("/{id}/milestones/{milestoneId}/approve")
    public ResponseEntity<ApiResponse<OrderResponse>> approveMilestone(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id,
            @PathVariable Long milestoneId) {
        return ResponseEntity.ok(ApiResponse.success("Milestone approved",
                orderService.approveMilestone(currentUser, id, milestoneId)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Order cancelled",
                orderService.cancelOrder(currentUser, id)));
    }
}
