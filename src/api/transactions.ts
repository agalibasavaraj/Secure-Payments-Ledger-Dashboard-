import { apiClient, executeApi } from './client';
import { mockBackend, TransactionModel } from './mockBackend';

export interface Transaction {
  id: number;
  idempotencyKey?: string;
  fromWalletId: number;
  toWalletId: number;
  amountMinor: number;
  status: 'SUCCESS' | 'FAILED' | 'FLAGGED' | 'BLOCKED';
  failureReason?: string;
  createdAt: string;
}

export async function getTransactions(walletId?: number, userId?: number): Promise<Transaction[]> {
  return executeApi<Transaction[]>(
    () =>
      apiClient.get<Transaction[]>('/transactions', {
        params: walletId ? { walletId } : undefined,
      }),
    () => mockBackend.getTransactions(walletId, userId) as TransactionModel[]
  );
}
