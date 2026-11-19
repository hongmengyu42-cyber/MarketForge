package com.marketforge.repository;

import com.marketforge.entity.OrderDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderDeliveryRepository extends JpaRepository<OrderDelivery, Long> {
    List<OrderDelivery> findByOrderIdOrderByCreatedAtDesc(Long orderId);
}
