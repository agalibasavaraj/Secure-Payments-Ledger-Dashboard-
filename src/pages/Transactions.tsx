import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  History,
  Filter,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Transaction, getTransactions } from '../api/transactions';
import { getUserWallet, Wallet } from '../api/wallets';
import { formatMoney } from '../utils/money';
import { StatusBadge, TransactionStatus } from '../components/StatusBadge';
import { TableSkeleton } from '../components/Skeleton';
import { useApiConfig } from '../context/ApiConfigContext';
import { BackendApiError } from '../api/client';

export function Transactions() {
  const { user } = useAuth();
  const { mode, baseUrl, setMode, setIsConfigModalOpen } = useApiConfig();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const w = await getUserWallet(user.userId);
      setWallet(w);
      const txs = await getTransactions(w?.id, user.userId);
      setTransactions(txs);
    } catch (err) {
      const apiErr = err as BackendApiError;
      setTransactions([]);
      if (mode === 'LIVE') {
        setFetchError(apiErr.message || `Unable to load transactions from Spring Boot API at ${baseUrl}.`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, mode, baseUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Search query by id, fromWalletId, toWalletId, reason
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.id.toString().includes(q) ||
          t.fromWalletId.toString().includes(q) ||
          t.toWalletId.toString().includes(q) ||
          (t.failureReason && t.failureReason.toLowerCase().includes(q))
      );
    }

    // Sort by date
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [transactions, statusFilter, searchQuery, sortOrder]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Transaction History
            </h1>
            {mode === 'DEMO' ? (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900">
                Fictional Demo Records
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900">
                Spring Boot DB
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'DEMO'
              ? 'Displaying local fictional simulation records. Not loaded from live backend.'
              : 'Immutable audit records from Spring Boot PostgreSQL database.'}
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by TX ID, Wallet ID, or reason..."
            className="block w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {['ALL', 'SUCCESS', 'FLAGGED', 'BLOCKED', 'FAILED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            title={`Sort Date: ${sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <History className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-base font-bold text-slate-700">No matching transactions found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try clearing the search query or status filter to see other ledger records.'
                : 'No transactions have been performed yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-[11px] uppercase font-semibold text-slate-500 border-b border-slate-100 tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Date &amp; Time</th>
                  <th className="py-3.5 px-6">Transaction ID</th>
                  <th className="py-3.5 px-6">From Wallet</th>
                  <th className="py-3.5 px-6">To Wallet</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Reason / Rule Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransactions.map((tx) => {
                  const isSender = wallet ? tx.fromWalletId === wallet.id : false;
                  const isTopUp = tx.fromWalletId === 0;

                  // Highlighting flagged (amber) and blocked (dark red) rows
                  const rowBg =
                    tx.status === 'BLOCKED'
                      ? 'bg-red-50/70 hover:bg-red-100/60'
                      : tx.status === 'FLAGGED'
                      ? 'bg-amber-50/70 hover:bg-amber-100/60'
                      : 'hover:bg-slate-50/70';

                  return (
                    <tr key={tx.id} className={`transition-colors ${rowBg}`}>
                      {/* Date */}
                      <td className="py-4 px-6 text-xs text-slate-600 font-mono whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Transaction ID */}
                      <td className="py-4 px-6 font-mono text-xs font-bold text-slate-900">
                        #{tx.id}
                      </td>

                      {/* From Wallet */}
                      <td className="py-4 px-6 font-mono text-xs text-slate-700">
                        {isTopUp ? (
                          <span className="text-indigo-600 font-sans font-semibold">
                            System (Top-up)
                          </span>
                        ) : (
                          <span>
                            #{tx.fromWalletId} {isSender && '(You)'}
                          </span>
                        )}
                      </td>

                      {/* To Wallet */}
                      <td className="py-4 px-6 font-mono text-xs text-slate-700">
                        #{tx.toWalletId} {!isSender && !isTopUp && '(You)'}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 font-mono font-bold text-xs whitespace-nowrap">
                        <span
                          className={
                            isTopUp || !isSender ? 'text-emerald-700' : 'text-slate-900'
                          }
                        >
                          {isTopUp || !isSender ? '+' : '-'}
                          {formatMoney(tx.amountMinor)}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6">
                        <StatusBadge status={tx.status} size="sm" />
                      </td>

                      {/* Reason */}
                      <td className="py-4 px-6 text-xs text-slate-600 max-w-xs">
                        {tx.failureReason ? (
                          <div className="flex items-start gap-1.5">
                            {tx.status === 'BLOCKED' ? (
                              <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                            ) : tx.status === 'FLAGGED' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            ) : null}
                            <span className="leading-snug">{tx.failureReason}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Settled to ledger</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredTransactions.length)} of{' '}
            {filteredTransactions.length} entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
