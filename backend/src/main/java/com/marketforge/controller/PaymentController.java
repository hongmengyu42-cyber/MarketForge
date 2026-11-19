package com.marketforge.controller;

import com.marketforge.dto.request.ConfirmPaymentRequest;
import com.marketforge.dto.request.CreatePaymentIntentRequest;
import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.OrderResponse;
import com.marketforge.dto.response.PaymentIntentResponse;
import com.marketforge.entity.User;
import com.marketforge.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/create-intent")
    public ResponseEntity<ApiResponse<PaymentIntentResponse>> createPaymentIntent(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreatePaymentIntentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Payment intent initialized",
                paymentService.createPaymentIntent(currentUser, request)));
    }

    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse<OrderResponse>> confirmPayment(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ConfirmPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Escrow payment verified & captured",
                paymentService.confirmPayment(currentUser, request)));
    }
}
