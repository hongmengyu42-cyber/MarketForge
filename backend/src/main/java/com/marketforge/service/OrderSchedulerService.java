package com.marketforge.service;

import com.marketforge.entity.Order;
import com.marketforge.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Phase 2 — Feature C: Order Auto-Release Scheduler.
 *
 * The Order entity has an `autoReleaseAt` field set when a freelancer delivers work.
 * If the client neither approves nor requests revisions within that window (default 3 days),
 * the order auto-completes: funds are released to the freelancer automatically.
 *
 * This scheduler runs every 5 minutes and processes any overdue orders.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderSchedulerService {

    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final LedgerService ledgerService;
    private final NotificationService notificationService;
    private final EmailService emailService;

    /**
     * Auto-release DELIVERED orders where autoReleaseAt has passed.
     * Runs every 5 minutes.
     */
    @Scheduled(fixedDelay = 300_000) // 5 minutes
    @Transactional
    public void autoReleaseExpiredDeliveries() {
        List<Order> expiredOrders = orderRepository.findDeliveredOrdersReadyForAutoRelease(
                LocalDateTime.now());

        if (expiredOrders.isEmpty()) return;

        log.info("Auto-release scheduler: processing {} expired order(s)", expiredOrders.size());

        for (Order order : expiredOrders) {
            try {
                autoCompleteOrder(order);
            } catch (Exception e) {
                log.error("Failed to auto-release order #{}: {}", order.getOrderNumber(), e.getMessage(), e);
            }
        }
    }

    /**
     * Send a 24-hour warning notification before auto-release triggers.
     * Runs every hour.
     */
    @Scheduled(fixedDelay = 3_600_000) // 1 hour
    @Transactional
    public void sendAutoReleaseWarnings() {
        LocalDateTime warningThreshold = LocalDateTime.now().plusHours(24);
        LocalDateTime warningFloor    = LocalDateTime.now().plusHours(23);

        List<Order> soonToRelease = orderRepository
                .findDeliveredOrdersAutoReleaseBetween(warningFloor, warningThreshold);

        for (Order order : soonToRelease) {
            try {
                notificationService.send(order.getBuyer(), "order",
                        "Action Required: Review Delivery",
                        "Order #" + order.getOrderNumber() + " will auto-complete in ~24 hours. " +
                        "Please review the delivery and approve or request revisions.",
                        "/orders/" + order.getId());
                log.info("Auto-release 24h warning sent for order #{}", order.getOrderNumber());
            } catch (Exception e) {
                log.warn("Failed to send auto-release warning for order #{}: {}", order.getOrderNumber(), e.getMessage());
            }
        }
    }

    private void autoCompleteOrder(Order order) {
        log.info("Auto-completing order #{} (autoReleaseAt={})", order.getOrderNumber(), order.getAutoReleaseAt());

        order.setStatus(Order.OrderStatus.RELEASED);
        order.setAutoReleaseAt(null); // clear the trigger — updatedAt handled by @PreUpdate
        orderRepository.save(order);

        // Release escrow to freelancer via double-entry ledger
        ledgerService.recordOrderCompletion(order);

        // Notify both parties
        notificationService.send(order.getSeller(), "order",
                "Payment Released — Order Completed!",
                "Order #" + order.getOrderNumber() + " was auto-completed. " +
                "Your earnings of $" + String.format("%.2f", order.getSellerPayoutAmount() / 100.0) +
                " have been released to your wallet.",
                "/wallet");

        notificationService.send(order.getBuyer(), "order",
                "Order Auto-Completed",
                "Order #" + order.getOrderNumber() + " was automatically marked complete " +
                "as the review window passed. You can still leave a review.",
                "/orders/" + order.getId());

        emailService.sendOrderCompleted(order);
        log.info("Order #{} auto-completed and earnings released.", order.getOrderNumber());
    }
}
