import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Coins,
  TrendingUp,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getDailyReport, getFraudSummary, DailyReportResponse, FraudSummaryItem } from '../api/reports';
import { formatMoney, formatMoneyCompact } from '../utils/money';
import { StatCard } from '../components/StatCard';
import { CardSkeleton } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { BackendApiError } from '../api/client';
import { useApiConfig } from '../context/ApiConfigContext';

const STATUS_COLORS = {
  Success: '#10b981', // emerald-500
  Flagged: '#f59e0b', // amber-500
  Blocked: '#dc2626', // red-600
  Failed: '#ef4444', // rose-500
};

export function AdminReports() {
  const { showError } = useToast();
  const { mode, baseUrl, setMode, setIsConfigModalOpen } = useApiConfig();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [dailyReport, setDailyReport] = useState<DailyReportResponse | null>(null);
  const [fraudSummary, setFraudSummary] = useState<FraudSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchReports = useCallback(async (date: string) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [daily, fraud] = await Promise.all([
        getDailyReport(date),
        getFraudSummary(),
      ]);
      setDailyReport(daily);
      setFraudSummary(fraud);
    } catch (err) {
      const apiErr = err as BackendApiError;
      if (mode === 'LIVE') {
        setFetchError(apiErr.message || `Unable to fetch reports from Spring Boot API at ${baseUrl}.`);
      }
      showError('Report Fetch Failed', apiErr.message);
    } finally {
      setIsLoading(false);
    }
  }, [showError, mode, baseUrl]);

  useEffect(() => {
    fetchReports(selectedDate);
  }, [selectedDate, fetchReports]);

  // Donut chart data for transaction breakdown
  const donutData = dailyReport
    ? [
        {
          name: 'Success',
          value: Math.max(
            0,
            dailyReport.totalTransactions -
              dailyReport.flaggedCount -
              dailyReport.blockedCount
          ),
          color: STATUS_COLORS.Success,
        },
        {
          name: 'Flagged',
          value: dailyReport.flaggedCount,
          color: STATUS_COLORS.Flagged,
        },
        {
          name: 'Blocked',
          value: dailyReport.blockedCount,
          color: STATUS_COLORS.Blocked,
        },
        {
          name: 'Failed',
          value: Math.max(
            0,
            Math.round(
              (dailyReport.totalTransactions * dailyReport.failureRate) / 100
            ) - dailyReport.blockedCount
          ),
          color: STATUS_COLORS.Failed,
        },
      ].filter((item) => item.value > 0)
    : [];

  // Bar chart data for fraud rules
  const barData = fraudSummary.map((item) => ({
    rule: item.ruleName,
    count: item.count,
  }));

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Admin Surveillance Console</span>
            </div>
            {mode === 'DEMO' ? (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900">
                Fictional Demo Analytics
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900">
                Spring Boot PostgreSQL Logs
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Daily Reports &amp; Fraud Surveillance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'DEMO'
              ? 'Displaying aggregate simulation statistics from client storage. Not retrieved from live backend.'
              : 'Real-time aggregate analytics, system volume, and fraud engine evaluation summaries from backend.'}
          </p>
        </div>

        {/* Date Picker & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => fetchReports(selectedDate)}
            disabled={isLoading}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {fetchError && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-300 bg-rose-50 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                Spring Boot API Connection Error
              </p>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">{fetchError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setMode('DEMO')}
              className="px-3 py-1.5 bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 rounded-xl text-xs font-bold transition-colors"
            >
              Switch to Fictional Demo
            </button>
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Configure URL
            </button>
          </div>
        </div>
      )}

      {/* 6 Stat Cards Grid */}
      {isLoading || !dailyReport ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <StatCard
            title="Total Transactions"
            value={dailyReport.totalTransactions}
            subtitle={`Recorded on ${selectedDate}`}
            icon={<FileSpreadsheet className="w-5 h-5" />}
            badge={{ text: 'Audited', variant: 'neutral' }}
          />

          <StatCard
            title="Success Rate"
            value={`${dailyReport.successRate}%`}
            subtitle="Atomic settlements committed"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            badge={{
              text: dailyReport.successRate >= 90 ? 'Healthy' : 'Degraded',
              variant: dailyReport.successRate >= 90 ? 'success' : 'danger',
            }}
          />

          <StatCard
            title="Failure Rate"
            value={`${dailyReport.failureRate}%`}
            subtitle="Includes blocked & rollbacks"
            icon={<XCircle className="w-5 h-5 text-rose-600" />}
            badge={{
              text: dailyReport.failureRate <= 10 ? 'Normal' : 'Elevated',
              variant: dailyReport.failureRate <= 10 ? 'success' : 'danger',
            }}
          />

          <StatCard
            title="Flagged Transfers"
            value={dailyReport.flaggedCount}
            subtitle="Flagged by heuristic rules"
            icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            badge={{ text: 'Under Review', variant: 'warning' }}
          />

          <StatCard
            title="Blocked Transfers"
            value={dailyReport.blockedCount}
            subtitle="Immediate 403 Forbidden"
            icon={<ShieldAlert className="w-5 h-5 text-red-600" />}
            badge={{ text: 'Enforced', variant: 'danger' }}
          />

          <StatCard
            title="Total Volume"
            value={formatMoney(dailyReport.totalVolumeMinor)}
            subtitle={`${formatMoneyCompact(dailyReport.totalVolumeMinor)} settled demo total`}
            icon={<Coins className="w-5 h-5 text-indigo-600" />}
            badge={{ text: 'Simulated', variant: 'info' }}
          />
        </div>
      )}

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Flags per Rule Bar Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Fraud Engine Hits by Rule
                </h3>
                <p className="text-xs text-slate-500">
                  Number of times each automated rule evaluated positive
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-400">
                Bar Chart
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="rule"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-10}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar
                    dataKey="count"
                    name="Trigger Count"
                    fill="#6366f1"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Rules: High amount (&gt;₹50k), Velocity (&gt;5 in 60s), Unusual amount (&gt;5x avg), New wallet risk.
          </div>
        </div>

        {/* Transaction Distribution Donut Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Transaction Disposition Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  Settlement ratio across SUCCESS, FLAGGED, BLOCKED, and FAILED
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-400">
                Donut Chart
              </span>
            </div>

            <div className="h-72 w-full pt-4 flex items-center justify-center">
              {donutData.length === 0 ? (
                <p className="text-xs text-slate-400">No transaction data available</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        border: 'none',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(val) => (
                        <span className="text-xs font-medium text-slate-700">{val}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Audit Trail:</span>
            <span className="font-semibold text-emerald-700">Append-Only Logs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
