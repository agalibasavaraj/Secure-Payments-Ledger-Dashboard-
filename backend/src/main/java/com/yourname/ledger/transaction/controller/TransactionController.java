package com.yourname.ledger.transaction.controller;

import com.yourname.ledger.auth.entity.User;
import com.yourname.ledger.auth.repository.UserRepository;
import com.yourname.ledger.transaction.dto.TransferDtos.TransactionResponse;
import com.yourname.ledger.transaction.entity.Transaction;
import com.yourname.ledger.transaction.repository.TransactionRepository;
import com.yourname.ledger.wallet.repository.WalletRepository;
import com.yourname.ledger.common.exceptions.CustomExceptions.WalletNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
@Tag(name = "Transactions", description = "Query immutable transaction ledger history")
public class TransactionController {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;

    private Long getAuthenticatedUserId(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .map(User::getId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @GetMapping
    @Operation(summary = "List transactions", description = "Returns transaction ledger for authenticated user or specific wallet")
    public ResponseEntity<List<TransactionResponse>> getTransactions(
            @RequestParam(required = false) Long walletId,
            Authentication auth
    ) {
        Long userId = getAuthenticatedUserId(auth);
        List<Transaction> list;

        if (walletId != null) {
            walletRepository.findByIdAndUserId(walletId, userId)
                    .orElseThrow(() -> new WalletNotFoundException("Wallet not found"));
            list = transactionRepository.findByWalletId(walletId);
        } else {
            list = transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }

        List<TransactionResponse> responses = list.stream()
                .map(t -> TransactionResponse.builder()
                        .id(t.getId())
                        .idempotencyKey(t.getIdempotencyKey())
                        .fromWalletId(t.getFromWalletId())
                        .toWalletId(t.getToWalletId())
                        .amountMinor(t.getAmountMinor())
                        .status(t.getStatus())
                        .failureReason(t.getFailureReason())
                        .createdAt(t.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }
}
