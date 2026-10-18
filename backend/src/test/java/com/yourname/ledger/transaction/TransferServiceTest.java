package com.yourname.ledger.transaction;

import com.yourname.ledger.audit.service.AuditService;
import com.yourname.ledger.common.exceptions.CustomExceptions.*;
import com.yourname.ledger.fraud.engine.FraudEngine;
import com.yourname.ledger.fraud.rules.FraudRule.FraudResult;
import com.yourname.ledger.transaction.dto.TransferDtos.TransferRequest;
import com.yourname.ledger.transaction.dto.TransferDtos.TransactionResponse;
import com.yourname.ledger.transaction.entity.Transaction;
import com.yourname.ledger.transaction.repository.LedgerEntryRepository;
import com.yourname.ledger.transaction.repository.TransactionRepository;
import com.yourname.ledger.transaction.service.TransferService;
import com.yourname.ledger.wallet.entity.Wallet;
import com.yourname.ledger.wallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransferServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private LedgerEntryRepository ledgerEntryRepository;

    @Mock
    private FraudEngine fraudEngine;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private TransferService transferService;

    private Wallet senderWallet;
    private Wallet recipientWallet;

    @BeforeEach
    void setUp() {
        senderWallet = Wallet.builder()
                .id(1L)
                .userId(100L)
                .balanceMinor(50000L) // ₹500.00
                .currency("INR")
                .build();

        recipientWallet = Wallet.builder()
                .id(2L)
                .userId(200L)
                .balanceMinor(10000L) // ₹100.00
                .currency("INR")
                .build();
    }

    @Test
    @DisplayName("Should successfully transfer funds and debit sender, credit recipient")
    void testSuccessfulTransfer() {
        TransferRequest request = TransferRequest.builder()
                .fromWalletId(1L)
                .toWalletId(2L)
                .amountMinor(20000L) // ₹200.00
                .build();

        when(transactionRepository.findByUserIdAndIdempotencyKey(eq(100L), anyString()))
                .thenReturn(Optional.empty());
        when(walletRepository.findById(1L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findById(2L)).thenReturn(Optional.of(recipientWallet));
        when(fraudEngine.evaluateAll(any())).thenReturn(Collections.emptyList());
        when(walletRepository.lockAllByIdOrdered(anyList())).thenReturn(List.of(senderWallet, recipientWallet));

        Transaction savedTx = Transaction.builder()
                .id(101L)
                .fromWalletId(1L)
                .toWalletId(2L)
                .amountMinor(20000L)
                .status("SUCCESS")
                .build();
        when(transactionRepository.save(any())).thenReturn(savedTx);

        TransactionResponse response = transferService.processTransfer(100L, "test-key-1", request, "127.0.0.1");

        assertNotNull(response);
        assertEquals("SUCCESS", response.getStatus());
        assertEquals(30000L, senderWallet.getBalanceMinor()); // 50000 - 20000
        assertEquals(30000L, recipientWallet.getBalanceMinor()); // 10000 + 20000
        verify(ledgerEntryRepository, times(2)).save(any());
        verify(auditService).logAction(eq(100L), eq("TRANSFER_EXECUTED"), any(), any(), any());
    }

    @Test
    @DisplayName("Should reject with InsufficientFundsException when sender balance is too low")
    void testInsufficientFunds() {
        TransferRequest request = TransferRequest.builder()
                .fromWalletId(1L)
                .toWalletId(2L)
                .amountMinor(80000L) // ₹800.00 (> balance of ₹500.00)
                .build();

        when(transactionRepository.findByUserIdAndIdempotencyKey(any(), any())).thenReturn(Optional.empty());
        when(walletRepository.findById(1L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findById(2L)).thenReturn(Optional.of(recipientWallet));
        when(fraudEngine.evaluateAll(any())).thenReturn(Collections.emptyList());
        when(walletRepository.lockAllByIdOrdered(anyList())).thenReturn(List.of(senderWallet, recipientWallet));

        assertThrows(InsufficientFundsException.class, () ->
                transferService.processTransfer(100L, "test-key-2", request, "127.0.0.1")
        );
        verify(transactionRepository).save(argThat(tx -> "FAILED".equals(tx.getStatus())));
    }

    @Test
    @DisplayName("Should retain a blocked transaction and fraud flags when velocity rules reject a transfer")
    void testBlockedTransferIsRecorded() {
        TransferRequest request = TransferRequest.builder()
                .fromWalletId(1L)
                .toWalletId(2L)
                .amountMinor(1000L)
                .build();
        Transaction blockedTransaction = Transaction.builder()
                .id(102L)
                .status("BLOCKED")
                .build();

        when(transactionRepository.findByUserIdAndIdempotencyKey(100L, "blocked-key"))
                .thenReturn(Optional.empty());
        when(walletRepository.findById(1L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findById(2L)).thenReturn(Optional.of(recipientWallet));
        when(transactionRepository.findUserTransactionsSince(eq(100L), any()))
                .thenReturn(Collections.emptyList());
        when(transactionRepository.findUserPastSuccessfulTransfers(eq(100L), any()))
                .thenReturn(Collections.emptyList());
        when(fraudEngine.evaluateAll(any()))
                .thenReturn(List.of(FraudResult.blocked("Velocity rule", "Velocity threshold exceeded")));
        when(transactionRepository.save(any())).thenReturn(blockedTransaction);

        assertThrows(FraudBlockedException.class, () ->
                transferService.processTransfer(100L, "blocked-key", request, "127.0.0.1"));

        verify(transactionRepository).save(argThat(tx -> "BLOCKED".equals(tx.getStatus())));
        verify(fraudEngine).persistFlags(eq(102L), anyList());
        verify(walletRepository, never()).lockAllByIdOrdered(anyList());
    }

    @Test
    @DisplayName("Should reject transfer when fromWallet and toWallet are identical")
    void testSameWalletTransfer() {
        TransferRequest request = TransferRequest.builder()
                .fromWalletId(1L)
                .toWalletId(1L)
                .amountMinor(1000L)
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                transferService.processTransfer(100L, "key-same", request, "127.0.0.1")
        );
    }

    @Test
    @DisplayName("Should reject transfer with UnauthorizedWalletAccessException if caller does not own sender wallet")
    void testWrongOwnerTransfer() {
        TransferRequest request = TransferRequest.builder()
                .fromWalletId(1L)
                .toWalletId(2L)
                .amountMinor(1000L)
                .build();

        when(transactionRepository.findByUserIdAndIdempotencyKey(any(), any())).thenReturn(Optional.empty());
        when(walletRepository.findById(1L)).thenReturn(Optional.of(senderWallet)); // owner is 100L

        // Caller is 999L
        assertThrows(UnauthorizedWalletAccessException.class, () ->
                transferService.processTransfer(999L, "key-unauth", request, "127.0.0.1")
        );
    }
}
