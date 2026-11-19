package com.marketforge.repository;

import com.marketforge.entity.DisputeResolution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DisputeResolutionRepository extends JpaRepository<DisputeResolution, Long> {
    Optional<DisputeResolution> findByDisputeId(Long disputeId);
}
