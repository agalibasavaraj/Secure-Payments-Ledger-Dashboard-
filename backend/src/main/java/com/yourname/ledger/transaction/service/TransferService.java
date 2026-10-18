package com.yourname.ledger.transaction.service;

import com.yourname.ledger.audit.service.AuditService;
import com.yourname.ledger.common.exceptions.CustomExceptions.*;
import com.yourname.ledger.fraud.engine.FraudEngine;
import com.yourname.ledger.fraud.rules.FraudRule.*;
import com.yourname.ledger.transaction.dto.TransferDtos.*;
import com.yourname.ledger.transaction.entity.LedgerEntry;
import com.yourname.ledger.transaction.entity.Transaction;
import com.yourname.ledger.transaction.repository.LedgerEntryRepository;
import com.yourname.ledger.transaction.repository.TransactionRepository;
import com.yourname.ledger.wallet.entity.Wallet;
import com.yourname.ledger.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final FraudEngine fraudEngine;
    private final AuditService auditService;

    public String computeRequestHash(TransferRequest req) {
        return req.getFromWalletId() + ":" + req.getToWalletId() + ":" + req.getAmountMinor();
    }

    @Transactional(
            isolation = Isolation.READ_COMMITTED,
            noRollbackFor = {FraudBlockedException.class, InsufficientFundsException.class}
    )
    public TransactionResponse processTransfer(
            Long authenticatedUserId,
            String idempotencyKey,
            TransferRequest request,
            String ipAddress
    ) {
        // Step 1: Input Validation
        if (request.getAmountMinor() == null || request.getAmountMinor() <= 0) {
            throw new IllegalArgumentException("Transfer amount must be strictly greater than 0 minor units");
        }
        if (request.getFromWalletId().equals(request.getToWalletId())) {
            throw new IllegalArgumentException("Cannot transfer to the same wallet");
        }
        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing required Idempotency-Key header");
        }

        String requestHash = computeRequestHash(request);

        // Step 2: Idempotency Check
        Optional<Transaction> existingTx = transactionRepository.findByUserIdAndIdempotencyKey(
                authenticatedUserId, idempotencyKey
        );

        if (existingTx.isPresent()) {
            Transaction tx = existingTx.get();
            if (!tx.getRequestHash().equals(requestHash)) {
                throw new DuplicateRequestException(
                        "Idempotency-Key " + idempotencyKey + " was already used with a different request payload"
                );
            }
            // Exact same key and payload: return existing result
            return toResponse(tx);
        }

        // Step 3: Verify caller owns from-wallet
        Wallet fromWalletCheck = walletRepository.findById(request.getFromWalletId())
                .orElseThrow(() -> new WalletNotFoundException("Sender wallet #" + request.getFromWalletId() + " not found"));

        if (!fromWalletCheck.getUserId().equals(authenticatedUserId)) {
            throw new UnauthorizedWalletAccessException("Access denied: You do not own wallet #" + request.getFromWalletId());
        }

        Wallet toWalletCheck = walletRepository.findById(request.getToWalletId())
                .orElseThrow(() -> new WalletNotFoundException("Recipient wallet #" + request.getToWalletId() + " not found"));

        if (!fromWalletCheck.getCurrency().equals(toWalletCheck.getCurrency())) {
            throw new IllegalArgumentException("Cross-currency transfers are not supported");
        }

        // Step 4: Run Fraud Engine
        Instant sixtySecondsAgo = Instant.now().minusSeconds(60);
        List<Transaction> recent60s = transactionRepository.findUserTransactionsSince(authenticatedUserId, sixtySecondsAgo);
        List<Transaction> userPast10 = transactionRepository.findUserPastSuccessfulTransfers(authenticatedUserId, PageRequest.of(0, 10));

        TransferContext context = TransferContext.builder()
                .userId(authenticatedUserId)
                .fromWalletId(request.getFromWalletId())
                .toWalletId(request.getToWalletId())
                .amountMinor(request.getAmountMinor())
                .fromWallet(fromWalletCheck)
                .userRecentTransactions(userPast10)
                .transfersInLast60Seconds(recent60s.size())
                .build();

        List<FraudResult> fraudResults = fraudEngine.evaluateAll(context);

        // Check if any rule evaluates to BLOCKED (e.g. Velocity Rule)
        Optional<FraudResult> blockedResult = fraudResults.stream()
                .filter(r -> r.getDecision() == FraudResult.Decision.BLOCKED)
                .findFirst();

        if (blockedResult.isPresent()) {
            FraudResult blocked = blockedResult.get();
            // Record BLOCKED transaction
            Transaction blockedTx = Transaction.builder()
                    .idempotencyKey(idempotencyKey)
                    .requestHash(requestHash)
                    .userId(authenticatedUserId)
                    .fromWalletId(request.getFromWalletId())
                    .toWalletId(request.getToWalletId())
                    .amountMinor(request.getAmountMinor())
                    .status("BLOCKED")
                    .failureReason(blocked.getDetails())
                    .build();
            Transaction savedBlocked = transactionRepository.save(blockedTx);
            fraudEngine.persistFlags(savedBlocked.getId(), fraudResults);

            auditService.logAction(authenticatedUserId, "TRANSFER_BLOCKED", "Transaction", savedBlocked.getId().toString(), ipAddress);
            throw new FraudBlockedException(blocked.getDetails());
        }

        // Determine if transfer is FLAGGED
        boolean isFlagged = fraudResults.stream()
                .anyMatch(r -> r.getDecision() == FraudResult.Decision.FLAGGED);
        String flagReason = isFlagged
                ? fraudResults.stream()
                .filter(r -> r.getDecision() == FraudResult.Decision.FLAGGED)
                .map(FraudResult::getDetails)
                .reduce((a, b) -> a + "; " + b)
                .orElse("Flagged by automated fraud rules")
                : null;

        // Step 5: Pessimistic Ordered Locking & Atomic Debit/Credit
        // Lock both wallets in ascending ID order to strictly avoid deadlocks
        List<Long> orderedIds = Arrays.asList(
                Math.min(request.getFromWalletId(), request.getToWalletId()),
                Math.max(request.getFromWalletId(), request.getToWalletId())
        );

        List<Wallet> lockedWallets = walletRepository.lockAllByIdOrdered(orderedIds);
        Wallet lockedFrom = lockedWallets.stream()
                .filter(w -> w.getId().equals(request.getFromWalletId()))
                .findFirst()
                .orElseThrow(() -> new WalletNotFoundException("Sender wallet not found during lock"));

        Wallet lockedTo = lockedWallets.stream()
                .filter(w -> w.getId().equals(request.getToWalletId()))
                .findFirst()
                .orElseThrow(() -> new WalletNotFoundException("Recipient wallet not found during lock"));

        // Balance Check
        if (lockedFrom.getBalanceMinor() < request.getAmountMinor()) {
            Transaction failedTx = Transaction.builder()
                    .idempotencyKey(idempotencyKey)
                    .requestHash(requestHash)
                    .userId(authenticatedUserId)
                    .fromWalletId(request.getFromWalletId())
                    .toWalletId(request.getToWalletId())
                    .amountMinor(request.getAmountMinor())
                    .status("FAILED")
                    .failureReason("Insufficient funds in sender wallet")
                    .build();
            transactionRepository.save(failedTx);
            auditService.logAction(authenticatedUserId, "TRANSFER_INSUFFICIENT_FUNDS", "Transaction", failedTx.getId().toString(), ipAddress);

            throw new InsufficientFundsException(
                    "Insufficient funds. Current balance: " + lockedFrom.getBalanceMinor() + " paise, requested: " + request.getAmountMinor() + " paise"
            );
        }

        // Debit Sender, Credit Receiver
        long fromNewBalance = lockedFrom.getBalanceMinor() - request.getAmountMinor();
        long toNewBalance = lockedTo.getBalanceMinor() + request.getAmountMinor();

        lockedFrom.setBalanceMinor(fromNewBalance);
        lockedTo.setBalanceMinor(toNewBalance);

        walletRepository.save(lockedFrom);
        walletRepository.save(lockedTo);

        // Record Transaction
        String finalStatus = isFlagged ? "FLAGGED" : "SUCCESS";
        Transaction tx = Transaction.builder()
                .idempotencyKey(idempotencyKey)
                .requestHash(requestHash)
                .userId(authenticatedUserId)
                .fromWalletId(request.getFromWalletId())
                .toWalletId(request.getToWalletId())
                .amountMinor(request.getAmountMinor())
                .status(finalStatus)
                .failureReason(flagReason)
                .build();
        Transaction savedTx = transactionRepository.save(tx);

        // Record Ledger Entries (Debit & Credit)
        LedgerEntry debitEntry = LedgerEntry.builder()
                .transactionId(savedTx.getId())
                .walletId(lockedFrom.getId())
                .type("DEBIT")
                .amountMinor(request.getAmountMinor())
                .balanceAfterMinor(fromNewBalance)
                .build();

        LedgerEntry creditEntry = LedgerEntry.builder()
                .transactionId(savedTx.getId())
                .walletId(lockedTo.getId())
                .type("CREDIT")
                .amountMinor(request.getAmountMinor())
                .balanceAfterMinor(toNewBalance)
                .build();

        ledgerEntryRepository.save(debitEntry);
        ledgerEntryRepository.save(creditEntry);

        // Save triggered fraud flags if any
        if (isFlagged) {
            fraudEngine.persistFlags(savedTx.getId(), fraudResults);
        }

        // Step 7: Audit Log
        auditService.logAction(authenticatedUserId, "TRANSFER_EXECUTED", "Transaction", savedTx.getId().toString(), ipAddress);

        return toResponse(savedTx);
    }

    private TransactionResponse toResponse(Transaction tx) {
        return TransactionResponse.builder()
                .id(tx.getId())
                .idempotencyKey(tx.getIdempotencyKey())
                .fromWalletId(tx.getFromWalletId())
                .toWalletId(tx.getToWalletId())
                .amountMinor(tx.getAmountMinor())
                .status(tx.getStatus())
                .failureReason(tx.getFailureReason())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
