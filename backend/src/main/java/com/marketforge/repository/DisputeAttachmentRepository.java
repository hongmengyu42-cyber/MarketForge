package com.marketforge.repository;

import com.marketforge.entity.DisputeAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DisputeAttachmentRepository extends JpaRepository<DisputeAttachment, Long> {
    List<DisputeAttachment> findByDisputeIdOrderByCreatedAtDesc(Long disputeId);
}
