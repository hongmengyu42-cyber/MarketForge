package com.marketforge.repository;

import com.marketforge.entity.FinancialLedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FinancialLedgerEntryRepository extends JpaRepository<FinancialLedgerEntry, Long> {

    @Query("SELECT e FROM FinancialLedgerEntry e LEFT JOIN FETCH e.account " +
           "WHERE e.order.id = :orderId ORDER BY e.createdAt ASC")
    List<FinancialLedgerEntry> findByOrderId(@Param("orderId") Long orderId);

    @Query("SELECT e FROM FinancialLedgerEntry e LEFT JOIN FETCH e.account " +
           "ORDER BY e.createdAt DESC")
    Page<FinancialLedgerEntry> findRecentEntries(Pageable pageable);

    @Query("SELECT SUM(e.amount) FROM FinancialLedgerEntry e WHERE e.account.code = :accountCode AND e.entryType = 'CREDIT'")
    Long sumCreditsByAccount(@Param("accountCode") String accountCode);
}
