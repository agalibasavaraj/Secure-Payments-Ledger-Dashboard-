import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRightLeft,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  FileText,
  Clock,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserWallet, Wallet } from '../api/wallets';
import { createTransfer, TransferResponse } from '../api/transfers';
import { formatMoney, toMinorUnits } from '../utils/money';
import { generateIdempotencyKey } from '../utils/uuid';
import { MoneyInput } from '../components/MoneyInput';
import { StatusBadge } from '../components/StatusBadge';
import { BackendApiError } from '../api/client';
import { useApiConfig } from '../context/ApiConfigContext';

type Step = 'FORM' | 'REVIEW' | 'RECEIPT';

export function Transfer() {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const { mode, baseUrl, setMode, setIsConfigModalOpen } = useApiConfig();
  const navigate = useNavigate();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [recipientWalletId, setRecipientWalletId] = useState('');
  const [amountMajor, setAmountMajor] = useState('');
  const [amountMinor, setAmountMinor] = useState(0);

  // Idempotency key generated on initial load and preserved across retries
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());

  const [step, setStep] = useState<Step>('FORM');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Error & Result States
  const [formErrors, setFormErrors] = useState<{
    recipient?: string;
    amount?: string;
    general?: string;
  }>({});
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [fraudBlockedError, setFraudBlockedError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [transferResult, setTransferResult] = useState<TransferResponse | null>(null);

  useEffect(() => {
    if (user) {
      getUserWallet(user.userId).then((w) => setWallet(w));
    }
  }, [user]);

  // When form inputs are modified, generate a new idempotency key (per prompt specification)
  const handleRecipientChange = (val: string) => {
    setRecipientWalletId(val);
    setConflictError(null);
    setFraudBlockedError(null);
    setFormErrors((prev) => ({ ...prev, recipient: undefined }));
    // Generate new key on input edit
    setIdempotencyKey(generateIdempotencyKey());
  };

  const handleAmountChange = (major: string, minor: number) => {
    setAmountMajor(major);
    setAmountMinor(minor);
    setConflictError(null);
    setFraudBlockedError(null);
    setFormErrors((prev) => ({ ...prev, amount: undefined }));
    // Generate new key on input edit
    setIdempotencyKey(generateIdempotencyKey());
  };

  const validateForm = (): boolean => {
    const errs: { recipient?: string; amount?: string } = {};

    if (!recipientWalletId.trim()) {
      errs.recipient = 'Recipient Wallet ID is required.';
    } else if (isNaN(Number(recipientWalletId)) || Number(recipientWalletId) <= 0) {
      errs.recipient = 'Please enter a valid numeric wallet ID.';
    } else if (wallet && Number(recipientWalletId) === wallet.id) {
      errs.recipient = 'Cannot transfer money to your own wallet.';
    }

    if (amountMinor <= 0) {
      errs.amount = 'Please enter an amount greater than ₹0.00';
    } else if (wallet && amountMinor > wallet.balanceMinor) {
      errs.amount = `Insufficient funds. Current balance: ${formatMoney(wallet.balanceMinor)}`;
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);
    setFraudBlockedError(null);

    if (!wallet) {
      setFormErrors({ general: 'You need an active wallet before sending money.' });
      return;
    }

    if (!validateForm()) return;
    setStep('REVIEW');
  };

  const handleExecuteTransfer = async () => {
    if (!wallet || !user) return;

    setIsLoading(true);
    setConflictError(null);
    setFraudBlockedError(null);

    try {
      const res = await createTransfer(
        {
          fromWalletId: wallet.id,
          toWalletId: Number(recipientWalletId),
          amountMinor,
        },
        idempotencyKey,
        user.userId
      );

      setTransferResult(res);
      setStep('RECEIPT');

      if (res.status === 'FLAGGED') {
        showWarning(
          'Transfer Under Review',
          res.failureReason || 'Transfer exceeded automated risk threshold and has been flagged for audit.'
        );
      } else {
        showSuccess('Transfer Successful', `Transferred ${formatMoney(amountMinor)} securely.`);
      }

      // Generate a fresh idempotency key for the next transfer
      setIdempotencyKey(generateIdempotencyKey());
    } catch (err) {
      const apiErr = err as BackendApiError;

      if (apiErr.isNetworkError || apiErr.status === 0) {
        setNetworkError(apiErr.message);
      } else if (apiErr.status === 403) {
        // Fraud blocked
        setFraudBlockedError(
          apiErr.message ||
            'Transfer was blocked by security rules (velocity or high risk). Transaction has been recorded for review.'
        );
      } else if (apiErr.status === 409) {
        // Idempotency conflict
        setConflictError(
          apiErr.message ||
            'Conflict: This Idempotency-Key was already submitted with a different request payload. Please generate a new key.'
        );
      } else if (apiErr.status === 400 && apiErr.message.toLowerCase().includes('insufficient')) {
        setFormErrors({ amount: apiErr.message });
        setStep('FORM');
      } else {
        setFormErrors({
          general: apiErr.message || 'Transfer failed. Please check details and try again.',
        });
      }
      showError('Transfer Failed', apiErr.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleStartNewTransfer = () => {
    setRecipientWalletId('');
    setAmountMajor('');
    setAmountMinor(0);
    setTransferResult(null);
    setConflictError(null);
    setFraudBlockedError(null);
    setNetworkError(null);
    setFormErrors({});
    setIdempotencyKey(generateIdempotencyKey());
    setStep('FORM');
    if (user) {
      getUserWallet(user.userId).then((w) => setWallet(w));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Page Heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Send Money
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Transfer demo funds with atomic concurrency locking and automated fraud evaluation.
          </p>
        </div>
        {mode === 'DEMO' ? (
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900">
            Fictional Demo
          </span>
        ) : (
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900">
            Live Spring Boot API
          </span>
        )}
      </div>

      {/* Network / Backend Unreachable Alert Banner */}
      {networkError && (
        <div
          role="alert"
          className="p-5 rounded-2xl border-2 border-rose-300 bg-rose-50 text-rose-950 space-y-3 shadow-md"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-rose-900 uppercase tracking-wide">
                Spring Boot Backend Unreachable
              </h2>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                {networkError}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-rose-200/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setNetworkError(null);
                setMode('DEMO');
              }}
              className="px-3.5 py-1.5 bg-white border border-rose-300 text-rose-900 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
            >
              Switch to Fictional Demo Mode
            </button>
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Configure API Endpoint
            </button>
          </div>
        </div>
      )}

      {/* Fraud Blocked Alert Banner (403) */}
      {fraudBlockedError && (
        <div
          role="alert"
          className="p-5 rounded-2xl border-2 border-red-300 bg-red-50 text-red-950 space-y-3 shadow-md"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-red-900 uppercase tracking-wide">
                Transfer Blocked by Fraud Engine (HTTP 403)
              </h2>
              <p className="text-xs text-red-800 mt-1 leading-relaxed">
                {fraudBlockedError}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-red-200/80 flex items-center justify-between text-xs">
            <span className="text-red-700">Idempotency Key:</span>
            <span className="font-mono text-xs font-semibold text-red-900 truncate max-w-xs">
              {idempotencyKey}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setFraudBlockedError(null);
              setStep('FORM');
            }}
            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Modify Transfer Parameters
          </button>
        </div>
      )}

      {/* Idempotency Conflict Alert (409) */}
      {conflictError && (
        <div
          role="alert"
          className="p-5 rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 space-y-3 shadow-md"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                Duplicate Idempotency Key Conflict (HTTP 409)
              </h2>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {conflictError}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIdempotencyKey(generateIdempotencyKey());
              setConflictError(null);
            }}
            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Regenerate Fresh Idempotency Key
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
        {step === 'FORM' && (
          <form onSubmit={handleProceedToReview} className="space-y-6" noValidate>
            {/* Sender Wallet Info */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Debited From
                </span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  Wallet #{wallet?.id ?? '...'} (You)
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Available Balance
                </span>
                <span className="text-sm font-extrabold text-indigo-700 font-mono">
                  {formatMoney(wallet?.balanceMinor)}
                </span>
              </div>
            </div>

            {/* Recipient Wallet Input */}
            <div>
              <label
                htmlFor="recipient-wallet"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                Recipient Wallet ID
              </label>
              <input
                id="recipient-wallet"
                type="text"
                inputMode="numeric"
                value={recipientWalletId}
                onChange={(e) => handleRecipientChange(e.target.value)}
                placeholder="e.g. 102 (Admin) or 103 (Merchant)"
                aria-invalid={!!formErrors.recipient}
                className={`block w-full rounded-xl border py-2.5 px-4 text-sm font-mono transition-all focus:outline-none focus:ring-2 ${
                  formErrors.recipient
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                }`}
              />
              {formErrors.recipient ? (
                <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.recipient}</p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">
                  Demo target wallets: <button type="button" onClick={() => handleRecipientChange('102')} className="text-indigo-600 underline">#102 (Admin)</button> or <button type="button" onClick={() => handleRecipientChange('103')} className="text-indigo-600 underline">#103 (Merchant)</button>
                </p>
              )}
            </div>

            {/* Money Input */}
            <MoneyInput
              label="Transfer Amount"
              value={amountMajor}
              onChange={handleAmountChange}
              error={formErrors.amount}
              helperText="All amounts are converted safely to integer minor units (paise) before submission."
              quickChips={[100, 500, 2000, 10000]}
            />

            {/* Idempotency Key preview indicator */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Idempotency-Key Header:</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500">UUID v4</span>
              </div>
              <div className="font-mono text-[11px] text-slate-800 break-all select-all bg-white p-1.5 rounded border border-slate-200">
                {idempotencyKey}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Preserved across network retries and double-clicks to guarantee exact-once execution.
              </p>
            </div>

            {formErrors.general && (
              <p className="text-xs text-rose-600 font-semibold">{formErrors.general}</p>
            )}

            <button
              type="submit"
              disabled={!wallet || amountMinor <= 0 || !recipientWalletId}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 active:scale-[0.99]"
            >
              <span>Review Transfer Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Review Step (Confirmation Screen) */}
        {step === 'REVIEW' && (
          <div className="space-y-6">
            <div className="text-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Step 2 of 2
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                Confirm Transfer
              </h2>
              <p className="text-xs text-slate-500">
                Please verify the sender, recipient, and amount before dispatching.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 rounded-2xl p-5 border border-slate-200 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 text-xs">From Wallet:</span>
                <span className="font-mono font-bold text-slate-900">
                  #{wallet?.id} ({user?.email})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 text-xs">To Recipient Wallet:</span>
                <span className="font-mono font-bold text-slate-900">
                  #{recipientWalletId}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 text-xs">Transfer Amount:</span>
                <span className="font-mono font-extrabold text-indigo-700 text-base">
                  {formatMoney(amountMinor)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 text-xs">Minor Units (Paise):</span>
                <span className="font-mono text-xs text-slate-700">
                  {amountMinor.toLocaleString()} paise
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 text-xs">Simulated Transfer Fee:</span>
                <span className="font-mono text-emerald-700 font-semibold text-xs">
                  ₹0.00 (Demo Free)
                </span>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-slate-500 text-xs">Idempotency Key:</span>
                <span className="font-mono text-[11px] text-slate-700 break-all bg-white p-2 rounded border border-slate-200">
                  {idempotencyKey}
                </span>
              </div>
            </div>

            {/* Fraud rule prediction notice */}
            {amountMinor > 5000000 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Notice:</strong> This amount exceeds ₹50,000. It will trigger the High Amount Fraud Rule and be marked as <strong>FLAGGED</strong> for audit review.
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('FORM')}
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Edit</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteTransfer}
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Locking Ledger...</span>
                  </>
                ) : (
                  <>
                    <span>Submit &amp; Debit</span>
                    <ShieldCheck className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Receipt Step */}
        {step === 'RECEIPT' && transferResult && (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform transform scale-105 bg-emerald-100 text-emerald-600">
              {transferResult.status === 'FLAGGED' ? (
                <AlertTriangle className="w-9 h-9 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              )}
            </div>

            <div>
              <div className="inline-block mb-2">
                <StatusBadge status={transferResult.status} size="lg" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                {transferResult.status === 'FLAGGED'
                  ? 'Transfer Submitted (Under Review)'
                  : 'Transfer Completed Successfully'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {transferResult.status === 'FLAGGED'
                  ? 'The transaction has been debited but flagged by automated fraud heuristics for administrative inspection.'
                  : 'Funds have been transferred atomically using ordered pessimistic database locks.'}
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Transaction ID:</span>
                <span className="font-bold text-slate-900 font-mono">
                  #{transferResult.id}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Amount:</span>
                <span className="font-extrabold text-indigo-700 text-sm">
                  {formatMoney(transferResult.amountMinor)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Sender Wallet:</span>
                <span className="text-slate-800">#{transferResult.fromWalletId}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Recipient Wallet:</span>
                <span className="text-slate-800">#{transferResult.toWalletId}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Timestamp:</span>
                <span className="text-slate-800">
                  {new Date(transferResult.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="pt-1">
                <div className="flex items-center justify-between text-slate-500 font-sans mb-1">
                  <span>Idempotency Key:</span>
                  <button
                    onClick={() => copyToClipboard(transferResult.idempotencyKey || idempotencyKey)}
                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-[11px]"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200 text-[10px] text-slate-700 break-all">
                  {transferResult.idempotencyKey || idempotencyKey}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleStartNewTransfer}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-200"
              >
                Make Another Transfer
              </button>
              <Link
                to="/transactions"
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
              >
                View Full Ledger
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
