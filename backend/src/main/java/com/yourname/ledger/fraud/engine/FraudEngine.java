package com.yourname.ledger.fraud.engine;

import com.yourname.ledger.fraud.entity.FraudFlag;
import com.yourname.ledger.fraud.repository.FraudFlagRepository;
import com.yourname.ledger.fraud.rules.FraudRule;
import com.yourname.ledger.fraud.rules.FraudRule.*;
import com.yourname.ledger.transaction.entity.Transaction;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FraudEngine {

    private final FraudFlagRepository fraudFlagRepository;

    @Value("${fraud.rules.high-amount.threshold-minor:5000000}")
    private long highAmountThreshold;

    @Value("${fraud.rules.velocity.max-transfers-per-window:5}")
    private int velocityMaxTransfers;

    @Value("${fraud.rules.unusual-amount.multiplier:5.0}")
    private double unusualAmountMultiplier;

    @Value("${fraud.rules.unusual-amount.min-history-count:3}")
    private int minHistoryForUnusual;

    @Value("${fraud.rules.new-wallet.max-age-hours:24}")
    private int newWalletMaxAgeHours;

    @Value("${fraud.rules.new-wallet.threshold-minor:2000000}")
    private long newWalletThreshold;

    public List<FraudResult> evaluateAll(TransferContext ctx) {
        List<FraudResult> results = new ArrayList<>();

        // 1. Velocity Rule (> 5 transfers in 60 seconds -> BLOCKED 403)
        if (ctx.getTransfersInLast60Seconds() >= velocityMaxTransfers) {
            results.add(FraudResult.blocked(
                    "Velocity rule",
                    "Velocity threshold exceeded: User initiated " + ctx.getTransfersInLast60Seconds() + " transfers in the last 60 seconds (limit: " + velocityMaxTransfers + ")"
            ));
        }

        // 2. High Amount Rule (> 5,000,000 minor units / ₹50,000 -> FLAGGED)
        if (ctx.getAmountMinor() > highAmountThreshold) {
            results.add(FraudResult.flagged(
                    "High amount rule",
                    "Transfer amount (" + ctx.getAmountMinor() + " paise) exceeds high risk threshold of " + highAmountThreshold + " paise (₹50,000)"
            ));
        }

        // 3. Unusual Amount Rule (> 5x user's average of last 10 transfers -> FLAGGED)
        List<Transaction> pastTxs = ctx.getUserRecentTransactions();
        if (pastTxs != null && pastTxs.size() >= minHistoryForUnusual) {
            double average = pastTxs.stream()
                    .mapToLong(Transaction::getAmountMinor)
                    .average()
                    .orElse(0.0);

            if (average > 0 && ctx.getAmountMinor() > (unusualAmountMultiplier * average)) {
                results.add(FraudResult.flagged(
                        "Unusual amount rule",
                        "Transfer amount (" + ctx.getAmountMinor() + " paise) is " + String.format("%.1f", ctx.getAmountMinor() / average) + "x the user's historical average of " + Math.round(average) + " paise"
                ));
            }
        }

        // 4. New Wallet Risk Rule (wallet younger than 24h sending > ₹20,000 -> FLAGGED)
        if (ctx.getFromWallet() != null && ctx.getFromWallet().getCreatedAt() != null) {
            Duration age = Duration.between(ctx.getFromWallet().getCreatedAt(), Instant.now());
            if (age.toHours() < newWalletMaxAgeHours && ctx.getAmountMinor() > newWalletThreshold) {
                results.add(FraudResult.flagged(
                        "New wallet risk",
                        "Wallet created " + age.toHours() + "h ago sending large amount exceeding " + newWalletThreshold + " paise (₹20,000)"
                ));
            }
        }

        return results;
    }

    public void persistFlags(Long transactionId, List<FraudResult> triggers) {
        for (FraudResult res : triggers) {
            if (res.getDecision() != FraudResult.Decision.PASSED) {
                FraudFlag flag = FraudFlag.builder()
                        .transactionId(transactionId)
                        .ruleName(res.getRuleName())
                        .details(res.getDetails())
                        .build();
                fraudFlagRepository.save(flag);
            }
        }
    }
}
