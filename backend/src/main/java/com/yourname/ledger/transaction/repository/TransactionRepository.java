package com.yourname.ledger.transaction.repository;

import com.yourname.ledger.transaction.entity.Transaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Optional<Transaction> findByUserIdAndIdempotencyKey(Long userId, String idempotencyKey);

    List<Transaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT t FROM Transaction t WHERE t.fromWalletId = :walletId OR t.toWalletId = :walletId ORDER BY t.createdAt DESC")
    List<Transaction> findByWalletId(@Param("walletId") Long walletId);

    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.createdAt >= :since ORDER BY t.createdAt DESC")
    List<Transaction> findUserTransactionsSince(@Param("userId") Long userId, @Param("since") Instant since);

    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.status = 'SUCCESS' ORDER BY t.createdAt DESC")
    List<Transaction> findUserPastSuccessfulTransfers(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.createdAt >= :start AND t.createdAt < :end")
    long countBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.status = :status AND t.createdAt >= :start AND t.createdAt < :end")
    long countByStatusBetween(@Param("status") String status, @Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT COALESCE(SUM(t.amountMinor), 0) FROM Transaction t WHERE (t.status = 'SUCCESS' OR t.status = 'FLAGGED') AND t.createdAt >= :start AND t.createdAt < :end")
    long sumVolumeBetween(@Param("start") Instant start, @Param("end") Instant end);
}
