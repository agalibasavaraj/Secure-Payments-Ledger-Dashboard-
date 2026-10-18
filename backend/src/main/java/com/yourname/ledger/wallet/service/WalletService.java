package com.yourname.ledger.wallet.service;

import com.yourname.ledger.audit.service.AuditService;
import com.yourname.ledger.common.exceptions.CustomExceptions.*;
import com.yourname.ledger.transaction.entity.LedgerEntry;
import com.yourname.ledger.transaction.entity.Transaction;
import com.yourname.ledger.transaction.repository.LedgerEntryRepository;
import com.yourname.ledger.transaction.repository.TransactionRepository;
import com.yourname.ledger.wallet.dto.WalletDtos.*;
import com.yourname.ledger.wallet.entity.Wallet;
import com.yourname.ledger.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AuditService auditService;

    @Transactional
    public WalletResponse createWallet(Long userId, String ipAddress) {
        return walletRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElseGet(() -> {
                    Wallet wallet = Wallet.builder()
                            .userId(userId)
                            .balanceMinor(0L)
                            .currency("INR")
                            .build();
                    Wallet saved = walletRepository.save(wallet);
                    auditService.logAction(userId, "WALLET_CREATED", "Wallet", saved.getId().toString(), ipAddress);
                    return toResponse(saved);
                });
    }

    @Transactional(readOnly = true)
    public WalletResponse getWallet(Long walletId, Long authenticatedUserId) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet #" + walletId + " not found"));

        // Enforce strict ownership check
        if (!wallet.getUserId().equals(authenticatedUserId)) {
            throw new UnauthorizedWalletAccessException("Access denied: You do not own wallet #" + walletId);
        }

        return toResponse(wallet);
    }

    @Transactional(readOnly = true)
    public WalletResponse getWalletByUserId(Long userId) {
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new WalletNotFoundException("No wallet associated with user #" + userId));
        return toResponse(wallet);
    }

    @Transactional
    public WalletResponse topUp(Long walletId, Long amountMinor, Long authenticatedUserId, String ipAddress) {
        Wallet wallet = walletRepository.findByIdForUpdate(walletId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet #" + walletId + " not found"));

        // Enforce ownership check
        if (!wallet.getUserId().equals(authenticatedUserId)) {
            throw new UnauthorizedWalletAccessException("Access denied: You do not own wallet #" + walletId);
        }

        if (amountMinor <= 0) {
            throw new IllegalArgumentException("Top-up amount must be strictly greater than 0 paise");
        }

        long newBalance = wallet.getBalanceMinor() + amountMinor;
        wallet.setBalanceMinor(newBalance);
        Wallet updatedWallet = walletRepository.save(wallet);

        // Record simulated deposit transaction
        Transaction depositTx = Transaction.builder()
                .idempotencyKey(UUID.randomUUID().toString())
                .requestHash("TOPUP-" + walletId + "-" + amountMinor)
                .userId(authenticatedUserId)
                .fromWalletId(0L) // 0L represents External Top-up
                .toWalletId(walletId)
                .amountMinor(amountMinor)
                .status("SUCCESS")
                .build();
        Transaction savedTx = transactionRepository.save(depositTx);

        // Double-entry credit ledger entry
        LedgerEntry entry = LedgerEntry.builder()
                .transactionId(savedTx.getId())
                .walletId(walletId)
                .type("CREDIT")
                .amountMinor(amountMinor)
                .balanceAfterMinor(newBalance)
                .build();
        ledgerEntryRepository.save(entry);

        auditService.logAction(authenticatedUserId, "WALLET_TOPUP", "Wallet", walletId.toString(), ipAddress);
        return toResponse(updatedWallet);
    }

    private WalletResponse toResponse(Wallet wallet) {
        return WalletResponse.builder()
                .id(wallet.getId())
                .balanceMinor(wallet.getBalanceMinor())
                .currency(wallet.getCurrency())
                .createdAt(wallet.getCreatedAt())
                .build();
    }
}
