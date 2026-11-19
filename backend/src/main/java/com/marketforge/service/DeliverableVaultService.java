package com.marketforge.service;

import com.marketforge.dto.response.IpCertificateResponse;
import com.marketforge.entity.Order;
import com.marketforge.entity.OrderDelivery;
import com.marketforge.entity.OrderMilestone;
import com.marketforge.entity.User;
import com.marketforge.exception.BusinessException;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.OrderDeliveryRepository;
import com.marketforge.repository.OrderMilestoneRepository;
import com.marketforge.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeliverableVaultService {

    private final OrderRepository orderRepository;
    private final OrderDeliveryRepository deliveryRepository;
    private final OrderMilestoneRepository milestoneRepository;

    @Value("${jwt.secret:marketforge-super-secret-key-please-change-in-production-2026}")
    private String vaultSecret;

    @Transactional(readOnly = true)
    public IpCertificateResponse generateIpCertificate(User requester, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        boolean isBuyer = order.getBuyer().getId().equals(requester.getId());
        boolean isSeller = order.getSeller().getId().equals(requester.getId());
        boolean isAdmin = Boolean.TRUE.equals(requester.getIsAdmin());

        if (!isBuyer && !isSeller && !isAdmin) {
            throw new BusinessException("FORBIDDEN", "You are not authorized to access this IP certificate");
        }

        List<OrderMilestone> milestones = milestoneRepository.findByOrderIdOrderByMilestoneIndexAsc(orderId);
        boolean hasApprovedMilestone = milestones.stream().anyMatch(m -> "approved".equals(m.getStatus()));
        boolean isOrderReleased = order.getStatus() == Order.OrderStatus.RELEASED ||
                                  order.getStatus() == Order.OrderStatus.CONFIRMED ||
                                  order.getStatus() == Order.OrderStatus.PAID_OUT;

        if (!isOrderReleased && !hasApprovedMilestone) {
            throw new BusinessException("NOT_ELIGIBLE",
                    "Intellectual Property rights are locked in escrow and only legally transfer once milestone deliverables are approved or contract is released.");
        }

        // Collect deliverable artifacts
        List<String> artifacts = new ArrayList<>();
        List<OrderDelivery> deliveries = deliveryRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
        for (OrderDelivery d : deliveries) {
            if (d.getSourceUrl() != null && !d.getSourceUrl().isBlank()) {
                artifacts.add(d.getSourceUrl());
            }
        }
        for (OrderMilestone m : milestones) {
            if (m.getDeliverableUrl() != null && !m.getDeliverableUrl().isBlank()) {
                artifacts.add("Milestone #" + m.getMilestoneIndex() + ": " + m.getDeliverableUrl());
            }
        }
        if (artifacts.isEmpty()) {
            artifacts.add("Master Project Final Deliverables Repository (Order #" + order.getOrderNumber() + ")");
        }

        // Cryptographic SHA-256 Hash
        String payload = order.getId() + ":" + order.getOrderNumber() + ":" +
                order.getBuyer().getId() + ":" + order.getSeller().getId() + ":" +
                order.getAmountTotal() + ":" + (order.getConfirmedAt() != null ? order.getConfirmedAt() : order.getCreatedAt());
        String sha256 = computeSha256(payload);

        String certId = "MF-IP-" + sha256.substring(0, 4).toUpperCase() + "-" +
                sha256.substring(4, 8).toUpperCase() + "-" +
                sha256.substring(8, 12).toUpperCase();

        String projectTitle = order.getListing() != null ? order.getListing().getTitle() : "Custom Contract Project Delivery";
        double totalPaid = (order.getAmountTotal() != null ? order.getAmountTotal() : 0) / 100.0;
        String escrowRef = order.getStripePaymentIntentId() != null
                ? order.getStripePaymentIntentId()
                : "escrow_tr_" + order.getOrderNumber();

        String legalTerms = "DEED OF INTELLECTUAL PROPERTY ASSIGNMENT AND COPYRIGHT GRANT:\n\n" +
                "1. PARTIES: Made and entered into by and between " + order.getSeller().getName() + " ('Assignor / Creator') " +
                "and " + order.getBuyer().getName() + " ('Assignee / Client'), facilitated by the MarketForge Smart Escrow Platform.\n\n" +
                "2. ASSIGNMENT: In full consideration of the escrow settlement payment of " + String.format("%.2f", totalPaid) + " " +
                (order.getCurrency() != null ? order.getCurrency().toUpperCase() : "USD") + " (Escrow Ref: " + escrowRef + "), " +
                "Assignor hereby irrevocably assigns, transfers, and conveys to Assignee all worldwide right, title, and interest in and to the Deliverables, " +
                "including all copyrights, patent rights, trade secret rights, and all other proprietary rights therein.\n\n" +
                "3. MORAL RIGHTS & WARRANTIES: Assignor irrevocably waives all moral rights and warrants that all deliverables are original work, free of infringing third-party code or encumbrances.\n\n" +
                "4. GOVERNING LAW: Authenticated and registered via MarketForge Distributed Financial & IP Registry. Cryptographically sealed under SHA-256 Hash: " + sha256 + ".";

        return IpCertificateResponse.builder()
                .certificateId(certId)
                .contractNumber(order.getOrderNumber())
                .orderId(order.getId())
                .issueDate(order.getConfirmedAt() != null ? order.getConfirmedAt() : LocalDateTime.now())
                .licensorName(order.getSeller().getName())
                .licensorEmail(order.getSeller().getEmail())
                .licensorId(order.getSeller().getId())
                .licenseeName(order.getBuyer().getName())
                .licenseeEmail(order.getBuyer().getEmail())
                .licenseeId(order.getBuyer().getId())
                .projectTitle(projectTitle)
                .contractAmount(totalPaid)
                .currency(order.getCurrency() != null ? order.getCurrency().toUpperCase() : "USD")
                .escrowSettlementReference(escrowRef)
                .deliverableArtifacts(artifacts)
                .sha256VerificationHash(sha256)
                .legalDeedTitle("Official MarketForge Intellectual Property Assignment Deed")
                .legalTerms(legalTerms)
                .isFullyExecuted(isOrderReleased)
                .build();
    }

    public Map<String, Object> generateSecureVaultToken(User user, Long orderId, String assetUrl) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (!order.getBuyer().getId().equals(user.getId()) &&
            !order.getSeller().getId().equals(user.getId()) &&
            !Boolean.TRUE.equals(user.getIsAdmin())) {
            throw new BusinessException("FORBIDDEN", "You are not authorized to generate vault tokens for this order");
        }

        long expiresAt = System.currentTimeMillis() + (60 * 60 * 1000); // 60 minutes
        String tokenPayload = orderId + "|" + user.getId() + "|" + expiresAt + "|" + (assetUrl != null ? assetUrl : "");
        String signature = computeSha256(tokenPayload + ":" + vaultSecret);

        String signedToken = Base64.getUrlEncoder().encodeToString((tokenPayload + "|" + signature).getBytes(StandardCharsets.UTF_8));

        return Map.of(
                "token", signedToken,
                "expiresAt", LocalDateTime.now().plusHours(1),
                "orderNumber", order.getOrderNumber(),
                "assetUrl", assetUrl != null ? assetUrl : ""
        );
    }

    private String computeSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }
}
