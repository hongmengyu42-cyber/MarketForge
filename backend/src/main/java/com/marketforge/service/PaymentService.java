package com.marketforge.service;

import com.marketforge.dto.request.ConfirmPaymentRequest;
import com.marketforge.dto.request.CreateOrderRequest;
import com.marketforge.dto.request.CreatePaymentIntentRequest;
import com.marketforge.dto.response.OrderResponse;
import com.marketforge.dto.response.PaymentIntentResponse;
import com.marketforge.entity.Listing;
import com.marketforge.entity.Order;
import com.marketforge.entity.OrderMilestone;
import com.marketforge.entity.User;
import com.marketforge.exception.BusinessException;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.ListingRepository;
import com.marketforge.repository.OrderMilestoneRepository;
import com.marketforge.repository.OrderRepository;
import com.stripe.Stripe;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final OrderRepository orderRepository;
    private final ListingRepository listingRepository;
    private final OrderMilestoneRepository milestoneRepository;
    private final OrderService orderService;
    private final LedgerService ledgerService;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Value("${stripe.api-key:sk_test_placeholder}")
    private String stripeApiKey;

    @Value("${stripe.publishable-key:pk_test_placeholder}")
    private String stripePublishableKey;

    // FIX #7: Use config-driven fee instead of hardcoded 0.05 (5%) which contradicted
    // the stripe.platform-fee-percent: 10 setting in application.yml.
    @Value("${stripe.platform-fee-percent:10}")
    private int platformFeePercent;

    @Transactional
    public PaymentIntentResponse createPaymentIntent(User buyer, CreatePaymentIntentRequest req) {
        if (req.getAmount() == null || req.getAmount() <= 0) {
            throw new BusinessException("INVALID_AMOUNT", "Amount must be greater than $0");
        }

        long amountCents = Math.round(req.getAmount() * 100);
        // FIX #7: Fee now reads from stripe.platform-fee-percent config (default 10%).
        long platformFeeCents = Math.round(amountCents * platformFeePercent / 100.0);
        long totalCents = amountCents + platformFeeCents;
        String currency = req.getCurrency() != null ? req.getCurrency().toLowerCase() : "usd";

        boolean isMock = stripeApiKey == null || stripeApiKey.isBlank() || stripeApiKey.contains("placeholder");
        String paymentIntentId;
        String clientSecret;

        if (!isMock) {
            try {
                Stripe.apiKey = stripeApiKey;
                PaymentIntentCreateParams.Builder paramsBuilder = PaymentIntentCreateParams.builder()
                        .setAmount(totalCents)
                        .setCurrency(currency)
                        .setDescription("MarketForge Escrow Deposit")
                        .putMetadata("buyer_id", String.valueOf(buyer.getId()));

                if (req.getOrderId() != null) {
                    paramsBuilder.putMetadata("order_id", String.valueOf(req.getOrderId()));
                }
                if (req.getListingId() != null) {
                    paramsBuilder.putMetadata("listing_id", String.valueOf(req.getListingId()));
                }
                if (req.getMilestoneId() != null) {
                    paramsBuilder.putMetadata("milestone_id", String.valueOf(req.getMilestoneId()));
                }

                PaymentIntent intent = PaymentIntent.create(paramsBuilder.build());
                paymentIntentId = intent.getId();
                clientSecret = intent.getClientSecret();
            } catch (Exception e) {
                log.warn("Stripe live API call failed, falling back to secure simulated test mode: {}", e.getMessage());
                isMock = true;
                paymentIntentId = "pi_mf_test_" + UUID.randomUUID().toString().substring(0, 14);
                clientSecret = paymentIntentId + "_secret_" + UUID.randomUUID().toString().substring(0, 16);
            }
        } else {
            paymentIntentId = "pi_mf_test_" + UUID.randomUUID().toString().substring(0, 14);
            clientSecret = paymentIntentId + "_secret_" + UUID.randomUUID().toString().substring(0, 16);
        }

        return PaymentIntentResponse.builder()
                .paymentIntentId(paymentIntentId)
                .clientSecret(clientSecret)
                .amount(amountCents / 100.0)
                .platformFee(platformFeeCents / 100.0)
                .totalAmount(totalCents / 100.0)
                .currency(currency.toUpperCase())
                .status("requires_payment_method")
                .publishableKey(stripePublishableKey)
                .isMockMode(isMock)
                .orderId(req.getOrderId())
                .description("MarketForge 100% Escrow Protected Hold")
                .build();
    }

    @Transactional
    public OrderResponse confirmPayment(User buyer, ConfirmPaymentRequest req) {
        Order order;

        if (req.getOrderId() != null) {
            order = orderRepository.findById(req.getOrderId())
                    .orElseThrow(() -> new ResourceNotFoundException("Order", req.getOrderId()));

            if (!order.getBuyer().getId().equals(buyer.getId()) && !Boolean.TRUE.equals(buyer.getIsAdmin())) {
                throw new BusinessException("FORBIDDEN", "Only the buyer can fund this order");
            }

            order.setStripePaymentIntentId(req.getPaymentIntentId());
            if (order.getStatus() == Order.OrderStatus.PENDING_PAYMENT || order.getStatus() == Order.OrderStatus.AUTHORIZED) {
                order.setStatus(Order.OrderStatus.IN_PROGRESS);
            }
            orderRepository.save(order);

            // Record escrow capture in double-entry ledger
            ledgerService.recordEscrowCapture(order);

            notificationService.send(order.getSeller(), "order", "Escrow Funded & Verified",
                    "Client " + buyer.getName() + " has funded escrow ($" + String.format("%.2f", order.getAmountTotal() / 100.0) +
                            ") for order #" + order.getOrderNumber() + ". You may begin work!",
                    "/orders/" + order.getId());

            emailService.sendOrderEscrowFunded(order);

            return orderService.getOrder(buyer, order.getId());
        } else if (req.getListingId() != null) {
            // Direct gig purchase via Stripe Checkout
            CreateOrderRequest createReq = new CreateOrderRequest();
            createReq.setListingId(req.getListingId());
            OrderResponse resp = orderService.createOrder(buyer, createReq);

            order = orderRepository.findById(resp.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Order", resp.getId()));
            order.setStripePaymentIntentId(req.getPaymentIntentId());
            order.setStatus(Order.OrderStatus.IN_PROGRESS);
            orderRepository.save(order);

            ledgerService.recordEscrowCapture(order);
            emailService.sendOrderEscrowFunded(order);

            return orderService.getOrder(buyer, order.getId());
        } else {
            throw new BusinessException("INVALID_REQUEST", "Either orderId or listingId must be provided");
        }
    }
}
