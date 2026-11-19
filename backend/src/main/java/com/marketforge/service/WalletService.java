package com.marketforge.service;

import com.marketforge.dto.request.CreatePayoutRequest;
import com.marketforge.dto.response.InvoiceResponse;
import com.marketforge.dto.response.PayoutRequestResponse;
import com.marketforge.dto.response.WalletResponse;
import com.marketforge.dto.response.WalletTransactionResponse;
import com.marketforge.entity.Order;
import com.marketforge.entity.OrderMilestone;
import com.marketforge.entity.PayoutRequest;
import com.marketforge.entity.SellerProfile;
import com.marketforge.entity.User;
import com.marketforge.exception.BusinessException;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.OrderMilestoneRepository;
import com.marketforge.repository.OrderRepository;
import com.marketforge.repository.PayoutRequestRepository;
import com.marketforge.repository.SellerProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final OrderRepository orderRepository;
    private final OrderMilestoneRepository milestoneRepository;
    private final PayoutRequestRepository payoutRequestRepository;
    private final SellerProfileRepository sellerProfileRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public WalletResponse getWallet(User user) {
        Long sellerEscrowCents = orderRepository.sumEscrowBySellerId(user.getId());
        Long sellerEarnedCents = orderRepository.sumEarnedBySellerId(user.getId());
        Long activeApprovedMilestones = milestoneRepository.sumApprovedMilestonesPayoutForActiveOrders(user.getId());
        Long totalWithdrawnCents = payoutRequestRepository.sumTotalWithdrawnByUserId(user.getId());
        Long buyerSpentCents = orderRepository.sumSpentByBuyerId(user.getId());
        Long buyerEscrowCents = orderRepository.sumEscrowByBuyerId(user.getId());

        long totalEarnedCents = (sellerEarnedCents != null ? sellerEarnedCents : 0) +
                                (activeApprovedMilestones != null ? activeApprovedMilestones : 0);
        long availableCents = Math.max(0, totalEarnedCents - (totalWithdrawnCents != null ? totalWithdrawnCents : 0));
        long pendingClearanceCents = 0; // For demo, cleared directly into available

        SellerProfile sp = sellerProfileRepository.findByUserId(user.getId()).orElse(null);
        boolean stripeConnected = sp != null && sp.getStripeAccountId() != null && !sp.getStripeAccountId().isBlank();
        String stripeAccountId = sp != null ? sp.getStripeAccountId() : null;

        // Load payout requests
        List<PayoutRequest> payoutRequests = payoutRequestRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<PayoutRequestResponse> payoutResponses = payoutRequests.stream().map(PayoutRequestResponse::from).toList();

        // Build composite financial statement
        List<WalletTransactionResponse> transactions = new ArrayList<>();

        // 1. Seller earnings & in-escrow orders
        Pageable pageable = PageRequest.of(0, 50, Sort.by("createdAt").descending());
        Page<Order> sellerOrders = orderRepository.findBySellerId(user.getId(), pageable);
        for (Order o : sellerOrders.getContent()) {
            boolean isCompleted = o.getStatus() == Order.OrderStatus.RELEASED ||
                                  o.getStatus() == Order.OrderStatus.CONFIRMED ||
                                  o.getStatus() == Order.OrderStatus.PAID_OUT;
            boolean isInEscrow = o.getStatus() == Order.OrderStatus.IN_PROGRESS ||
                                 o.getStatus() == Order.OrderStatus.DELIVERED ||
                                 o.getStatus() == Order.OrderStatus.REVISION_REQUESTED;

            if (isCompleted) {
                transactions.add(WalletTransactionResponse.builder()
                        .id("TXN-" + o.getOrderNumber() + "-EARN")
                        .type("ESCROW_RELEASE")
                        .title("Earnings Released: " + (o.getListing() != null ? o.getListing().getTitle() : "Custom Order"))
                        .amount(o.getSellerPayoutAmount() != null ? o.getSellerPayoutAmount() / 100.0 : 0)
                        .status("COMPLETED")
                        .orderNumber(o.getOrderNumber())
                        .orderId(o.getId())
                        .date(o.getReleasedAt() != null ? o.getReleasedAt() : o.getUpdatedAt())
                        .build());
            } else if (isInEscrow) {
                transactions.add(WalletTransactionResponse.builder()
                        .id("TXN-" + o.getOrderNumber() + "-ESCROW")
                        .type("HELD_IN_ESCROW")
                        .title("Active Escrow: " + (o.getListing() != null ? o.getListing().getTitle() : "Custom Order"))
                        .amount(o.getSellerPayoutAmount() != null ? o.getSellerPayoutAmount() / 100.0 : 0)
                        .status("HELD_IN_ESCROW")
                        .orderNumber(o.getOrderNumber())
                        .orderId(o.getId())
                        .date(o.getCreatedAt())
                        .build());
            }
        }

        // 2. Approved Milestones from Active Orders (Partial Releases)
        List<OrderMilestone> approvedMilestones = milestoneRepository.findApprovedMilestonesForActiveOrders(user.getId());
        for (OrderMilestone m : approvedMilestones) {
            transactions.add(WalletTransactionResponse.builder()
                    .id("MS-" + m.getId() + "-EARN")
                    .type("MILESTONE_RELEASE")
                    .title("Milestone #" + m.getMilestoneIndex() + " Released: " + m.getTitle())
                    .amount(m.getSellerPayoutAmount() != null ? m.getSellerPayoutAmount() / 100.0 : 0)
                    .status("COMPLETED")
                    .orderNumber(m.getOrder().getOrderNumber())
                    .orderId(m.getOrder().getId())
                    .date(m.getApprovedAt() != null ? m.getApprovedAt() : m.getUpdatedAt())
                    .build());
        }

        // 3. Client purchases / escrows
        Page<Order> buyerOrders = orderRepository.findByBuyerId(user.getId(), pageable);
        for (Order o : buyerOrders.getContent()) {
            transactions.add(WalletTransactionResponse.builder()
                    .id("TXN-" + o.getOrderNumber() + "-PAY")
                    .type("ESCROW_CAPTURE")
                    .title("Escrow Funded: " + (o.getListing() != null ? o.getListing().getTitle() : "Custom Order"))
                    .amount(o.getAmountTotal() != null ? - (o.getAmountTotal() / 100.0) : 0)
                    .status(o.getStatus() != null ? o.getStatus().name() : "PAID")
                    .orderNumber(o.getOrderNumber())
                    .orderId(o.getId())
                    .date(o.getCreatedAt())
                    .build());
        }

        // 4. Payout withdrawals
        for (PayoutRequest p : payoutRequests) {
            transactions.add(WalletTransactionResponse.builder()
                    .id("PAYOUT-" + p.getId())
                    .type("WITHDRAWAL")
                    .title("Payout Withdrawal (" + p.getPayoutMethod().replace('_', ' ') + ")")
                    .amount(p.getAmount() != null ? - (p.getAmount() / 100.0) : 0)
                    .status(p.getStatus())
                    .orderNumber(p.getTransactionReference())
                    .date(p.getCreatedAt())
                    .build());
        }

        // Sort descending by date
        transactions.sort(Comparator.comparing(WalletTransactionResponse::getDate, Comparator.nullsLast(Comparator.reverseOrder())));

        return WalletResponse.builder()
                .availableBalance(availableCents / 100.0)
                .pendingClearance(pendingClearanceCents / 100.0)
                .inEscrow(((sellerEscrowCents != null ? sellerEscrowCents : 0) + (buyerEscrowCents != null ? buyerEscrowCents : 0)) / 100.0)
                .lifetimeEarnings((sellerEarnedCents != null ? sellerEarnedCents : 0) / 100.0)
                .totalWithdrawn((totalWithdrawnCents != null ? totalWithdrawnCents : 0) / 100.0)
                .totalSpent((buyerSpentCents != null ? buyerSpentCents : 0) / 100.0)
                .stripeConnected(stripeConnected)
                .stripeAccountId(stripeAccountId)
                .defaultPayoutMethod(stripeConnected ? "STRIPE_CONNECT" : "BANK_TRANSFER")
                .transactions(transactions)
                .payoutRequests(payoutResponses)
                .build();
    }

    @Transactional
    public WalletResponse requestPayout(User user, CreatePayoutRequest req) {
        Long earnedCents = orderRepository.sumEarnedBySellerId(user.getId());
        Long activeApprovedMilestones = milestoneRepository.sumApprovedMilestonesPayoutForActiveOrders(user.getId());
        long totalEarnedCents = (earnedCents != null ? earnedCents : 0) +
                                (activeApprovedMilestones != null ? activeApprovedMilestones : 0);
        Long totalWithdrawnCents = payoutRequestRepository.sumTotalWithdrawnByUserId(user.getId());
        long availableCents = Math.max(0, totalEarnedCents - (totalWithdrawnCents != null ? totalWithdrawnCents : 0));

        long requestedCents = (long) (req.getAmount() * 100);

        if (requestedCents > availableCents) {
            throw new BusinessException("INSUFFICIENT_FUNDS",
                    "Requested withdrawal of $" + req.getAmount() + " exceeds your available balance of $" + String.format("%.2f", availableCents / 100.0));
        }

        String txnRef = "tr_mf_" + UUID.randomUUID().toString().substring(0, 12);
        String destination = req.getDestinationDetails();
        if (destination == null || destination.isBlank()) {
            destination = "STRIPE_CONNECT".equalsIgnoreCase(req.getPayoutMethod())
                    ? "Direct Instant Deposit (Stripe Express)"
                    : "Direct Bank Wire ACH";
        }

        PayoutRequest payout = PayoutRequest.builder()
                .user(user)
                .amount(requestedCents)
                .payoutMethod(req.getPayoutMethod().toUpperCase())
                .destinationDetails(destination)
                .status("COMPLETED")
                .transactionReference(txnRef)
                .processedAt(LocalDateTime.now())
                .build();

        payoutRequestRepository.save(payout);

        notificationService.send(user, "wallet", "Payout Processed Successfully",
                "Your withdrawal request for $" + req.getAmount() + " has been sent to " + destination + " (Ref: " + txnRef + ").",
                "/wallet");

        emailService.sendPayoutCompleted(user, payout);

        return getWallet(user);
    }

    @Transactional
    public WalletResponse connectStripe(User user, String accountId) {
        SellerProfile sp = sellerProfileRepository.findByUserId(user.getId()).orElse(null);
        if (sp == null) {
            sp = SellerProfile.builder()
                    .user(user)
                    .displayName(user.getName())
                    .onboardingStatus("active")
                    .build();
        }

        String connectedId = (accountId != null && !accountId.isBlank())
                ? accountId.trim()
                : "acct_mf_express_" + UUID.randomUUID().toString().substring(0, 8);

        sp.setStripeAccountId(connectedId);
        sp.setOnboardingStatus("active");
        sellerProfileRepository.save(sp);

        notificationService.send(user, "wallet", "Stripe Connect Onboarded",
                "Your Stripe Express payout account (" + connectedId + ") has been connected to MarketForge.",
                "/wallet");

        return getWallet(user);
    }

    @Transactional
    public Map<String, Object> createStripeConnectAccountLink(User user) {
        SellerProfile sp = sellerProfileRepository.findByUserId(user.getId()).orElse(null);
        if (sp == null) {
            sp = SellerProfile.builder()
                    .user(user)
                    .displayName(user.getName())
                    .onboardingStatus("active")
                    .build();
        }

        if (sp.getStripeAccountId() == null || sp.getStripeAccountId().isBlank()) {
            sp.setStripeAccountId("acct_mf_express_" + UUID.randomUUID().toString().substring(0, 8));
            sellerProfileRepository.save(sp);
        }

        String onboardUrl = "https://connect.stripe.com/express/oauth/authorize?client_id=ca_marketforge_mock&state=" +
                user.getId() + "&stripe_user[email]=" + user.getEmail();

        return Map.of(
                "accountId", sp.getStripeAccountId(),
                "url", onboardUrl,
                "status", "active"
        );
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getOrderInvoice(User user, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (!order.getBuyer().getId().equals(user.getId()) &&
            !order.getSeller().getId().equals(user.getId()) &&
            !Boolean.TRUE.equals(user.getIsAdmin())) {
            throw new BusinessException("FORBIDDEN", "You do not have access to this invoice");
        }

        String sellerDisplay = order.getSeller().getName();
        if (order.getSeller().getSellerProfile() != null && order.getSeller().getSellerProfile().getDisplayName() != null) {
            sellerDisplay = order.getSeller().getSellerProfile().getDisplayName();
        }

        String title = order.getListing() != null ? order.getListing().getTitle() : "Custom Contract Project Delivery";

        return InvoiceResponse.builder()
                .invoiceNumber("INV-2026-" + order.getOrderNumber())
                .orderNumber(order.getOrderNumber())
                .orderId(order.getId())
                .issueDate(order.getConfirmedAt() != null ? order.getConfirmedAt() : order.getCreatedAt())
                .currency(order.getCurrency() != null ? order.getCurrency().toUpperCase() : "USD")
                .buyerName(order.getBuyer().getName())
                .buyerEmail(order.getBuyer().getEmail())
                .sellerName(order.getSeller().getName())
                .sellerDisplayName(sellerDisplay)
                .sellerEmail(order.getSeller().getEmail())
                .serviceTitle(title)
                .subtotal(order.getAmountTotal() != null ? order.getAmountTotal() / 100.0 : 0)
                .platformFee(order.getPlatformFeeAmount() != null ? order.getPlatformFeeAmount() / 100.0 : 0)
                .totalAmount(order.getAmountTotal() != null ? order.getAmountTotal() / 100.0 : 0)
                .sellerPayoutAmount(order.getSellerPayoutAmount() != null ? order.getSellerPayoutAmount() / 100.0 : 0)
                .status(order.getStatus() != null ? order.getStatus().name() : "IN_PROGRESS")
                .escrowStatus(order.getStatus() == Order.OrderStatus.RELEASED || order.getStatus() == Order.OrderStatus.CONFIRMED
                        ? "SETTLED_AND_RELEASED" : "FUNDS_SECURED_IN_ESCROW")
                .build();
    }
}
