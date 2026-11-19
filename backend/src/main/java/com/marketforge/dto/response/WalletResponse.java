package com.marketforge.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class WalletResponse {
    private Double availableBalance;
    private Double pendingClearance;
    private Double inEscrow;
    private Double lifetimeEarnings;
    private Double totalWithdrawn;
    private Double totalSpent;

    private boolean stripeConnected;
    private String stripeAccountId;
    private String defaultPayoutMethod;

    @Builder.Default
    private List<WalletTransactionResponse> transactions = new ArrayList<>();

    @Builder.Default
    private List<PayoutRequestResponse> payoutRequests = new ArrayList<>();
}
