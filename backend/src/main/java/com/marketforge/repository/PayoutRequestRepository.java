package com.marketforge.repository;

import com.marketforge.entity.PayoutRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayoutRequestRepository extends JpaRepository<PayoutRequest, Long> {

    List<PayoutRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<PayoutRequest> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PayoutRequest p WHERE p.user.id = :userId AND p.status IN ('COMPLETED', 'PROCESSING', 'PENDING')")
    Long sumTotalWithdrawnByUserId(@Param("userId") Long userId);
}
