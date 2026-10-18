package com.yourname.ledger.transaction.repository;

import com.yourname.ledger.transaction.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {
    List<LedgerEntry> findByWalletIdOrderByCreatedAtDesc(Long walletId);
    List<LedgerEntry> findByTransactionId(Long transactionId);
}
