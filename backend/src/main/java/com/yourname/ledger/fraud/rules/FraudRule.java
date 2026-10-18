package com.yourname.ledger.fraud.rules;

import com.yourname.ledger.transaction.entity.Transaction;
import com.yourname.ledger.wallet.entity.Wallet;
import lombok.Builder;
import lombok.Data;

import java.util.List;

public interface FraudRule {

    @Data
    @Builder
    class TransferContext {
        private Long userId;
        private Long fromWalletId;
        private Long toWalletId;
        private Long amountMinor;
        private Wallet fromWallet;
        private List<Transaction> userRecentTransactions; // Last 10 transfers
        private long transfersInLast60Seconds;
    }

    @Data
    @Builder
    class FraudResult {
        private boolean passed;
        private Decision decision; // PASSED, FLAGGED, BLOCKED
        private String ruleName;
        private String details;

        public enum Decision {
            PASSED,
            FLAGGED,
            BLOCKED
        }

        public static FraudResult passed() {
            return FraudResult.builder()
                    .passed(true)
                    .decision(Decision.PASSED)
                    .build();
        }

        public static FraudResult flagged(String ruleName, String details) {
            return FraudResult.builder()
                    .passed(false)
                    .decision(Decision.FLAGGED)
                    .ruleName(ruleName)
                    .details(details)
                    .build();
        }

        public static FraudResult blocked(String ruleName, String details) {
            return FraudResult.builder()
                    .passed(false)
                    .decision(Decision.BLOCKED)
                    .ruleName(ruleName)
                    .details(details)
                    .build();
        }
    }

    FraudResult evaluate(TransferContext ctx);
}
