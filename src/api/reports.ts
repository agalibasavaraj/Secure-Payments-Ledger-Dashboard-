import { apiClient, executeApi } from './client';
import { mockBackend } from './mockBackend';

export interface DailyReportResponse {
  date?: string;
  totalTransactions: number;
  successRate: number;
  failureRate: number;
  flaggedCount: number;
  blockedCount: number;
  totalVolumeMinor: number;
}

export interface FraudSummaryItem {
  ruleName: string;
  count: number;
}

export async function getDailyReport(dateStr: string): Promise<DailyReportResponse> {
  return executeApi<DailyReportResponse>(
    () => apiClient.get<DailyReportResponse>(`/reports/daily`, { params: { date: dateStr } }),
    () => mockBackend.getDailyReport(dateStr)
  );
}

export async function getFraudSummary(): Promise<FraudSummaryItem[]> {
  return executeApi<FraudSummaryItem[]>(
    () => apiClient.get<FraudSummaryItem[]>('/reports/fraud-summary'),
    () => mockBackend.getFraudSummary()
  );
}
