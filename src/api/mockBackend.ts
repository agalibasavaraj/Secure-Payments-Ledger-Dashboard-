/**
 * In-browser Mock / Sandbox Backend Engine for Secure Payments Ledger.
 * Implements the exact same database schema, business rules, idempotency logic,
 * pessimistic balance tracking, and the 4 fraud engine rules specified for Spring Boot:
 * 1. High Amount Rule (> 5,000,000 minor units / ₹50,000 -> FLAGGED)
 * 2. Velocity Rule (> 5 transfers in 60s -> BLOCKED 403)
 * 3. Unusual Amount Rule (> 5x user's average of last 10 transfers -> FLAGGED)
 * 4. New Wallet Risk Rule (wallet younger than 24h sending > ₹20,000 -> FLAGGED)
 * Also simulates account lockout (5 failed logins -> locked for 5 minutes).
 */

export interface WalletModel {
  id: number;
  userId: number;
  balanceMinor: number;
  currency: string;
  createdAt: string;
  version: number;
}

export interface TransactionModel {
  id: number;
  idempotencyKey: string;
  requestHash: string;
  userId: number;
  fromWalletId: number;
  toWalletId: number;
  amountMinor: number;
  status: 'SUCCESS' | 'FAILED' | 'FLAGGED' | 'BLOCKED';
  failureReason?: string;
  createdAt: string;
}

export interface FraudFlagModel {
  id: number;
  transactionId: number;
  ruleName: string;
  details: string;
  createdAt: string;
}

export interface UserAccount {
  id: number;
  email: string;
  password: string; // In real Spring Boot, BCrypt hashed
  role: 'USER' | 'ADMIN';
  failedAttempts: number;
  lockedUntil: number | null; // timestamp ms
  createdAt: string;
}

const STORAGE_KEY = 'secure_payments_ledger_db_v1';

interface DBState {
  users: UserAccount[];
  wallets: WalletModel[];
  transactions: TransactionModel[];
  fraudFlags: FraudFlagModel[];
}

function getInitialDB(): DBState {
  const now = new Date();
  const createdDate = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();

  return {
    users: [
      {
        id: 1,
        email: 'user@example.com',
        password: 'Password123!',
        role: 'USER',
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: createdDate,
      },
      {
        id: 2,
        email: 'admin@ledger.com',
        password: 'AdminPassword123!',
        role: 'ADMIN',
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: createdDate,
      },
      {
        id: 3,
        email: 'recipient@merchant.in',
        password: 'Password123!',
        role: 'USER',
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: createdDate,
      },
    ],
    wallets: [
      {
        id: 101,
        userId: 1,
        balanceMinor: 2500000, // ₹25,000.00
        currency: 'INR',
        createdAt: createdDate,
        version: 1,
      },
      {
        id: 102,
        userId: 2,
        balanceMinor: 10000000, // ₹1,00,000.00
        currency: 'INR',
        createdAt: createdDate,
        version: 1,
      },
      {
        id: 103,
        userId: 3,
        balanceMinor: 150000, // ₹1,500.00
        currency: 'INR',
        createdAt: createdDate,
        version: 1,
      },
    ],
    transactions: [
      {
        id: 1001,
        idempotencyKey: 'a1b2c3d4-0001-4000-8000-000000000001',
        requestHash: 'hash1',
        userId: 1,
        fromWalletId: 101,
        toWalletId: 103,
        amountMinor: 25000, // ₹250.00
        status: 'SUCCESS',
        createdAt: new Date(now.getTime() - 36 * 3600 * 1000).toISOString(),
      },
      {
        id: 1002,
        idempotencyKey: 'a1b2c3d4-0002-4000-8000-000000000002',
        requestHash: 'hash2',
        userId: 1,
        fromWalletId: 101,
        toWalletId: 103,
        amountMinor: 5500000, // ₹55,000.00
        status: 'FLAGGED',
        failureReason: 'Triggered High Amount rule (> ₹50,000)',
        createdAt: new Date(now.getTime() - 20 * 3600 * 1000).toISOString(),
      },
      {
        id: 1003,
        idempotencyKey: 'a1b2c3d4-0003-4000-8000-000000000003',
        requestHash: 'hash3',
        userId: 1,
        fromWalletId: 101,
        toWalletId: 103,
        amountMinor: 120000, // ₹1,200.00
        status: 'SUCCESS',
        createdAt: new Date(now.getTime() - 8 * 3600 * 1000).toISOString(),
      },
      {
        id: 1004,
        idempotencyKey: 'a1b2c3d4-0004-4000-8000-000000000004',
        requestHash: 'hash4',
        userId: 1,
        fromWalletId: 101,
        toWalletId: 103,
        amountMinor: 75000,
        status: 'BLOCKED',
        failureReason: 'Velocity rule exceeded: > 5 transfers in 60s',
        createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      },
    ],
    fraudFlags: [
      {
        id: 1,
        transactionId: 1002,
        ruleName: 'High amount rule',
        details: 'Amount ₹55,000 exceeded threshold of ₹50,000',
        createdAt: new Date(now.getTime() - 20 * 3600 * 1000).toISOString(),
      },
      {
        id: 2,
        transactionId: 1004,
        ruleName: 'Velocity rule',
        details: 'User exceeded 5 transfers in 60 seconds',
        createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      },
    ],
  };
}

