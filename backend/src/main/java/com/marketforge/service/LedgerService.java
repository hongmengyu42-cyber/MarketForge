package com.marketforge.service;

import com.marketforge.entity.FinancialLedgerAccount;
import com.marketforge.entity.FinancialLedgerEntry;
import com.marketforge.entity.Order;
import com.marketforge.entity.OrderMilestone;
import com.marketforge.repository.FinancialLedgerAccountRepository;
import com.marketforge.repository.FinancialLedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LedgerService {

    private final FinancialLedgerAccountRepository accountRepo;
    private final FinancialLedgerEntryRepository entryRepo;

    public static final String ESCROW_HOLDING = "1010_ESCROW_HOLDING";
    public static final String SELLER_PAYOUTS_PENDING = "2010_SELLER_PAYOUTS_PENDING";
    public static final String PLATFORM_REVENUE = "4010_PLATFORM_REVENUE";
    public static final String BANK_SETTLEMENT = "1020_BANK_SETTLEMENT";
    public static final String BUYER_REFUND_EXPENSE = "5010_BUYER_REFUND_EXPENSE";

    @Transactional
    public void recordEscrowCapture(Order order) {
        UUID txn = UUID.randomUUID();
        debit(txn, ESCROW_HOLDING, order.getAmountTotal(), order, "Escrow capture - " + order.getOrderNumber());
        log.info("Ledger: escrow capture for order {}", order.getOrderNumber());
    }

    @Transactional
    public void recordOrderCompletion(Order order) {
        UUID txn = UUID.randomUUID();
        debit(txn, SELLER_PAYOUTS_PENDING, order.getSellerPayoutAmount(), order,
                "Seller payout pending - " + order.getOrderNumber());
        credit(txn, ESCROW_HOLDING, order.getSellerPayoutAmount(), order,
                "Release from escrow (seller) - " + order.getOrderNumber());

        UUID txn2 = UUID.randomUUID();
        debit(txn2, PLATFORM_REVENUE, order.getPlatformFeeAmount(), order,
                "Platform fee - " + order.getOrderNumber());
        credit(txn2, ESCROW_HOLDING, order.getPlatformFeeAmount(), order,
                "Release from escrow (fee) - " + order.getOrderNumber());
    }

    @Transactional
    public void recordMilestonePartialRelease(Order order, OrderMilestone milestone) {
        long sellerPayout = milestone.getSellerPayoutAmount() != null && milestone.getSellerPayoutAmount() > 0
                ? milestone.getSellerPayoutAmount()
                : Math.round(milestone.getAmountTotal() * 0.95);
        long platformFee = milestone.getPlatformFeeAmount() != null && milestone.getPlatformFeeAmount() > 0
                ? milestone.getPlatformFeeAmount()
                : (milestone.getAmountTotal() - sellerPayout);

        UUID txn = UUID.randomUUID();
        debit(txn, SELLER_PAYOUTS_PENDING, sellerPayout, order,
                "Milestone #" + milestone.getMilestoneIndex() + " seller payout - " + order.getOrderNumber());
        credit(txn, ESCROW_HOLDING, sellerPayout, order,
                "Milestone #" + milestone.getMilestoneIndex() + " release from escrow (seller) - " + order.getOrderNumber());

        UUID txn2 = UUID.randomUUID();
        debit(txn2, PLATFORM_REVENUE, platformFee, order,
                "Milestone #" + milestone.getMilestoneIndex() + " platform fee - " + order.getOrderNumber());
        credit(txn2, ESCROW_HOLDING, platformFee, order,
                "Milestone #" + milestone.getMilestoneIndex() + " release from escrow (fee) - " + order.getOrderNumber());

        log.info("Ledger: partial milestone #{} release for order {} (seller: {}, fee: {})",
                milestone.getMilestoneIndex(), order.getOrderNumber(), sellerPayout, platformFee);
    }

    @Transactional
    public void recordRefund(Order order, long refundAmount) {
        UUID txn = UUID.randomUUID();
        debit(txn, BUYER_REFUND_EXPENSE, refundAmount, order, "Buyer refund - " + order.getOrderNumber());
        credit(txn, ESCROW_HOLDING, refundAmount, order, "Escrow released for refund - " + order.getOrderNumber());
    }

    private void debit(UUID txnId, String code, long amount, Order order, String desc) {
        FinancialLedgerAccount acct = accountRepo.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Ledger account not found: " + code));
        entryRepo.save(FinancialLedgerEntry.builder()
                .transactionGroupId(txnId).account(acct).order(order)
                .entryType(FinancialLedgerEntry.EntryType.DEBIT).amount(amount).description(desc).build());
        acct.setBalance(acct.getBalance() + amount);
        accountRepo.save(acct);
    }

    private void credit(UUID txnId, String code, long amount, Order order, String desc) {
        FinancialLedgerAccount acct = accountRepo.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Ledger account not found: " + code));
        entryRepo.save(FinancialLedgerEntry.builder()
                .transactionGroupId(txnId).account(acct).order(order)
                .entryType(FinancialLedgerEntry.EntryType.CREDIT).amount(amount).description(desc).build());
        acct.setBalance(acct.getBalance() - amount);
        accountRepo.save(acct);
    }
}
