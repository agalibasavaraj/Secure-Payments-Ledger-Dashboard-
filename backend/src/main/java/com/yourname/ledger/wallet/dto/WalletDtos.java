package com.yourname.ledger.wallet.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

public class WalletDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WalletResponse {
        private Long id;
        private Long balanceMinor;
        private String currency;
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopUpRequest {
        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be strictly positive")
        private Long amountMinor;
    }
}
