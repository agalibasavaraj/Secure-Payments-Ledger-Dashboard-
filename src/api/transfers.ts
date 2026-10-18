import { apiClient, executeApi } from './client';
import { mockBackend, TransactionModel } from './mockBackend';

export interface TransferPayload {
  fromWalletId: number;
  toWalletId: number;
  amountMinor: number;
}

export interface TransferResponse {
  id: number;
  idempotencyKey?: string;
  fromWalletId: number;
  toWalletId: number;
  amountMinor: number;
  status: 'SUCCESS' | 'FAILED' | 'FLAGGED' | 'BLOCKED';
  failureReason?: string;
  createdAt: string;
}

export async function createTransfer(
  payload: TransferPayload,
  idempotencyKey: string,
  userId = 1
): Promise<TransferResponse> {
  return executeApi<TransferResponse>(
    () =>
      apiClient.post<TransferResponse>('/transfers', payload, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }),
    () =>
      mockBackend.transfer(userId, idempotencyKey, payload) as TransactionModel
  );
}
