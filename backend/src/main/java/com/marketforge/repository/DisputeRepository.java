package com.marketforge.repository;

import com.marketforge.entity.Dispute;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DisputeRepository extends JpaRepository<Dispute, Long> {

    Optional<Dispute> findByOrderId(Long orderId);

    boolean existsByOrderId(Long orderId);

    @Query("SELECT d FROM Dispute d LEFT JOIN FETCH d.order o " +
           "LEFT JOIN FETCH o.buyer LEFT JOIN FETCH o.seller " +
           "LEFT JOIN FETCH d.raisedBy " +
           "WHERE (:status IS NULL OR d.status = :status)")
    Page<Dispute> findAllWithFilters(@Param("status") String status, Pageable pageable);

    @Query("SELECT COUNT(d) FROM Dispute d WHERE d.status = 'open' OR d.status = 'under_review'")
    long countOpenDisputes();
}
