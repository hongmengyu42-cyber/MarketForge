package com.marketforge.controller;

import com.marketforge.dto.request.*;
import com.marketforge.dto.response.*;
import com.marketforge.entity.User;
import com.marketforge.service.DisputeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class DisputeController {

    private final DisputeService disputeService;

    @PostMapping("/api/v1/disputes")
    public ResponseEntity<ApiResponse<DisputeResponse>> createDispute(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateDisputeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Dispute raised", disputeService.createDispute(currentUser, request)));
    }

    @GetMapping("/api/v1/disputes/{id}")
    public ResponseEntity<ApiResponse<DisputeResponse>> getDispute(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(disputeService.getDispute(currentUser, id)));
    }

    @GetMapping("/api/v1/disputes/order/{orderId}")
    public ResponseEntity<ApiResponse<DisputeResponse>> getDisputeByOrderId(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success(disputeService.getDisputeByOrderId(currentUser, orderId)));
    }

    @PostMapping("/api/v1/disputes/{id}/messages")
    public ResponseEntity<ApiResponse<DisputeMessageDto>> postMessage(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id,
            @Valid @RequestBody PostDisputeMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Message posted", disputeService.postMessage(currentUser, id, request)));
    }

    @PostMapping("/api/v1/disputes/{id}/offers")
    public ResponseEntity<ApiResponse<DisputeSettlementOfferDto>> createSettlementOffer(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id,
            @Valid @RequestBody CreateSettlementOfferRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Settlement offer proposed", disputeService.createSettlementOffer(currentUser, id, request)));
    }

    @PostMapping("/api/v1/disputes/{id}/offers/{offerId}/respond")
    public ResponseEntity<ApiResponse<DisputeResponse>> respondToSettlementOffer(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id,
            @PathVariable Long offerId,
            @Valid @RequestBody RespondSettlementOfferRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Response recorded",
                disputeService.respondToSettlementOffer(currentUser, id, offerId, request)));
    }

    // Admin endpoints
    @GetMapping("/api/v1/admin/disputes")
    public ResponseEntity<ApiResponse<Page<DisputeResponse>>> getDisputes(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(disputeService.getDisputes(status, page, size)));
    }

    @GetMapping("/api/v1/admin/disputes/{id}")
    public ResponseEntity<ApiResponse<DisputeResponse>> getAdminDispute(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(disputeService.getDispute(admin, id)));
    }

    @PutMapping("/api/v1/admin/disputes/{id}/status")
    public ResponseEntity<ApiResponse<DisputeResponse>> updateDisputeStatus(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success("Status updated",
                disputeService.updateStatus(admin, id, body.get("status"))));
    }

    @PostMapping("/api/v1/admin/disputes/{id}/resolve")
    public ResponseEntity<ApiResponse<DisputeResponse>> resolveDispute(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id,
            @Valid @RequestBody ResolveDisputeRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Dispute resolved",
                disputeService.resolveDispute(admin, id, request)));
    }
}
