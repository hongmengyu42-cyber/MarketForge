package com.marketforge.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketforge.dto.request.CreateMilestoneRequest;
import com.marketforge.dto.request.CreateOrderRequest;
import com.marketforge.dto.request.DeliverOrderRequest;
import com.marketforge.dto.request.RequestRevisionRequest;
import com.marketforge.dto.request.SubmitRequirementsRequest;
import com.marketforge.dto.response.OrderResponse;
import com.marketforge.entity.*;
import com.marketforge.exception.BusinessException;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final ListingRepository listingRepository;
    private final OrderStatusTransitionRepository transitionRepository;
    private final OrderDeliveryRepository deliveryRepository;
    private final OrderMilestoneRepository milestoneRepository;
    private final ReviewRepository reviewRepository;
    private final ConversationRepository conversationRepository;
    private final LedgerService ledgerService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${stripe.platform-fee-percent:10}")
    private int platformFeePercent;

    @Transactional(readOnly = true)
    public Page<OrderResponse> getOrders(User user, String role, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Order> orders;
        if ("seller".equals(role)) {
            orders = orderRepository.findBySellerId(user.getId(), pageable);
        } else {
            orders = orderRepository.findByBuyerId(user.getId(), pageable);
        }
        return orders.map(OrderResponse::from);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(User user, Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id));
        if (!order.getBuyer().getId().equals(user.getId()) && !order.getSeller().getId().equals(user.getId())
                && !Boolean.TRUE.equals(user.getIsAdmin())) {
            throw new BusinessException("FORBIDDEN", "You do not have access to this order");
        }

        List<OrderDelivery> deliveries = deliveryRepository.findByOrderIdOrderByCreatedAtDesc(id);
        List<OrderMilestone> milestones = milestoneRepository.findByOrderIdOrderByMilestoneIndexAsc(id);
        List<OrderStatusTransition> transitions = transitionRepository.findByOrderIdOrderByCreatedAtAsc(id);
        List<Review> orderReviews = reviewRepository.findByOrderId(id);
        Review review = orderReviews.stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsRevealed()) || (user != null && r.getReviewer() != null && r.getReviewer().getId().equals(user.getId())))
                .findFirst()
                .orElse(null);

        Long conversationId = null;
        if (order.getListing() != null) {
            Optional<Conversation> conv = conversationRepository.findByListingIdAndBuyerIdAndSellerId(
                    order.getListing().getId(), order.getBuyer().getId(), order.getSeller().getId());
            if (conv.isPresent()) {
                conversationId = conv.get().getId();
            }
        }
        if (conversationId == null) {
            Optional<Conversation> conv = conversationRepository.findByBuyerIdAndSellerId(
                    order.getBuyer().getId(), order.getSeller().getId());
            if (conv.isPresent()) {
                conversationId = conv.get().getId();
            }
        }

        return OrderResponse.from(order, deliveries, milestones, transitions, review, conversationId);
    }

    @Transactional
    public OrderResponse createOrder(User buyer, CreateOrderRequest req) {
        Listing listing = listingRepository.findById(req.getListingId())
                .orElseThrow(() -> new ResourceNotFoundException("Listing", req.getListingId()));

        if (listing.getStatus() != Listing.ListingStatus.ACTIVE) {
            throw new BusinessException("LISTING_NOT_ACTIVE", "This listing is not currently available");
        }

        User seller = listing.getSellerProfile().getUser();
        if (seller.getId().equals(buyer.getId())) {
            throw new BusinessException("SELF_ORDER", "You cannot order your own listing");
        }

        long totalCents = listing.getPriceAmount();
        long feeCents = (totalCents * platformFeePercent) / 100;
        long payoutCents = totalCents - feeCents;

        Order order = Order.builder()
                .orderNumber("MF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .listing(listing).buyer(buyer).seller(seller)
                .status(Order.OrderStatus.AUTHORIZED)
                .amountTotal(totalCents).platformFeeAmount(feeCents).sellerPayoutAmount(payoutCents)
                .currency(listing.getCurrency())
                .expectedDeliveryAt(LocalDateTime.now().plusDays(listing.getDeliveryDays()))
                .build();

        order = orderRepository.save(order);
        recordTransition(order, null, Order.OrderStatus.AUTHORIZED, buyer, "Order created");

        // Move to IN_PROGRESS immediately
        order.setStatus(Order.OrderStatus.IN_PROGRESS);
        orderRepository.save(order);
        recordTransition(order, Order.OrderStatus.AUTHORIZED, Order.OrderStatus.IN_PROGRESS, null, "Payment authorized and placed in escrow");

        ledgerService.recordEscrowCapture(order);

        notificationService.send(seller, "order", "New Order Received",
                "You received a new order #" + order.getOrderNumber() + " for " + listing.getTitle(), "/orders/" + order.getId());

        return getOrder(buyer, order.getId());
    }

    @Transactional
    public OrderResponse submitRequirements(User buyer, Long orderId, SubmitRequirementsRequest req) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (!order.getBuyer().getId().equals(buyer.getId())) {
            throw new BusinessException("FORBIDDEN", "Only the buyer can submit requirements for this order");
        }

        order.setRequirements(req.getRequirements());
        if (order.getRequirementsSubmittedAt() == null) {
            order.setRequirementsSubmittedAt(LocalDateTime.now());
        }
        orderRepository.save(order);

        recordTransition(order, order.getStatus(), order.getStatus(), buyer, "Project requirements submitted by client");

        notificationService.send(order.getSeller(), "order", "Requirements Submitted",
                "Client submitted project requirements for order #" + order.getOrderNumber(), "/orders/" + order.getId());

        return getOrder(buyer, orderId);
    }

    @Transactional
    public OrderResponse deliverOrder(User seller, Long orderId, DeliverOrderRequest req) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (!order.getSeller().getId().equals(seller.getId())) {
            throw new BusinessException("FORBIDDEN", "Only the assigned seller can deliver work for this order");
        }
        if (order.getStatus() != Order.OrderStatus.IN_PROGRESS &&
            order.getStatus() != Order.OrderStatus.REVISION_REQUESTED &&
            order.getStatus() != Order.OrderStatus.DELIVERED) {
            throw new BusinessException("INVALID_STATE", "Order cannot be delivered in current state: " + order.getStatus());
        }

        String attachmentsJson = null;
        if (req.getAttachments() != null && !req.getAttachments().isEmpty()) {
            try {
                attachmentsJson = objectMapper.writeValueAsString(req.getAttachments());
            } catch (Exception e) {
                log.warn("Failed to serialize attachments list to JSON", e);
                attachmentsJson = String.join(",", req.getAttachments());
            }
        }

        // Save delivery record
        deliveryRepository.save(OrderDelivery.builder()
                .order(order)
                .seller(seller)
                .notes(req.getNotes())
                .sourceUrl(req.getSourceUrl())
                .attachments(attachmentsJson)
                .build());

        Order.OrderStatus prev = order.getStatus();
        order.setStatus(Order.OrderStatus.DELIVERED);
        order.setDeliveredAt(LocalDateTime.now());
        order.setAutoReleaseAt(LocalDateTime.now().plusHours(72));
        orderRepository.save(order);

        recordTransition(order, prev, Order.OrderStatus.DELIVERED, seller,
                "Work deliverable submitted: " + (req.getNotes() != null && req.getNotes().length() > 60
                        ? req.getNotes().substring(0, 60) + "..." : req.getNotes()));

        notificationService.send(order.getBuyer(), "order", "Order Delivered!",
                "Freelancer has delivered finished work for order #" + order.getOrderNumber() + ". Please review within 72 hours.", "/orders/" + order.getId());

        return getOrder(seller, orderId);
    }

    @Transactional
    public OrderResponse requestRevision(User buyer, Long orderId, RequestRevisionRequest req) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (!order.getBuyer().getId().equals(buyer.getId())) {
            throw new BusinessException("FORBIDDEN", "Only the buyer can request revisions for this order");
        }
        if (order.getStatus() != Order.OrderStatus.DELIVERED) {
            throw new BusinessException("INVALID_STATE", "Revisions can only be requested after work is delivered. Current status: " + order.getStatus());
        }

        Order.OrderStatus prev = order.getStatus();
        order.setStatus(Order.OrderStatus.REVISION_REQUESTED);
        orderRepository.save(order);

        String reasonNote = (req.getReason() != null ? "[" + req.getReason() + "] " : "") + req.getNotes();
        recordTransition(order, prev, Order.OrderStatus.REVISION_REQUESTED, buyer, "Revision requested: " + reasonNote);

        notificationService.send(order.getSeller(), "order", "Revision Requested",
                "Client requested revisions for order #" + order.getOrderNumber() + ": " + req.getNotes(), "/orders/" + order.getId());

        return getOrder(buyer, orderId);
    }

    @Transactional
    public OrderResponse confirmDelivery(User buyer, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (!order.getBuyer().getId().equals(buyer.getId())) {
            throw new BusinessException("FORBIDDEN", "Only the buyer can confirm delivery and release escrow");
        }
        if (order.getStatus() != Order.OrderStatus.DELIVERED &&
            order.getStatus() != Order.OrderStatus.REVISION_REQUESTED &&
            order.getStatus() != Order.OrderStatus.IN_PROGRESS) {
            throw new BusinessException("INVALID_STATE", "Order is not in an active or deliverable state");
        }

        order.setStatus(Order.OrderStatus.CONFIRMED);
        order.setConfirmedAt(LocalDateTime.now());
        orderRepository.save(order);
        recordTransition(order, Order.OrderStatus.DELIVERED, Order.OrderStatus.CONFIRMED, buyer, "Buyer approved deliverable");

        // Release funds
        order.setStatus(Order.OrderStatus.RELEASED);
        order.setReleasedAt(LocalDateTime.now());
        orderRepository.save(order);
        recordTransition(order, Order.OrderStatus.CONFIRMED, Order.OrderStatus.RELEASED, null, "Escrow funds released to freelancer");

        // Mark any remaining milestones as approved
        List<OrderMilestone> milestones = milestoneRepository.findByOrderIdOrderByMilestoneIndexAsc(orderId);
        for (OrderMilestone m : milestones) {
            if (!"approved".equals(m.getStatus())) {
                m.setStatus("approved");
                m.setApprovedAt(LocalDateTime.now());
                milestoneRepository.save(m);
            }
        }

        ledgerService.recordOrderCompletion(order);

        notificationService.send(order.getSeller(), "order", "Payment Released!",
                "Client accepted your delivery! Funds for order #" + order.getOrderNumber() + " have been released to your balance.", "/orders/" + order.getId());

        emailService.sendOrderCompleted(order);

        return getOrder(buyer, orderId);
    }

    @Transactional
    public OrderResponse addMilestone(User user, Long orderId, CreateMilestoneRequest req) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (!order.getBuyer().getId().equals(user.getId()) && !order.getSeller().getId().equals(user.getId())) {
            throw new BusinessException("FORBIDDEN", "You are not authorized to add milestones to this order");
        }

        List<OrderMilestone> existing = milestoneRepository.findByOrderIdOrderByMilestoneIndexAsc(orderId);
        int nextIndex = req.getMilestoneIndex() != null ? req.getMilestoneIndex() : existing.size() + 1;

        long amountCents = (long) (req.getAmount() * 100);
        long feeCents = (amountCents * platformFeePercent) / 100;
        long payoutCents = amountCents - feeCents;

        OrderMilestone milestone = OrderMilestone.builder()
                .order(order)
                .milestoneIndex(nextIndex)
                .title(req.getTitle())
                .description(req.getDescription())
                .amountTotal(amountCents)
                .platformFeeAmount(feeCents)
                .sellerPayoutAmount(payoutCents)
                .status("funded_in_escrow")
                .build();

        milestoneRepository.save(milestone);
        recordTransition(order, order.getStatus(), order.getStatus(), user,
                "Milestone #" + nextIndex + " added: " + req.getTitle());

        return getOrder(user, orderId);
    }

    @Transactional
    public OrderResponse deliverMilestone(User seller, Long orderId, Long milestoneId, DeliverOrderRequest req) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (!order.getSeller().getId().equals(seller.getId())) {
            throw new BusinessException("FORBIDDEN", "Only the seller can deliver milestone deliverables");
        }

        OrderMilestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone", milestoneId));

        if (!milestone.getOrder().getId().equals(orderId)) {
            throw new BusinessException("INVALID_OPERATION", "Milestone does not belong to this order");
        }

        milestone.setStatus("delivered");
        milestone.setDeliverableNotes(req.getNotes());
        milestone.setDeliverableUrl(req.getSourceUrl());
        milestone.setDeliveredAt(LocalDateTime.now());
        milestoneRepository.save(milestone);

        recordTransition(order, order.getStatus(), order.getStatus(), seller,
                "Milestone #" + milestone.getMilestoneIndex() + " deliverable submitted: " + milestone.getTitle());

        notificationService.send(order.getBuyer(), "order", "Milestone Delivered",
                "Freelancer submitted deliverable for milestone: " + milestone.getTitle(), "/orders/" + order.getId());

        emailService.sendMilestoneDelivered(order, milestone);

        return getOrder(seller, orderId);
    }

    @Transactional
    public OrderResponse approveMilestone(User buyer, Long orderId, Long milestoneId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (!order.getBuyer().getId().equals(buyer.getId())) {
            throw new BusinessException("FORBIDDEN", "Only the buyer can approve milestones");
        }

        OrderMilestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone", milestoneId));

        if (!milestone.getOrder().getId().equals(orderId)) {
            throw new BusinessException("INVALID_OPERATION", "Milestone does not belong to this order");
        }

        milestone.setStatus("approved");
        milestone.setApprovedAt(LocalDateTime.now());
        milestoneRepository.save(milestone);

        // Record partial milestone release in double-entry ledger
        ledgerService.recordMilestonePartialRelease(order, milestone);

        recordTransition(order, order.getStatus(), order.getStatus(), buyer,
                "Milestone #" + milestone.getMilestoneIndex() + " approved & escrow partially released: " + milestone.getTitle());

        notificationService.send(order.getSeller(), "order", "Milestone Escrow Released!",
                "Client approved milestone #" + milestone.getMilestoneIndex() + " (" + milestone.getTitle() +
                        ")! $" + String.format("%.2f", (milestone.getSellerPayoutAmount() != null ? milestone.getSellerPayoutAmount() : 0) / 100.0) +
                        " has been released to your available balance.", "/orders/" + order.getId());

        emailService.sendMilestoneApproved(order, milestone);

        // Check if all milestones are approved
        List<OrderMilestone> all = milestoneRepository.findByOrderIdOrderByMilestoneIndexAsc(orderId);
        boolean allApproved = !all.isEmpty() && all.stream().allMatch(m -> "approved".equals(m.getStatus()));
        if (allApproved && order.getStatus() != Order.OrderStatus.RELEASED) {
            order.setStatus(Order.OrderStatus.RELEASED);
            order.setConfirmedAt(LocalDateTime.now());
            order.setReleasedAt(LocalDateTime.now());
            orderRepository.save(order);
            recordTransition(order, Order.OrderStatus.CONFIRMED, Order.OrderStatus.RELEASED, null,
                    "All milestones completed and escrow fully released");
            emailService.sendOrderCompleted(order);
        }

        return getOrder(buyer, orderId);
    }

    @Transactional
    public OrderResponse requestMilestoneRevision(User buyer, Long orderId, Long milestoneId, RequestRevisionRequest req) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (!order.getBuyer().getId().equals(buyer.getId())) {
            throw new BusinessException("FORBIDDEN", "Only the buyer can request milestone revisions");
        }

        OrderMilestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone", milestoneId));

        if (!milestone.getOrder().getId().equals(orderId)) {
            throw new BusinessException("INVALID_OPERATION", "Milestone does not belong to this order");
        }

        milestone.setStatus("revision_requested");
        milestone.setRevisionNotes(req.getNotes());
        milestone.setRevisionRequestedAt(LocalDateTime.now());
        milestoneRepository.save(milestone);

        recordTransition(order, order.getStatus(), order.getStatus(), buyer,
                "Milestone #" + milestone.getMilestoneIndex() + " revision requested: " + req.getNotes());

        notificationService.send(order.getSeller(), "order", "Milestone Revision Requested",
                "Client requested revision on milestone #" + milestone.getMilestoneIndex() + ": " + req.getNotes(),
                "/orders/" + order.getId());

        emailService.sendMilestoneRevisionRequested(order, milestone, req.getNotes());

        return getOrder(buyer, orderId);
    }

    @Transactional
    public OrderResponse cancelOrder(User user, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (!order.getBuyer().getId().equals(user.getId()) && !order.getSeller().getId().equals(user.getId())
                && !Boolean.TRUE.equals(user.getIsAdmin())) {
            throw new BusinessException("FORBIDDEN", "You cannot cancel this order");
        }

        if (order.getStatus() != Order.OrderStatus.AUTHORIZED &&
            order.getStatus() != Order.OrderStatus.IN_PROGRESS &&
            order.getStatus() != Order.OrderStatus.REVISION_REQUESTED) {
            throw new BusinessException("INVALID_STATE", "Order cannot be cancelled in state: " + order.getStatus());
        }

        Order.OrderStatus prev = order.getStatus();
        order.setStatus(Order.OrderStatus.CANCELLED);
        orderRepository.save(order);
        recordTransition(order, prev, Order.OrderStatus.CANCELLED, user, "Order cancelled");

        ledgerService.recordRefund(order, order.getAmountTotal());

        return getOrder(user, orderId);
    }

    private void recordTransition(Order order, Order.OrderStatus from, Order.OrderStatus to, User by, String reason) {
        transitionRepository.save(OrderStatusTransition.builder()
                .order(order)
                .fromStatus(from != null ? from.name().toLowerCase() : null)
                .toStatus(to != null ? to.name().toLowerCase() : null)
                .triggeredBy(by)
                .reason(reason)
                .build());
    }
}
