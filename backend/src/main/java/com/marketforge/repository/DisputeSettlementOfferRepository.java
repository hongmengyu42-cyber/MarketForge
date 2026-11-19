package com.marketforge.repository;

import com.marketforge.entity.DisputeSettlementOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DisputeSettlementOfferRepository extends JpaRepository<DisputeSettlementOffer, Long> {
    List<DisputeSettlementOffer> findByDisputeIdOrderByCreatedAtDesc(Long disputeId);
    Optional<DisputeSettlementOffer> findFirstByDisputeIdAndStatusOrderByCreatedAtDesc(Long disputeId, String status);
}