class MockBackendService {
  private db: DBState;

  constructor() {
    this.db = this.loadDB();
  }

  private loadDB(): DBState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    const initial = getInitialDB();
    this.saveDB(initial);
    return initial;
  }

  private saveDB(state: DBState = this.db) {
    this.db = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  public resetDB() {
    const initial = getInitialDB();
    this.saveDB(initial);
    return initial;
  }

  // Create mock JWT
  private createToken(user: UserAccount, walletId?: number): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = nowSec + 15 * 60; // 15-minute expiry per spec

    const payload = btoa(
      JSON.stringify({
        sub: user.email,
        email: user.email,
        userId: user.id,
        role: user.role,
        walletId,
        iat: nowSec,
        exp: expSec,
      })
    );
    return `${header}.${payload}.mockSignature_${Date.now()}`;
  }

  // POST /auth/register
  public register(email: string, password: string, role: 'USER' | 'ADMIN' = 'USER') {
    if (!email || !email.includes('@')) {
      throw {
        status: 400,
        error: 'Bad Request',
        message: 'A valid email address is required.',
        timestamp: new Date().toISOString(),
      };
    }
    if (!password || password.length < 8) {
      throw {
        status: 400,
        error: 'Bad Request',
        message: 'Password must be at least 8 characters.',
        timestamp: new Date().toISOString(),
      };
    }

    const existing = this.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw {
        status: 400,
        error: 'Bad Request',
        message: 'An account with this email already exists.',
        timestamp: new Date().toISOString(),
      };
    }

    const newUser: UserAccount = {
      id: Date.now(),
      email,
      password,
      role,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString(),
    };

    this.db.users.push(newUser);
    // Automatically create a wallet for newly registered users
    const newWallet: WalletModel = {
      id: Math.floor(100 + Math.random() * 900),
      userId: newUser.id,
      balanceMinor: 1000000, // ₹10,000 welcome demo balance
      currency: 'INR',
      createdAt: new Date().toISOString(),
      version: 1,
    };
    this.db.wallets.push(newWallet);
    this.saveDB();

    const token = this.createToken(newUser, newWallet.id);
    return { token, message: 'Registration successful' };
  }

  // POST /auth/login
  public login(email: string, password: string) {
    const user = this.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const now = Date.now();

    if (!user) {
      throw {
        status: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password.',
        timestamp: new Date().toISOString(),
      };
    }

    // Check account lockout (5 minutes)
    if (user.lockedUntil && now < user.lockedUntil) {
      const remainingMinutes = Math.ceil((user.lockedUntil - now) / 60000);
      throw {
        status: 403,
        error: 'Account Locked',
        message: `Account is temporarily locked due to 5 failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
        timestamp: new Date().toISOString(),
      };
    }

    if (user.password !== password) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= 5) {
        user.lockedUntil = now + 5 * 60 * 1000; // 5 min lockout
        this.saveDB();
        throw {
          status: 403,
          error: 'Account Locked',
          message: 'Account locked for 5 minutes due to 5 consecutive failed login attempts.',
          timestamp: new Date().toISOString(),
        };
      }
      this.saveDB();
      throw {
        status: 401,
        error: 'Unauthorized',
        message: `Invalid email or password. Attempt ${user.failedAttempts} of 5 before account lock.`,
        timestamp: new Date().toISOString(),
      };
    }

    // Reset failed attempts on success
    user.failedAttempts = 0;
    user.lockedUntil = null;
    this.saveDB();

    const wallet = this.db.wallets.find((w) => w.userId === user.id);
    const token = this.createToken(user, wallet?.id);
    return { token };
  }

  // POST /wallets
  public createWallet(userId: number) {
    const existing = this.db.wallets.find((w) => w.userId === userId);
    if (existing) {
      return existing;
    }
    const wallet: WalletModel = {
      id: Math.floor(200 + Math.random() * 800),
      userId,
      balanceMinor: 0,
      currency: 'INR',
      createdAt: new Date().toISOString(),
      version: 1,
    };
    this.db.wallets.push(wallet);
    this.saveDB();
    return wallet;
  }

  // GET /wallets/{id}
  public getWallet(walletId: number) {
    const wallet = this.db.wallets.find((w) => w.id === walletId);
    if (!wallet) {
      throw {
        status: 404,
        error: 'Not Found',
        message: `Wallet with ID ${walletId} not found.`,
        timestamp: new Date().toISOString(),
      };
    }
    return wallet;
  }

  public getWalletForUser(userId: number) {
    return this.db.wallets.find((w) => w.userId === userId) || null;
  }

  // POST /wallets/{id}/topup
  public topup(walletId: number, amountMinor: number) {
    if (!amountMinor || amountMinor <= 0) {
      throw {
        status: 400,
        error: 'Bad Request',
        message: 'Top-up amount must be strictly greater than 0 minor units.',
        timestamp: new Date().toISOString(),
      };
    }
    const wallet = this.getWallet(walletId);
    wallet.balanceMinor += amountMinor;
    wallet.version += 1;

    // Record topup transaction
    const tx: TransactionModel = {
      id: Date.now(),
      idempotencyKey: `topup-${Date.now()}`,
      requestHash: 'topup',
      userId: wallet.userId,
      fromWalletId: 0, // system/bank
      toWalletId: wallet.id,
      amountMinor,
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };
    this.db.transactions.unshift(tx);
    this.saveDB();
    return wallet;
  }

  // POST /transfers
  public transfer(
    userId: number,
    idempotencyKey: string,
    body: { fromWalletId: number; toWalletId: number; amountMinor: number }
  ) {
    const { fromWalletId, toWalletId, amountMinor } = body;

    // 1. Validation
    if (!idempotencyKey) {
      throw {
        status: 400,
        error: 'Bad Request',
        message: 'Missing required Idempotency-Key header.',
        timestamp: new Date().toISOString(),
      };
    }
    if (!amountMinor || amountMinor <= 0) {
      throw {
        status: 400,
        error: 'Bad Request',
        message: 'Transfer amount must be strictly positive integer.',
        timestamp: new Date().toISOString(),
      };
    }
    if (fromWalletId === toWalletId) {
      throw {
        status: 400,
        error: 'Bad Request',
        message: 'Cannot transfer to the same wallet.',
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Idempotency Check
    const requestHash = `${fromWalletId}:${toWalletId}:${amountMinor}`;
    const existingTx = this.db.transactions.find(
      (t) => t.userId === userId && t.idempotencyKey === idempotencyKey
    );

    if (existingTx) {
      if (existingTx.requestHash !== requestHash) {
        throw {
          status: 409,
          error: 'Conflict',
          message:
            'Idempotency-Key was already used with a different request payload. Please generate a new key.',
          timestamp: new Date().toISOString(),
        };
      }
      // Return original result safely
      return existingTx;
    }

    // 3. Ownership & Wallet Check
    const fromWallet = this.getWallet(fromWalletId);
    if (fromWallet.userId !== userId) {
      throw {
        status: 403,
        error: 'Forbidden',
        message: 'Access denied: You do not own the sender wallet.',
        timestamp: new Date().toISOString(),
      };
    }

    const toWallet = this.getWallet(toWalletId);
    if (fromWallet.currency !== toWallet.currency) {
      throw {
        status: 400,
        error: 'Bad Request',
        message: 'Cross-currency transfers are not supported in demo.',
        timestamp: new Date().toISOString(),
      };
    }

    // Check Balance
    if (fromWallet.balanceMinor < amountMinor) {
      const failedTx: TransactionModel = {
        id: Date.now(),
        idempotencyKey,
        requestHash,
        userId,
        fromWalletId,
        toWalletId,
        amountMinor,
        status: 'FAILED',
        failureReason: 'Insufficient wallet balance.',
        createdAt: new Date().toISOString(),
      };
      this.db.transactions.unshift(failedTx);
      this.saveDB();
      throw {
        status: 400,
        error: 'Insufficient Funds',
        message: `Insufficient balance. Current balance is ₹${(fromWallet.balanceMinor / 100).toFixed(2)}, requested ₹${(amountMinor / 100).toFixed(2)}.`,
        timestamp: new Date().toISOString(),
      };
    }

    // 4. Fraud Engine Evaluation
    const now = Date.now();
    let status: 'SUCCESS' | 'FLAGGED' | 'BLOCKED' = 'SUCCESS';
    let failureReason: string | undefined = undefined;

    // Rule A: Velocity Rule (> 5 transfers in 60s) -> BLOCKED (403)
    const recent60sTransfers = this.db.transactions.filter(
      (t) => t.userId === userId && now - new Date(t.createdAt).getTime() <= 60 * 1000
    );
    if (recent60sTransfers.length >= 5) {
      status = 'BLOCKED';
      failureReason = 'Velocity rule triggered: More than 5 transfers attempted in 60 seconds.';
      const fraudFlag: FraudFlagModel = {
        id: Date.now(),
        transactionId: Date.now(),
        ruleName: 'Velocity rule',
        details: 'Exceeded 5 transfers in 60s',
        createdAt: new Date().toISOString(),
      };
      this.db.fraudFlags.push(fraudFlag);

      const blockedTx: TransactionModel = {
        id: Date.now(),
        idempotencyKey,
        requestHash,
        userId,
        fromWalletId,
        toWalletId,
        amountMinor,
        status: 'BLOCKED',
        failureReason,
        createdAt: new Date().toISOString(),
      };
      this.db.transactions.unshift(blockedTx);
      this.saveDB();

      throw {
        status: 403,
        error: 'Fraud Blocked',
        message: failureReason,
        timestamp: new Date().toISOString(),
      };
    }

    // Rule B: High Amount Rule (> 5,000,000 minor units / ₹50,000) -> FLAGGED
    if (amountMinor > 5000000) {
      status = 'FLAGGED';
      failureReason = 'High amount rule triggered: Transfer exceeds ₹50,000 threshold.';
      this.db.fraudFlags.push({
        id: Date.now(),
        transactionId: Date.now(),
        ruleName: 'High amount rule',
        details: `Amount minor ${amountMinor} (> 5,000,000)`,
        createdAt: new Date().toISOString(),
      });
    }

    // Rule C: Unusual Amount Rule (> 5x user's average of last 10 transfers) -> FLAGGED
    const userPastTxs = this.db.transactions.filter(
      (t) => t.userId === userId && t.status === 'SUCCESS'
    );
    if (userPastTxs.length >= 3) {
      const last10 = userPastTxs.slice(0, 10);
      const avg = last10.reduce((acc, curr) => acc + curr.amountMinor, 0) / last10.length;
      if (amountMinor > 5 * avg) {
        status = 'FLAGGED';
        failureReason = `Unusual amount rule triggered: Transfer is > 5x user's average of ₹${(avg / 100).toFixed(2)}.`;
        this.db.fraudFlags.push({
          id: Date.now() + 1,
          transactionId: Date.now(),
          ruleName: 'Unusual amount rule',
          details: `Amount ${amountMinor} > 5x average of ${avg}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Rule D: New Wallet Risk Rule (wallet younger than 24h sending > ₹20,000) -> FLAGGED
    const walletAgeMs = now - new Date(fromWallet.createdAt).getTime();
    if (walletAgeMs < 24 * 3600 * 1000 && amountMinor > 2000000) {
      status = 'FLAGGED';
      failureReason = 'New wallet risk rule: Wallet created < 24h ago sending large amount (> ₹20,000).';
      this.db.fraudFlags.push({
        id: Date.now() + 2,
        transactionId: Date.now(),
        ruleName: 'New wallet risk',
        details: 'Wallet younger than 24h sending high value',
        createdAt: new Date().toISOString(),
      });
    }

    // 5. Execute transfer atomically (debit sender, credit receiver)
    fromWallet.balanceMinor -= amountMinor;
    fromWallet.version += 1;
    toWallet.balanceMinor += amountMinor;
    toWallet.version += 1;

    const newTx: TransactionModel = {
      id: Date.now(),
      idempotencyKey,
      requestHash,
      userId,
      fromWalletId,
      toWalletId,
      amountMinor,
      status,
      failureReason,
      createdAt: new Date().toISOString(),
    };

    this.db.transactions.unshift(newTx);
    this.saveDB();

    return newTx;
  }

  // GET /transactions
  public getTransactions(walletId?: number, userId?: number) {
    if (walletId) {
      return this.db.transactions.filter(
        (t) => t.fromWalletId === walletId || t.toWalletId === walletId
      );
    }
    if (userId) {
      return this.db.transactions.filter((t) => t.userId === userId);
    }
    return this.db.transactions;
  }

  // GET /reports/daily?date=YYYY-MM-DD (ADMIN)
  public getDailyReport(dateStr: string) {
    // Filter transactions for that date, or all if none match date
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const txs = this.db.transactions.filter((t) => t.createdAt.startsWith(targetDate));

    // Fallback if no transactions on selected date to make demo rich and illustrative
    const pool = txs.length > 0 ? txs : this.db.transactions;
    const totalTransactions = pool.length;
    const successCount = pool.filter((t) => t.status === 'SUCCESS').length;
    const failedCount = pool.filter((t) => t.status === 'FAILED').length;
    const flaggedCount = pool.filter((t) => t.status === 'FLAGGED').length;
    const blockedCount = pool.filter((t) => t.status === 'BLOCKED').length;

    const successRate = totalTransactions > 0 ? Number(((successCount / totalTransactions) * 100).toFixed(1)) : 100.0;
    const failureRate = totalTransactions > 0 ? Number((((failedCount + blockedCount) / totalTransactions) * 100).toFixed(1)) : 0.0;

    const totalVolumeMinor = pool
      .filter((t) => t.status === 'SUCCESS' || t.status === 'FLAGGED')
      .reduce((sum, t) => sum + t.amountMinor, 0);

    return {
      date: targetDate,
      totalTransactions,
      successRate,
      failureRate,
      flaggedCount,
      blockedCount,
      totalVolumeMinor,
    };
  }

  // GET /reports/fraud-summary (ADMIN)
  public getFraudSummary() {
    const counts: Record<string, number> = {
      'High amount rule': 0,
      'Velocity rule': 0,
      'Unusual amount rule': 0,
      'New wallet risk': 0,
    };

    for (const flag of this.db.fraudFlags) {
      counts[flag.ruleName] = (counts[flag.ruleName] || 0) + 1;
    }

    return Object.entries(counts).map(([ruleName, count]) => ({
      ruleName,
      count,
    }));
  }
}

export const mockBackend = new MockBackendService();
