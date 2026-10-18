-- ====================================================================
-- Secure Payments Ledger - Flyway Migration V1__init.sql
-- PostgreSQL DDL for Concurrency-Safe Ledger & Fraud Surveillance
-- ====================================================================

-- 1. Users Table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'USER',
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Wallets Table (Strict Non-Negative Check & Optimistic Lock Version)
CREATE TABLE wallets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    balance_minor BIGINT NOT NULL DEFAULT 0 CHECK (balance_minor >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- 3. Transactions Table (Unique (user_id, idempotency_key) constraint)
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    idempotency_key VARCHAR(128) NOT NULL,
    request_hash VARCHAR(256) NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    from_wallet_id BIGINT NOT NULL,
    to_wallet_id BIGINT NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    status VARCHAR(32) NOT NULL, -- SUCCESS, FAILED, FLAGGED, BLOCKED
    failure_reason VARCHAR(512) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_idempotency UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- 4. Double-Entry Append-Only Ledger Entries
CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    type VARCHAR(16) NOT NULL, -- DEBIT, CREDIT
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    balance_after_minor BIGINT NOT NULL CHECK (balance_after_minor >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_entries_wallet ON ledger_entries(wallet_id, created_at DESC);

-- 5. Fraud Flags
CREATE TABLE fraud_flags (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    rule_name VARCHAR(128) NOT NULL,
    details VARCHAR(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_flags_rule ON fraud_flags(rule_name);

-- 6. Append-Only Audit Logs
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    entity VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NULL,
    ip_address VARCHAR(64) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
