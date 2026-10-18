package com.yourname.ledger.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourname.ledger.audit.service.AuditService;
import com.yourname.ledger.auth.entity.User;
import com.yourname.ledger.auth.jwt.JwtService;
import com.yourname.ledger.auth.repository.UserRepository;
import com.yourname.ledger.fraud.repository.FraudFlagRepository;
import com.yourname.ledger.transaction.dto.TransferDtos.TransferRequest;
import com.yourname.ledger.transaction.entity.Transaction;
import com.yourname.ledger.transaction.repository.TransactionRepository;
import com.yourname.ledger.wallet.entity.Wallet;
import com.yourname.ledger.wallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TransferFailurePersistenceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private FraudFlagRepository fraudFlagRepository;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private AuditService auditService;

    private User sender;
    private Wallet senderWallet;
    private Wallet recipientWallet;

    @BeforeEach
    void setUp() {
        sender = userRepository.save(User.builder()
                .email("transfer-" + UUID.randomUUID() + "@example.com")
                .passwordHash("test-only")
                .role("USER")
                .build());
        User recipient = userRepository.save(User.builder()
                .email("recipient-" + UUID.randomUUID() + "@example.com")
                .passwordHash("test-only")
                .role("USER")
                .build());
        senderWallet = walletRepository.save(Wallet.builder()
                .userId(sender.getId())
                .balanceMinor(5_000L)
                .currency("INR")
                .build());
        recipientWallet = walletRepository.save(Wallet.builder()
                .userId(recipient.getId())
                .balanceMinor(0L)
                .currency("INR")
                .build());
    }

    @Test
    void insufficientFundsResponseKeepsFailedTransactionForIdempotency() throws Exception {
        String key = UUID.randomUUID().toString();
        TransferRequest request = request(6_000L);

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", bearerToken())
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        Transaction failed = transactionRepository.findByUserIdAndIdempotencyKey(sender.getId(), key)
                .orElseThrow();
        assertEquals("FAILED", failed.getStatus());
        assertEquals(5_000L, walletRepository.findById(senderWallet.getId()).orElseThrow().getBalanceMinor());
    }

    @Test
    void fraudBlockedResponseKeepsTransactionAndFlagsForIdempotency() throws Exception {
        for (int i = 0; i < 5; i++) {
            transactionRepository.save(Transaction.builder()
                    .idempotencyKey("history-" + UUID.randomUUID())
                    .requestHash("history")
                    .userId(sender.getId())
                    .fromWalletId(senderWallet.getId())
                    .toWalletId(recipientWallet.getId())
                    .amountMinor(1_000L)
                    .status("SUCCESS")
                    .build());
        }

        String key = UUID.randomUUID().toString();
        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", bearerToken())
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request(1_000L))))
                .andExpect(status().isForbidden());

        Transaction blocked = transactionRepository.findByUserIdAndIdempotencyKey(sender.getId(), key)
                .orElseThrow();
        assertEquals("BLOCKED", blocked.getStatus());
        assertFalse(fraudFlagRepository.findByTransactionId(blocked.getId()).isEmpty());
        assertEquals(5_000L, walletRepository.findById(senderWallet.getId()).orElseThrow().getBalanceMinor());
    }

    private TransferRequest request(long amountMinor) {
        return TransferRequest.builder()
                .fromWalletId(senderWallet.getId())
                .toWalletId(recipientWallet.getId())
                .amountMinor(amountMinor)
                .build();
    }

    private String bearerToken() {
        return "Bearer " + jwtService.generateToken(sender.getId(), sender.getEmail(), sender.getRole());
    }
}
