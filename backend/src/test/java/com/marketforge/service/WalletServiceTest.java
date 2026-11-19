package com.marketforge.service;

import com.marketforge.dto.request.CreatePayoutRequest;
import com.marketforge.dto.response.WalletResponse;
import com.marketforge.entity.PayoutRequest;
import com.marketforge.entity.User;
import com.marketforge.exception.BusinessException;
import com.marketforge.repository.OrderMilestoneRepository;
import com.marketforge.repository.OrderRepository;
import com.marketforge.repository.PayoutRequestRepository;
import com.marketforge.repository.SellerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderMilestoneRepository milestoneRepository;

    @Mock
    private PayoutRequestRepository payoutRequestRepository;

    @Mock
    private SellerProfileRepository sellerProfileRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private WalletService walletService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(10L)
                .name("Seller Bob")
                .email("bob@marketforge.dev")
                .build();
    }

    @Test
    @DisplayName("RequestPayout: throws INSUFFICIENT_FUNDS when withdrawal exceeds available balance")
    void requestPayout_insufficientBalance_throwsException() {
        // Earned $100 (10000 cents), already withdrawn $80 (8000 cents) => Available $20
        when(orderRepository.sumEarnedBySellerId(10L)).thenReturn(10000L);
        when(milestoneRepository.sumApprovedMilestonesPayoutForActiveOrders(10L)).thenReturn(0L);
        when(payoutRequestRepository.sumTotalWithdrawnByUserId(10L)).thenReturn(8000L);

        CreatePayoutRequest req = new CreatePayoutRequest();
        req.setAmount(50.0); // requesting $50 > available $20
        req.setPayoutMethod("STRIPE_CONNECT");

        assertThatThrownBy(() -> walletService.requestPayout(testUser, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("exceeds your available balance");

        verify(payoutRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("RequestPayout: successfully creates payout and dispatches notification when balance is sufficient")
    void requestPayout_sufficientBalance_success() {
        // Earned $500, withdrawn $100 => Available $400
        when(orderRepository.sumEarnedBySellerId(10L)).thenReturn(50000L);
        when(milestoneRepository.sumApprovedMilestonesPayoutForActiveOrders(10L)).thenReturn(0L);
        when(payoutRequestRepository.sumTotalWithdrawnByUserId(10L)).thenReturn(10000L);

        // Mock getWallet() calls triggered on return
        when(orderRepository.sumEscrowBySellerId(10L)).thenReturn(0L);
        when(orderRepository.sumEscrowByBuyerId(10L)).thenReturn(0L);
        when(orderRepository.sumSpentByBuyerId(10L)).thenReturn(0L);
        when(orderRepository.findBySellerId(eq(10L), any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(orderRepository.findByBuyerId(eq(10L), any(Pageable.class))).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(milestoneRepository.findApprovedMilestonesForActiveOrders(10L)).thenReturn(Collections.emptyList());
        when(payoutRequestRepository.findByUserIdOrderByCreatedAtDesc(10L)).thenReturn(Collections.emptyList());

        CreatePayoutRequest req = new CreatePayoutRequest();
        req.setAmount(200.0); // $200 <= $400 available
        req.setPayoutMethod("STRIPE_CONNECT");
        req.setDestinationDetails("Stripe Express (acct_test123)");

        WalletResponse resp = walletService.requestPayout(testUser, req);

        assertThat(resp).isNotNull();
        verify(payoutRequestRepository).save(any(PayoutRequest.class));
        verify(notificationService).send(eq(testUser), eq("wallet"), anyString(), anyString(), anyString());
        verify(emailService).sendPayoutCompleted(eq(testUser), any(PayoutRequest.class));
    }
}
