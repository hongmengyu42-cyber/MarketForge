package com.marketforge.controller;

import com.marketforge.dto.request.CreatePayoutRequest;
import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.InvoiceResponse;
import com.marketforge.dto.response.WalletResponse;
import com.marketforge.entity.User;
import com.marketforge.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    public ResponseEntity<ApiResponse<WalletResponse>> getWallet(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ApiResponse.success(walletService.getWallet(currentUser)));
    }

    @PostMapping("/payout")
    public ResponseEntity<ApiResponse<WalletResponse>> requestPayout(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreatePayoutRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Payout processed successfully",
                walletService.requestPayout(currentUser, request)));
    }

    @PostMapping("/connect-stripe")
    public ResponseEntity<ApiResponse<WalletResponse>> connectStripe(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) String accountId) {
        return ResponseEntity.ok(ApiResponse.success("Stripe account connected",
                walletService.connectStripe(currentUser, accountId)));
    }

    @PostMapping("/stripe-connect-link")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getStripeConnectLink(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ApiResponse.success(walletService.createStripeConnectAccountLink(currentUser)));
    }

    @GetMapping("/invoices/{orderId}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoice(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success(walletService.getOrderInvoice(currentUser, orderId)));
    }
}
