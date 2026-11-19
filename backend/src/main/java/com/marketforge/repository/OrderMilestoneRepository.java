package com.marketforge.repository;

import com.marketforge.entity.OrderMilestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderMilestoneRepository extends JpaRepository<OrderMilestone, Long> {
    List<OrderMilestone> findByOrderIdOrderByMilestoneIndexAsc(Long orderId);

    @Query("SELECT COALESCE(SUM(m.sellerPayoutAmount), 0) FROM OrderMilestone m " +
           "WHERE m.order.seller.id = :sellerId AND m.status = 'approved' " +
           "AND m.order.status NOT IN ('RELEASED', 'PAID_OUT', 'CONFIRMED')")
    Long sumApprovedMilestonesPayoutForActiveOrders(@Param("sellerId") Long sellerId);

    @Query("SELECT m FROM OrderMilestone m " +
           "WHERE m.order.seller.id = :sellerId AND m.status = 'approved' " +
           "AND m.order.status NOT IN ('RELEASED', 'PAID_OUT', 'CONFIRMED') " +
           "ORDER BY m.approvedAt DESC")
    List<OrderMilestone> findApprovedMilestonesForActiveOrders(@Param("sellerId") Long sellerId);
}
