import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet as WalletIcon,
  PlusCircle,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  History,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Wallet, createWallet, getUserWallet, topUpWallet } from '../api/wallets';
import { Transaction, getTransactions } from '../api/transactions';
import { formatMoney, toMinorUnits } from '../utils/money';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { MoneyInput } from '../components/MoneyInput';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton';
import { BackendApiError } from '../api/client';
import { useApiConfig } from '../context/ApiConfigContext';

export function Dashboard() {
  const { user, updateUserWalletId } = useAuth();
  const { showSuccess, showError } = useToast();
  const { mode, baseUrl, setMode, setIsConfigModalOpen } = useApiConfig();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isLoadingTxs, setIsLoadingTxs] = useState(true);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Top Up Modal State
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmountMajor, setTopUpAmountMajor] = useState('');
  const [topUpAmountMinor, setTopUpAmountMinor] = useState(0);
  const [topUpError, setTopUpError] = useState<string | undefined>();
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);

  const fetchWalletAndTransactions = useCallback(async () => {
    if (!user) return;
    setIsLoadingWallet(true);
    setIsLoadingTxs(true);
    setFetchError(null);

    try {
      const w = await getUserWallet(user.userId);
      setWallet(w);
      if (w) {
        updateUserWalletId(w.id);
        const txs = await getTransactions(w.id, user.userId);
        setRecentTransactions(txs.slice(0, 5));
      } else {
        setRecentTransactions([]);
      }
    } catch (err) {
      const apiErr = err as BackendApiError;
      setWallet(null);
      if (mode === 'LIVE') {
        setFetchError(apiErr.message || `Unable to reach Spring Boot API at ${baseUrl}.`);
      }
    } finally {
      setIsLoadingWallet(false);
      setIsLoadingTxs(false);
    }
  }, [user, updateUserWalletId, mode, baseUrl]);

  useEffect(() => {
    fetchWalletAndTransactions();
  }, [fetchWalletAndTransactions]);

  const handleCreateWallet = async () => {
    if (!user) return;
    setIsCreatingWallet(true);
    try {
      const newWallet = await createWallet(user.userId);
      setWallet(newWallet);
      updateUserWalletId(newWallet.id);
      showSuccess('Wallet Created!', `Demo wallet #${newWallet.id} initialized with ₹0.00.`);
      fetchWalletAndTransactions();
    } catch (err) {
      const apiErr = err as BackendApiError;
      showError('Failed to Create Wallet', apiErr.message);
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopUpError(undefined);

    if (!wallet) return;

    if (topUpAmountMinor <= 0) {
      setTopUpError('Please enter an amount greater than ₹0.00');
      return;
    }

    if (topUpAmountMinor > 100000000) {
      setTopUpError('Maximum demo deposit per transaction is ₹10,00,000.00');
      return;
    }

    setIsSubmittingTopUp(true);
    try {
      const updated = await topUpWallet(wallet.id, topUpAmountMinor);
      setWallet(updated);
      showSuccess('Top Up Successful', `Added ${formatMoney(topUpAmountMinor)} to wallet #${wallet.id}`);
      setIsTopUpOpen(false);
      setTopUpAmountMajor('');
      setTopUpAmountMinor(0);
      fetchWalletAndTransactions();
    } catch (err) {
      const apiErr = err as BackendApiError;
      setTopUpError(apiErr.message);
      showError('Top Up Failed', apiErr.message);
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Account Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Hold funds, execute atomic transfers, and inspect ledger entries.
          </p>
        </div>

        <button
          onClick={fetchWalletAndTransactions}
          disabled={isLoadingWallet || isLoadingTxs}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWallet ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Backend Unreachable Alert Banner when in Live mode */}
      {fetchError && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-300 bg-rose-50 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                Spring Boot Backend Unreachable
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

      {/* Main Wallet Card Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prominent Balance Card */}
        <div className="lg:col-span-2">
          {isLoadingWallet ? (
            <CardSkeleton />
          ) : wallet ? (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-indigo-950/20">
              {/* Background decorative watermark */}
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                      <WalletIcon className="w-6 h-6 text-indigo-300" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-indigo-200 uppercase tracking-widest block">
                        Active Wallet
                      </span>
                      <span className="text-sm font-mono text-white/90">
                        ID: #{wallet.id} • {wallet.currency}
                      </span>
                    </div>
                  </div>
                  {mode === 'DEMO' ? (
                    <span
                      title="This wallet and its balance are fictional client-side simulation data."
                      className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>Fictional Demo Data</span>
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Live Spring Boot API</span>
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-xs font-medium text-indigo-200 mb-1">Available Balance</div>
                  <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tight text-white">
                    {formatMoney(wallet.balanceMinor, wallet.currency)}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-indigo-200/70 font-mono">
                    <span>Minor Units: {wallet.balanceMinor.toLocaleString()} paise</span>
                    <span>•</span>
                    <span>Version #{wallet.version ?? 1}</span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setTopUpError(undefined);
                      setTopUpAmountMajor('');
                      setTopUpAmountMinor(0);
                      setIsTopUpOpen(true);
                    }}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                  >
                    <PlusCircle className="w-4 h-4 text-indigo-600" />
                    <span>Top Up Wallet</span>
                  </button>

                  <Link
                    to="/transfer"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-400/30 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Send Money</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
                <WalletIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No active wallet found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Initialize your isolated demo wallet to hold funds and test idempotent transfers.
                </p>
              </div>
              <button
                onClick={handleCreateWallet}
                disabled={isCreatingWallet}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all"
              >
                {isCreatingWallet ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Demo Wallet</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Quick Demo Info & Rules Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Fraud Rule Thresholds</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Automated Rule Engine
            </h3>
            <ul className="text-xs space-y-2 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-bold shrink-0">1.</span>
                <span><strong>High Amount:</strong> &gt; ₹50,000 (5M paise) flags transfer for review.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-rose-600 font-bold shrink-0">2.</span>
                <span><strong>Velocity:</strong> &gt; 5 transfers in 60s blocks transfer with 403 Forbidden.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-amber-600 font-bold shrink-0">3.</span>
                <span><strong>Unusual Amount:</strong> &gt; 5x user's past 10 avg flags transfer.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-bold shrink-0">4.</span>
                <span><strong>New Wallet Risk:</strong> Wallet &lt; 24h sending &gt; ₹20,000 flags transfer.</span>
              </li>
            </ul>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Concurrency Safe:</span>
            <span className="font-semibold text-slate-800">Pessimistic DB Locks</span>
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Last 5
            </span>
          </div>
          <Link
            to="/transactions"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View Full Ledger</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoadingTxs ? (
          <TableSkeleton rows={4} cols={5} />
        ) : recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No transactions recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Top up your wallet or execute a transfer to populate ledger records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-[11px] uppercase font-semibold text-slate-500 border-b border-slate-100 tracking-wider">
                <tr>
                  <th className="py-3 px-6">Date & Time</th>
                  <th className="py-3 px-6">Direction / Counterparty</th>
                  <th className="py-3 px-6">Amount</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => {
                  const isSender = wallet ? tx.fromWalletId === wallet.id : false;
                  const isTopUp = tx.fromWalletId === 0;

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        tx.status === 'BLOCKED'
                          ? 'bg-rose-50/40'
                          : tx.status === 'FLAGGED'
                          ? 'bg-amber-50/40'
                          : ''
                      }`}
                    >
                      <td className="py-4 px-6 text-xs text-slate-600 font-mono">
                        {new Date(tx.createdAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-lg ${
                              isTopUp
                                ? 'bg-indigo-50 text-indigo-600'
                                : isSender
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {isTopUp ? (
                              <PlusCircle className="w-3.5 h-3.5" />
                            ) : isSender ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 text-xs">
                              {isTopUp
                                ? 'Top-up Deposit'
                                : isSender
                                ? `To Wallet #${tx.toWalletId}`
                                : `From Wallet #${tx.fromWalletId}`}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              TX #{tx.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-xs">
                        <span
                          className={
                            isTopUp || !isSender ? 'text-emerald-700' : 'text-slate-900'
                          }
                        >
                          {isTopUp || !isSender ? '+' : '-'}
                          {formatMoney(tx.amountMinor)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={tx.status} size="sm" />
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500 max-w-xs truncate">
                        {tx.failureReason || 'Settled to ledger'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Up Modal */}
      <Modal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        title="Top Up Demo Wallet"
        description="Deposit simulated funds into your demo wallet."
      >
        <form onSubmit={handleTopUpSubmit} className="space-y-5">
          <MoneyInput
            label="Deposit Amount"
            value={topUpAmountMajor}
            onChange={(major, minor) => {
              setTopUpAmountMajor(major);
              setTopUpAmountMinor(minor);
              setTopUpError(undefined);
            }}
            error={topUpError}
            helperText="Simulated deposit will credit minor units directly to your ledger balance."
            quickChips={[500, 1000, 5000, 10000]}
          />

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-600 flex justify-between">
            <span>Destination:</span>
            <span className="font-semibold font-mono text-slate-900">
              Wallet #{wallet?.id} ({wallet?.currency})
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsTopUpOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingTopUp || topUpAmountMinor <= 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200"
            >
              {isSubmittingTopUp ? 'Crediting...' : `Confirm Deposit of ${formatMoney(topUpAmountMinor)}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
