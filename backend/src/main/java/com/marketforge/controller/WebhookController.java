package com.marketforge.controller;

import com.marketforge.entity.Order;
import com.marketforge.repository.OrderRepository;
import com.marketforge.service.LedgerService;
import com.marketforge.service.NotificationService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * FIX #5: Stripe Webhook Controller with cryptographic signature verification.
 *
 * Every event arriving at /api/v1/webhooks/stripe is verified against the
 * STRIPE_WEBHOOK_SECRET before being processed. Requests that fail signature
 * verification are rejected with HTTP 400 — they are never acted upon.
 *
 * This prevents an attacker from faking payment success by posting crafted JSON.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final OrderRepository orderRepository;
    private final LedgerService ledgerService;
    private final NotificationService notificationService;

    @Value("${stripe.webhook-secret:whsec_placeholder}")
    private String webhookSecret;

    /**
     * Stripe sends the raw request body and a Stripe-Signature header.
     * We MUST read the raw body bytes and verify the HMAC before deserializing.
     */
    @PostMapping(value = "/stripe", consumes = "application/json")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {

        if (sigHeader == null || sigHeader.isBlank()) {
            log.warn("Stripe webhook received without Stripe-Signature header — rejected");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing signature header");
        }

        // If running in mock mode (placeholder secret), skip verification but still log.
        boolean isMock = webhookSecret == null || webhookSecret.isBlank() || webhookSecret.contains("placeholder");
        if (isMock) {
            log.warn("Stripe webhook signature verification SKIPPED (mock mode — set STRIPE_WEBHOOK_SECRET in production)");
            return ResponseEntity.ok("mock_ack");
        }

        // Cryptographic signature verification
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.error("Stripe webhook signature verification FAILED: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
        }

        log.info("Verified Stripe webhook event: {} ({})", event.getType(), event.getId());

        // Process events
        switch (event.getType()) {
            case "payment_intent.succeeded" -> handlePaymentIntentSucceeded(event);
            case "payment_intent.payment_failed" -> handlePaymentIntentFailed(event);
            case "payment_intent.canceled" -> handlePaymentIntentCanceled(event);
            default -> log.debug("Unhandled Stripe event type: {}", event.getType());
        }

        return ResponseEntity.ok("received");
    }

    private void handlePaymentIntentSucceeded(Event event) {
        try {
            PaymentIntent pi = (PaymentIntent) event.getDataObjectDeserializer()
                    .getObject().orElseThrow();
            String orderId = pi.getMetadata().get("order_id");
            if (orderId == null) return;

            Optional<Order> orderOpt = orderRepository.findById(Long.parseLong(orderId));
            if (orderOpt.isEmpty()) {
                log.warn("Webhook: payment_intent.succeeded for unknown order_id={}", orderId);
                return;
            }
            Order order = orderOpt.get();

            // Idempotency guard — only transition if still pending
            if (order.getStatus() == Order.OrderStatus.PENDING_PAYMENT
                    || order.getStatus() == Order.OrderStatus.AUTHORIZED) {
                order.setStatus(Order.OrderStatus.IN_PROGRESS);
                order.setStripePaymentIntentId(pi.getId());
                orderRepository.save(order);
                ledgerService.recordEscrowCapture(order);
                notificationService.send(order.getSeller(), "order", "Payment Confirmed",
                        "Payment confirmed for order #" + order.getOrderNumber() + ". You may begin work!",
                        "/orders/" + order.getId());
                log.info("Webhook: Order #{} moved to IN_PROGRESS via payment_intent.succeeded", order.getOrderNumber());
            }
        } catch (Exception e) {
            log.error("Error processing payment_intent.succeeded webhook", e);
        }
    }

    private void handlePaymentIntentFailed(Event event) {
        try {
            PaymentIntent pi = (PaymentIntent) event.getDataObjectDeserializer()
                    .getObject().orElseThrow();
            String orderId = pi.getMetadata().get("order_id");
            if (orderId == null) return;

            orderRepository.findById(Long.parseLong(orderId)).ifPresent(order -> {
                if (order.getStatus() == Order.OrderStatus.PENDING_PAYMENT
                        || order.getStatus() == Order.OrderStatus.AUTHORIZED) {
                    order.setStatus(Order.OrderStatus.CANCELLED);
                    orderRepository.save(order);
                    notificationService.send(order.getBuyer(), "order", "Payment Failed",
                            "Payment for order #" + order.getOrderNumber() + " failed. Please try again.",
                            "/orders/" + order.getId());
                    log.info("Webhook: Order #{} CANCELLED due to payment failure", order.getOrderNumber());
                }
            });
        } catch (Exception e) {
            log.error("Error processing payment_intent.payment_failed webhook", e);
        }
    }

    private void handlePaymentIntentCanceled(Event event) {
        try {
            PaymentIntent pi = (PaymentIntent) event.getDataObjectDeserializer()
                    .getObject().orElseThrow();
            String orderId = pi.getMetadata().get("order_id");
            if (orderId == null) return;

            orderRepository.findById(Long.parseLong(orderId)).ifPresent(order -> {
                if (order.getStatus() == Order.OrderStatus.PENDING_PAYMENT
                        || order.getStatus() == Order.OrderStatus.AUTHORIZED) {
                    order.setStatus(Order.OrderStatus.CANCELLED);
                    orderRepository.save(order);
                    log.info("Webhook: Order #{} CANCELLED due to payment_intent.canceled", order.getOrderNumber());
                }
            });
        } catch (Exception e) {
            log.error("Error processing payment_intent.canceled webhook", e);
        }
    }
}
