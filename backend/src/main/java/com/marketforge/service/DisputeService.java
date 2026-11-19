package com.marketforge.service;

import com.marketforge.dto.request.*;
import com.marketforge.dto.response.*;
import com.marketforge.entity.*;
import com.marketforge.exception.BusinessException;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DisputeService {

    private final DisputeRepository disputeRepository;
    private final OrderRepository orderRepository;
    private final DisputeResolutionRepository resolutionRepository;
    private final DisputeMessageRepository messageRepository;
    private final DisputeAttachmentRepository attachmentRepository;
    private final DisputeSettlementOfferRepository offerRepository;
    private final LedgerService ledgerService;
    private final NotificationService notificationService;

    @Transactional
    public DisputeResponse createDispute(User user, CreateDisputeRequest req) {
        Order order = orderRepository.findById(req.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", req.getOrderId()));

        boolean isBuyer = order.getBuyer().getId().equals(user.getId());
        boolean isSeller = order.getSeller().getId().equals(user.getId());

        if (!isBuyer && !isSeller) {
            throw new BusinessException("FORBIDDEN", "You are not a party to this order");
        }

        if (disputeRepository.existsByOrderId(order.getId())) {
            throw new BusinessException("DISPUTE_EXISTS", "A dispute already exists for this order");
        }

        if (order.getStatus() != Order.OrderStatus.DELIVERED
                && order.getStatus() != Order.OrderStatus.IN_PROGRESS
                && order.getStatus() != Order.OrderStatus.REVISION_REQUESTED
                && order.getStatus() != Order.OrderStatus.CONFIRMED) {
            throw new BusinessException("INVALID_STATE", "Order is not in an active or disputable state");
        }

        // Freeze order status to DISPUTED
        order.setStatus(Order.OrderStatus.DISPUTED);
        orderRepository.save(order);

        Dispute dispute = Dispute.builder()
                .order(order)
                .raisedBy(user)
                .reason(req.getReason())
                .description(req.getDescription())
                .status("open")
                .stage("MUTUAL_NEGOTIATION")
                .claimAmount(order.getAmountTotal())
                .build();
        dispute = disputeRepository.save(dispute);

        // Record initial case statement in dispute messages
        String initialMsg = "Dispute Case opened by " + user.getName() + " (" + (isBuyer ? "Buyer" : "Seller") + ").\n"
                + "Reason: " + req.getReason() + "\n"
                + (req.getDescription() != null ? "Statement: " + req.getDescription() : "");

        messageRepository.save(DisputeMessage.builder()
                .dispute(dispute)
                .sender(user)
                .body(initialMsg)
                .isSystemEvent(true)
                .build());

        // Notify the counterparty and log
        User otherParty = isBuyer ? order.getSeller() : order.getBuyer();
        notificationService.send(otherParty, "dispute", "Dispute Raised ⚠️",
                "A formal dispute has been opened on Order #" + order.getOrderNumber() + ". Escrow funds are frozen.",
                "/orders/" + order.getId() + "/dispute");

        log.info("Dispute #{} opened on order #{} by user #{}", dispute.getId(), order.getId(), user.getId());
        return DisputeResponse.from(disputeRepository.findById(dispute.getId()).orElse(dispute));
    }

    @Transactional(readOnly = true)
    public DisputeResponse getDisputeByOrderId(User user, Long orderId) {
        Dispute dispute = disputeRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute for Order", orderId));

        validateAccess(user, dispute);
        return DisputeResponse.from(dispute);
    }

    @Transactional(readOnly = true)
    public DisputeResponse getDispute(User user, Long id) {
        Dispute dispute = disputeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute", id));

        validateAccess(user, dispute);
        return DisputeResponse.from(dispute);
    }

    @Transactional(readOnly = true)
    public Page<DisputeResponse> getDisputes(String status, int page, int size) {
        return disputeRepository.findAllWithFilters(status, PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(DisputeResponse::from);
    }

    @Transactional
    public DisputeMessageDto postMessage(User user, Long disputeId, PostDisputeMessageRequest req) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute", disputeId));

        validateAccess(user, dispute);

        if (isResolved(dispute)) {
            throw new BusinessException("DISPUTE_CLOSED", "Cannot send messages in a resolved dispute");
        }

        DisputeMessage message = DisputeMessage.builder()
                .dispute(dispute)
                .sender(user)
                .body(req.getBody())
                .attachmentUrl(req.getAttachmentUrl())
                .attachmentName(req.getAttachmentName())
                .isSystemEvent(false)
                .build();
        message = messageRepository.save(message);

        if (req.getAttachmentUrl() != null && !req.getAttachmentUrl().isBlank()) {
            attachmentRepository.save(DisputeAttachment.builder()
                    .dispute(dispute)
                    .uploadedBy(user)
                    .fileUrl(req.getAttachmentUrl())
                    .fileName(req.getAttachmentName() != null ? req.getAttachmentName() : "Evidence Attachment")
                    .build());
        }

        // Notify counterpart or both parties if admin posted
        Order order = dispute.getOrder();
        if (Boolean.TRUE.equals(user.getIsAdmin())) {
            notificationService.send(order.getBuyer(), "dispute", "Mediator Notice",
                    "MarketForge Arbitration Desk posted an update on dispute #" + dispute.getId(),
                    "/orders/" + order.getId() + "/dispute");
            notificationService.send(order.getSeller(), "dispute", "Mediator Notice",
                    "MarketForge Arbitration Desk posted an update on dispute #" + dispute.getId(),
                    "/orders/" + order.getId() + "/dispute");
        } else {
            User counterpart = user.getId().equals(order.getBuyer().getId()) ? order.getSeller() : order.getBuyer();
            notificationService.send(counterpart, "dispute", "New Dispute Message",
                    user.getName() + " posted evidence or a statement on dispute #" + dispute.getId(),
                    "/orders/" + order.getId() + "/dispute");
        }

        Long buyerId = order.getBuyer() != null ? order.getBuyer().getId() : null;
        Long sellerId = order.getSeller() != null ? order.getSeller().getId() : null;
        return DisputeMessageDto.from(message, buyerId, sellerId);
    }

    @Transactional
    public DisputeSettlementOfferDto createSettlementOffer(User user, Long disputeId, CreateSettlementOfferRequest req) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute", disputeId));

        validateAccess(user, dispute);

        if (isResolved(dispute)) {
            throw new BusinessException("DISPUTE_CLOSED", "Cannot propose settlement in a resolved dispute");
        }

        Order order = dispute.getOrder();
        long total = order.getAmountTotal();

        if (req.getRefundAmount() + req.getReleaseAmount() > total) {
            throw new BusinessException("INVALID_AMOUNT", "Total proposed split exceeds order escrow amount ($" + (total / 100.0) + ")");
        }

        // Expire any existing pending offers for this dispute
        List<DisputeSettlementOffer> existingPending = offerRepository.findByDisputeIdOrderByCreatedAtDesc(disputeId);
        for (DisputeSettlementOffer o : existingPending) {
            if ("PENDING".equals(o.getStatus())) {
                o.setStatus("EXPIRED");
                o.setRespondedAt(LocalDateTime.now());
                offerRepository.save(o);
            }
        }

        DisputeSettlementOffer offer = DisputeSettlementOffer.builder()
                .dispute(dispute)
                .proposedBy(user)
                .refundAmount(req.getRefundAmount())
                .releaseAmount(req.getReleaseAmount())
                .message(req.getMessage())
                .status("PENDING")
                .build();
        offer = offerRepository.save(offer);

        // Post system message
        String splitSummary = String.format("🤝 Mutual Settlement Offer proposed by %s: $%.2f Refund to Buyer, $%.2f Release to Seller.%s",
                user.getName(),
                req.getRefundAmount() / 100.0,
                req.getReleaseAmount() / 100.0,
                (req.getMessage() != null && !req.getMessage().isBlank()) ? ("\nNote: " + req.getMessage()) : "");

        messageRepository.save(DisputeMessage.builder()
                .dispute(dispute)
                .sender(user)
                .body(splitSummary)
                .isSystemEvent(true)
                .build());

        // Notify counterparty
        User counterpart = user.getId().equals(order.getBuyer().getId()) ? order.getSeller() : order.getBuyer();
        notificationService.send(counterpart, "dispute", "Settlement Proposal 🤝",
                user.getName() + " proposed a mutual settlement on Order #" + order.getOrderNumber() + ". Review and respond.",
                "/orders/" + order.getId() + "/dispute");

        Long buyerId = order.getBuyer() != null ? order.getBuyer().getId() : null;
        Long sellerId = order.getSeller() != null ? order.getSeller().getId() : null;
        return DisputeSettlementOfferDto.from(offer, buyerId, sellerId);
    }

    @Transactional
    public DisputeResponse respondToSettlementOffer(User user, Long disputeId, Long offerId, RespondSettlementOfferRequest req) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute", disputeId));

        validateAccess(user, dispute);

        if (isResolved(dispute)) {
            throw new BusinessException("DISPUTE_CLOSED", "Cannot respond to offers in a resolved dispute");
        }

        DisputeSettlementOffer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Settlement Offer", offerId));

        if (!offer.getDispute().getId().equals(disputeId)) {
            throw new BusinessException("INVALID_OFFER", "Offer does not belong to this dispute");
        }

        if (!"PENDING".equals(offer.getStatus())) {
            throw new BusinessException("OFFER_NOT_PENDING", "Offer is no longer active (status: " + offer.getStatus() + ")");
        }

        if (offer.getProposedBy().getId().equals(user.getId())) {
            throw new BusinessException("FORBIDDEN", "You cannot accept or reject your own settlement offer");
        }

        LocalDateTime now = LocalDateTime.now();

        if ("ACCEPT".equalsIgnoreCase(req.getAction())) {
            offer.setStatus("ACCEPTED");
            offer.setRespondedAt(now);
            offerRepository.save(offer);

            Order order = dispute.getOrder();
            long refundAmt = offer.getRefundAmount();
            long releaseAmt = offer.getReleaseAmount();

            if (releaseAmt == 0) {
                dispute.setStatus("resolved_refund");
                order.setStatus(Order.OrderStatus.REFUNDED);
                ledgerService.recordRefund(order, order.getAmountTotal());
            } else if (refundAmt == 0) {
                dispute.setStatus("resolved_release");
                order.setStatus(Order.OrderStatus.RELEASED);
                order.setReleasedAt(now);
                ledgerService.recordOrderCompletion(order);
            } else {
                dispute.setStatus("resolved_partial");
                order.setStatus(Order.OrderStatus.RELEASED);
                order.setReleasedAt(now);
                ledgerService.recordRefund(order, refundAmt);
            }

            dispute.setStage("RESOLVED");
            dispute.setRefundAmount(refundAmt);
            dispute.setReleaseAmount(releaseAmt);
            dispute.setResolvedAt(now);
            disputeRepository.save(dispute);
            orderRepository.save(order);

            resolutionRepository.save(DisputeResolution.builder()
                    .dispute(dispute)
                    .admin(user)
                    .verdict("mutual_settlement")
                    .rulingNotes("Settlement agreement accepted mutually by parties via offer #" + offerId)
                    .buyerRefundAmount(refundAmt)
                    .sellerPayoutAmount(releaseAmt)
                    .build());

            // Post system message
            String acceptedNotice = String.format("🎉 Mutual Settlement Agreement Accepted by %s!\n"
                    + "Escrow funds have been disbursed: $%.2f refunded to Buyer, $%.2f released to Seller. Dispute closed.",
                    user.getName(), refundAmt / 100.0, releaseAmt / 100.0);

            messageRepository.save(DisputeMessage.builder()
                    .dispute(dispute)
                    .sender(user)
                    .body(acceptedNotice)
                    .isSystemEvent(true)
                    .build());

            // Notify both parties
            notificationService.send(order.getBuyer(), "dispute", "Dispute Settled! 🎉",
                    "Mutual settlement was accepted. Escrow funds have been disbursed.", "/orders/" + order.getId());
            notificationService.send(order.getSeller(), "dispute", "Dispute Settled! 🎉",
                    "Mutual settlement was accepted. Escrow funds have been disbursed.", "/orders/" + order.getId());

        } else if ("REJECT".equalsIgnoreCase(req.getAction())) {
            offer.setStatus("REJECTED");
            offer.setRespondedAt(now);
            offerRepository.save(offer);

            messageRepository.save(DisputeMessage.builder()
                    .dispute(dispute)
                    .sender(user)
                    .body("Settlement offer was declined by " + user.getName() + ". Dispute remains in active mediation.")
                    .isSystemEvent(true)
                    .build());
        } else {
            throw new BusinessException("INVALID_ACTION", "Action must be ACCEPT or REJECT");
        }

        return DisputeResponse.from(disputeRepository.findById(disputeId).orElse(dispute));
    }

    @Transactional
    public DisputeResponse updateStatus(User admin, Long disputeId, String newStatus) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute", disputeId));

        if (!Boolean.TRUE.equals(admin.getIsAdmin())) {
            throw new BusinessException("FORBIDDEN", "Only platform administrators can update dispute status");
        }

        dispute.setStatus(newStatus);
        if ("under_review".equalsIgnoreCase(newStatus) || "evidence_requested".equalsIgnoreCase(newStatus)) {
            dispute.setStage("ARBITRATION_REVIEW");
            dispute.setAssignedMediator(admin);
        }
        disputeRepository.save(dispute);

        messageRepository.save(DisputeMessage.builder()
                .dispute(dispute)
                .sender(admin)
                .body("MarketForge Arbitration Desk (" + admin.getName() + ") updated dispute status to: " + newStatus)
                .isSystemEvent(true)
                .build());

        return DisputeResponse.from(dispute);
    }

    @Transactional
    public DisputeResponse resolveDispute(User admin, Long disputeId, ResolveDisputeRequest req) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute", disputeId));

        if (!Boolean.TRUE.equals(admin.getIsAdmin())) {
            throw new BusinessException("FORBIDDEN", "Only platform administrators can issue binding arbitration rulings");
        }

        if (isResolved(dispute)) {
            throw new BusinessException("INVALID_STATE", "Dispute is already resolved");
        }

        Order order = dispute.getOrder();
        long total = order.getAmountTotal();
        long buyerRefund = 0;
        long sellerPayout = 0;

        switch (req.getVerdict()) {
            case "refund_buyer" -> {
                buyerRefund = total;
                dispute.setStatus("resolved_refund");
                order.setStatus(Order.OrderStatus.REFUNDED);
                ledgerService.recordRefund(order, total);
            }
            case "payout_seller" -> {
                sellerPayout = order.getSellerPayoutAmount();
                dispute.setStatus("resolved_release");
                order.setStatus(Order.OrderStatus.RELEASED);
                order.setReleasedAt(LocalDateTime.now());
                ledgerService.recordOrderCompletion(order);
            }
            case "split_50_50" -> {
                buyerRefund = total / 2;
                sellerPayout = total - buyerRefund;
                dispute.setStatus("resolved_partial");
                order.setStatus(Order.OrderStatus.RELEASED);
                order.setReleasedAt(LocalDateTime.now());
                ledgerService.recordRefund(order, buyerRefund);
            }
            case "custom_split" -> {
                buyerRefund = req.getCustomBuyerRefundAmount() != null ? req.getCustomBuyerRefundAmount() : 0L;
                sellerPayout = req.getCustomSellerPayoutAmount() != null ? req.getCustomSellerPayoutAmount() : 0L;
                if (buyerRefund + sellerPayout > total) {
                    throw new BusinessException("INVALID_AMOUNT", "Total split amount exceeds order escrow amount ($" + (total / 100.0) + ")");
                }
                dispute.setStatus("resolved_partial");
                order.setStatus(sellerPayout > 0 ? Order.OrderStatus.RELEASED : Order.OrderStatus.REFUNDED);
                if (sellerPayout > 0) {
                    order.setReleasedAt(LocalDateTime.now());
                }
                if (buyerRefund > 0) {
                    ledgerService.recordRefund(order, buyerRefund);
                }
            }
            default -> throw new BusinessException("INVALID_VERDICT", "Unknown verdict: " + req.getVerdict());
        }

        LocalDateTime now = LocalDateTime.now();
        dispute.setStage("RESOLVED");
        dispute.setRefundAmount(buyerRefund);
        dispute.setReleaseAmount(sellerPayout);
        dispute.setResolvedAt(now);
        dispute.setResolvedByAdmin(admin);
        disputeRepository.save(dispute);

        orderRepository.save(order);

        resolutionRepository.save(DisputeResolution.builder()
                .dispute(dispute)
                .admin(admin)
                .verdict(req.getVerdict())
                .rulingNotes(req.getRulingNotes())
                .buyerRefundAmount(buyerRefund)
                .sellerPayoutAmount(sellerPayout)
                .build());

        // Post official binding ruling message in dispute thread
        String rulingSummary = String.format("⚖️ OFFICIAL ARBITRATION RULING by %s:\nVerdict: %s\nBuyer Refund: $%.2f | Seller Payout: $%.2f\nFindings: %s",
                admin.getName(),
                req.getVerdict().toUpperCase(),
                buyerRefund / 100.0,
                sellerPayout / 100.0,
                req.getRulingNotes());

        messageRepository.save(DisputeMessage.builder()
                .dispute(dispute)
                .sender(admin)
                .body(rulingSummary)
                .isSystemEvent(true)
                .build());

        // Notify both parties
        notificationService.send(order.getBuyer(), "dispute", "Dispute Ruling Issued ⚖️",
                "Arbitrator issued official ruling on Order #" + order.getOrderNumber() + ": " + req.getVerdict(),
                "/orders/" + order.getId() + "/dispute");
        notificationService.send(order.getSeller(), "dispute", "Dispute Ruling Issued ⚖️",
                "Arbitrator issued official ruling on Order #" + order.getOrderNumber() + ": " + req.getVerdict(),
                "/orders/" + order.getId() + "/dispute");

        log.info("Dispute {} arbitrated by admin {} with verdict {}", disputeId, admin.getId(), req.getVerdict());
        return DisputeResponse.from(disputeRepository.findById(disputeId).orElse(dispute));
    }

    private void validateAccess(User user, Dispute dispute) {
        Order order = dispute.getOrder();
        boolean isBuyer = order.getBuyer().getId().equals(user.getId());
        boolean isSeller = order.getSeller().getId().equals(user.getId());
        boolean isAdmin = Boolean.TRUE.equals(user.getIsAdmin());

        if (!isBuyer && !isSeller && !isAdmin) {
            throw new BusinessException("FORBIDDEN", "You do not have permission to view or manage this dispute");
        }
    }

    private boolean isResolved(Dispute dispute) {
        String s = dispute.getStatus();
        return "resolved_refund".equals(s) || "resolved_release".equals(s) || "resolved_partial".equals(s);
    }
}
