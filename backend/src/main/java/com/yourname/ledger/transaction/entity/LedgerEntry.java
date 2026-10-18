package com.yourname.ledger.transaction.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "ledger_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_id", nullable = false)
    private Long transactionId;

    @Column(name = "wallet_id", nullable = false)
    private Long walletId;

    @Column(nullable = false, length = 16)
    private String type; // DEBIT or CREDIT

    @Column(name = "amount_minor", nullable = false)
    private Long amountMinor;

    @Column(name = "balance_after_minor", nullable = false)
    private Long balanceAfterMinor;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
