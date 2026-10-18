import { describe, it, expect } from 'vitest';
import { generateIdempotencyKey } from '../utils/uuid';
import { mockBackend } from '../api/mockBackend';

describe('Idempotency Key & Transfer Logic', () => {
  it('generates valid UUID v4 format keys', () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();

    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(key1).not.toBe(key2);
    // UUID v4 regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(key1)).toBe(true);
  });

  it('preserves the exact same transaction result when retried with identical Idempotency-Key', () => {
    mockBackend.resetDB();
    const idempotencyKey = generateIdempotencyKey();

    // First attempt: transfers ₹100.00 (10000 paise) from wallet 101 to 103
    const tx1 = mockBackend.transfer(1, idempotencyKey, {
      fromWalletId: 101,
      toWalletId: 103,
      amountMinor: 10000,
    });

    expect(tx1.status).toBe('SUCCESS');
    expect(tx1.id).toBeDefined();

    // Balance after first debit
    const walletAfterFirst = mockBackend.getWallet(101);

    // Second attempt: exact same payload and key (e.g. network retry or double submit)
    const tx2 = mockBackend.transfer(1, idempotencyKey, {
      fromWalletId: 101,
      toWalletId: 103,
      amountMinor: 10000,
    });

    // Must return the exact same transaction record
    expect(tx2.id).toBe(tx1.id);
    expect(tx2.amountMinor).toBe(tx1.amountMinor);

    // Balance must NOT be debited a second time!
    const walletAfterSecond = mockBackend.getWallet(101);
    expect(walletAfterSecond.balanceMinor).toBe(walletAfterFirst.balanceMinor);
  });

  it('rejects with 409 Conflict if same Idempotency-Key is reused with differing payload', () => {
    mockBackend.resetDB();
    const idempotencyKey = generateIdempotencyKey();

    mockBackend.transfer(1, idempotencyKey, {
      fromWalletId: 101,
      toWalletId: 103,
      amountMinor: 5000,
    });

    // Try reusing same key with a different amount (₹100 instead of ₹50)
    expect(() => {
      mockBackend.transfer(1, idempotencyKey, {
        fromWalletId: 101,
        toWalletId: 103,
        amountMinor: 10000,
      });
    }).toThrow();

    try {
      mockBackend.transfer(1, idempotencyKey, {
        fromWalletId: 101,
        toWalletId: 103,
        amountMinor: 10000,
      });
    } catch (err: any) {
      expect(err.status).toBe(409);
      expect(err.error).toBe('Conflict');
    }
  });

  it('evaluates Velocity Rule and throws 403 Forbidden when > 5 transfers are made in 60s', () => {
    mockBackend.resetDB();

    // Execute 5 rapid transfers
    for (let i = 0; i < 5; i++) {
      mockBackend.transfer(1, generateIdempotencyKey(), {
        fromWalletId: 101,
        toWalletId: 103,
        amountMinor: 100,
      });
    }

    // The 6th transfer must be BLOCKED with 403
    expect(() => {
      mockBackend.transfer(1, generateIdempotencyKey(), {
        fromWalletId: 101,
        toWalletId: 103,
        amountMinor: 100,
      });
    }).toThrow();

    try {
      mockBackend.transfer(1, generateIdempotencyKey(), {
        fromWalletId: 101,
        toWalletId: 103,
        amountMinor: 100,
      });
    } catch (err: any) {
      expect(err.status).toBe(403);
      expect(err.error).toBe('Fraud Blocked');
      expect(err.message).toContain('Velocity rule triggered');
    }
  });
});
