package com.yourname.ledger.fraud;

import com.yourname.ledger.fraud.engine.FraudEngine;
import com.yourname.ledger.fraud.repository.FraudFlagRepository;
import com.yourname.ledger.fraud.rules.FraudRule.*;
import com.yourname.ledger.transaction.entity.Transaction;
import com.yourname.ledger.wallet.entity.Wallet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class FraudEngineTest {

    @Mock
    private FraudFlagRepository fraudFlagRepository;

    @InjectMocks
    private FraudEngine fraudEngine;

    @BeforeEach
    void init() {
        ReflectionTestUtils.setField(fraudEngine, "highAmountThreshold", 5000000L); // ₹50k
        ReflectionTestUtils.setField(fraudEngine, "velocityMaxTransfers", 5);
        ReflectionTestUtils.setField(fraudEngine, "unusualAmountMultiplier", 5.0);
        ReflectionTestUtils.setField(fraudEngine, "minHistoryForUnusual", 3);
        ReflectionTestUtils.setField(fraudEngine, "newWalletMaxAgeHours", 24);
        ReflectionTestUtils.setField(fraudEngine, "newWalletThreshold", 2000000L); // ₹20k
    }

    @Test
    @DisplayName("High Amount Rule - Boundary Test: Below, At, and Above Threshold")
    void testHighAmountRuleBoundaries() {
        TransferContext below = TransferContext.builder().amountMinor(4999999L).build();
        assertTrue(fraudEngine.evaluateAll(below).isEmpty());

        TransferContext atLimit = TransferContext.builder().amountMinor(5000000L).build();
        assertTrue(fraudEngine.evaluateAll(atLimit).isEmpty());

        TransferContext above = TransferContext.builder().amountMinor(5000001L).build();
        List<FraudResult> results = fraudEngine.evaluateAll(above);
        assertEquals(1, results.size());
        assertEquals(FraudResult.Decision.FLAGGED, results.get(0).getDecision());
        assertEquals("High amount rule", results.get(0).getRuleName());
    }

    @Test
    @DisplayName("Velocity Rule - Boundary Test: 4, 5, and 6 Transfers in 60s")
    void testVelocityRuleBoundaries() {
        TransferContext fourTransfers = TransferContext.builder()
                .amountMinor(1000L)
                .transfersInLast60Seconds(4)
                .build();
        assertTrue(fraudEngine.evaluateAll(fourTransfers).isEmpty());

        TransferContext atLimitFive = TransferContext.builder()
                .amountMinor(1000L)
                .transfersInLast60Seconds(5)
                .build();
        List<FraudResult> blockedAtLimit = fraudEngine.evaluateAll(atLimitFive);
        assertEquals(1, blockedAtLimit.size());
        assertEquals(FraudResult.Decision.BLOCKED, blockedAtLimit.get(0).getDecision());
        assertEquals("Velocity rule", blockedAtLimit.get(0).getRuleName());
    }

    @Test
    @DisplayName("Unusual Amount Rule - Boundary Test: Average 10,000 paise with 5x multiplier (50,000 threshold)")
    void testUnusualAmountRuleBoundaries() {
        List<Transaction> history = List.of(
                Transaction.builder().amountMinor(10000L).build(),
                Transaction.builder().amountMinor(10000L).build(),
                Transaction.builder().amountMinor(10000L).build()
        );

        TransferContext below = TransferContext.builder()
                .amountMinor(49999L)
                .userRecentTransactions(history)
                .build();
        assertTrue(fraudEngine.evaluateAll(below).isEmpty());

        TransferContext above = TransferContext.builder()
                .amountMinor(50001L)
                .userRecentTransactions(history)
                .build();
        List<FraudResult> results = fraudEngine.evaluateAll(above);
        assertEquals(1, results.size());
        assertEquals(FraudResult.Decision.FLAGGED, results.get(0).getDecision());
        assertEquals("Unusual amount rule", results.get(0).getRuleName());
    }
}
