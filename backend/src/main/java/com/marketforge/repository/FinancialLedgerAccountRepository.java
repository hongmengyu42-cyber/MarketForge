package com.marketforge.repository;

import com.marketforge.entity.FinancialLedgerAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FinancialLedgerAccountRepository extends JpaRepository<FinancialLedgerAccount, Long> {
    Optional<FinancialLedgerAccount> findByCode(String code);
}
