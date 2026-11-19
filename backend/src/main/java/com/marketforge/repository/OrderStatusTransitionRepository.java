package com.marketforge.repository;

import com.marketforge.entity.OrderStatusTransition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderStatusTransitionRepository extends JpaRepository<OrderStatusTransition, Long> {
    List<OrderStatusTransition> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}
