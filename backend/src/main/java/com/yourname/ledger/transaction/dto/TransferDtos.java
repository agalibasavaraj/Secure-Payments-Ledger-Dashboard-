package com.yourname.ledger.transaction.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

public class TransferDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TransferRequest {
        @NotNull(message = "fromWalletId is required")
        private Long fromWalletId;

        @NotNull(message = "toWalletId is required")
        private Long toWalletId;

        @NotNull(message = "amountMinor is required")
        @Positive(message = "Amount must be strictly positive")
        private Long amountMinor;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TransactionResponse {
        private Long id;
        private String idempotencyKey;
        private Long fromWalletId;
        private Long toWalletId;
        private Long amountMinor;
        private String status;
        private String failureReason;
        private Instant createdAt;
    }
}
