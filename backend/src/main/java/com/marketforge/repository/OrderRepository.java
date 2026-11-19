package com.marketforge.repository;

import com.marketforge.entity.Order;
import com.marketforge.entity.Order.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.listing l LEFT JOIN FETCH l.images " +
           "LEFT JOIN FETCH o.buyer LEFT JOIN FETCH o.seller " +
           "WHERE o.buyer.id = :buyerId ORDER BY o.createdAt DESC")
    Page<Order> findByBuyerId(@Param("buyerId") Long buyerId, Pageable pageable);

    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.listing l LEFT JOIN FETCH l.images " +
           "LEFT JOIN FETCH o.buyer LEFT JOIN FETCH o.seller " +
           "WHERE o.seller.id = :sellerId ORDER BY o.createdAt DESC")
    Page<Order> findBySellerId(@Param("sellerId") Long sellerId, Pageable pageable);

    // For auto-release scheduler — orders delivered >72h ago not yet confirmed/disputed
    @Query("SELECT o FROM Order o WHERE o.status = 'DELIVERED' " +
           "AND o.autoReleaseAt IS NOT NULL AND o.autoReleaseAt <= :now")
    List<Order> findOrdersReadyForAutoRelease(@Param("now") LocalDateTime now);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status IN ('AUTHORIZED', 'IN_PROGRESS', 'DELIVERED')")
    long countActiveOrders();

    @Query("SELECT SUM(o.amountTotal) FROM Order o WHERE o.status IN ('RELEASED', 'PAID_OUT', 'CONFIRMED')")
    Long sumCompletedOrdersRevenue();

    @Query("SELECT COALESCE(SUM(o.sellerPayoutAmount), 0) FROM Order o WHERE o.seller.id = :sellerId AND o.status IN ('IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED')")
    Long sumEscrowBySellerId(@Param("sellerId") Long sellerId);

    @Query("SELECT COALESCE(SUM(o.sellerPayoutAmount), 0) FROM Order o WHERE o.seller.id = :sellerId AND o.status IN ('RELEASED', 'PAID_OUT', 'CONFIRMED')")
    Long sumEarnedBySellerId(@Param("sellerId") Long sellerId);

    @Query("SELECT COALESCE(SUM(o.amountTotal), 0) FROM Order o WHERE o.buyer.id = :buyerId AND o.status IN ('IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED')")
    Long sumEscrowByBuyerId(@Param("buyerId") Long buyerId);

    @Query("SELECT COALESCE(SUM(o.amountTotal), 0) FROM Order o WHERE o.buyer.id = :buyerId AND o.status IN ('RELEASED', 'PAID_OUT', 'CONFIRMED')")
    Long sumSpentByBuyerId(@Param("buyerId") Long buyerId);

    Page<Order> findAll(Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.status = 'DELIVERED' AND o.autoReleaseAt IS NOT NULL AND o.autoReleaseAt <= :now")
    java.util.List<Order> findDeliveredOrdersReadyForAutoRelease(@org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now);

    @Query("SELECT o FROM Order o WHERE o.status = 'DELIVERED' AND o.autoReleaseAt IS NOT NULL AND o.autoReleaseAt BETWEEN :from AND :to")
    java.util.List<Order> findDeliveredOrdersAutoReleaseBetween(
            @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDateTime to);


    org.springframework.data.domain.Page<Order> findByStatus(
            Order.OrderStatus status,
            org.springframework.data.domain.Pageable pageable);

    long countByStatus(Order.OrderStatus status);

}