package com.marketforge.repository;

import com.marketforge.entity.EmailLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
    Page<EmailLog> findAllByOrderBySentAtDesc(Pageable pageable);
    List<EmailLog> findByRecipientEmailOrderBySentAtDesc(String recipientEmail);
    List<EmailLog> findByOrderIdOrderBySentAtDesc(Long orderId);
}
