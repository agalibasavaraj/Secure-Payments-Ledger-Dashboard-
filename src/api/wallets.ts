import { apiClient, executeApi } from './client';
import { mockBackend } from './mockBackend';

export interface Wallet {
  id: number;
  userId?: number;
  balanceMinor: number;
  currency: string;
  createdAt: string;
  version?: number;
}

export async function createWallet(userId = 1): Promise<Wallet> {
  return executeApi<Wallet>(
    () => apiClient.post('/wallets'),
    () => mockBackend.createWallet(userId)
  );
}

export async function getWallet(id: number): Promise<Wallet> {
  return executeApi<Wallet>(
    () => apiClient.get(`/wallets/${id}`),
    () => mockBackend.getWallet(id)
  );
}

export async function topUpWallet(id: number, amountMinor: number): Promise<Wallet> {
  return executeApi<Wallet>(
    () => apiClient.post(`/wallets/${id}/topup`, { amountMinor }),
    () => mockBackend.topup(id, amountMinor)
  );
}

export async function getUserWallet(userId: number): Promise<Wallet | null> {
  return executeApi<Wallet | null>(
    () => apiClient.get<Wallet | null>('/wallets/me'),
    () => mockBackend.getWalletForUser(userId)
  );
}
