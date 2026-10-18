import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

export type TransactionStatus = 'SUCCESS' | 'FAILED' | 'FLAGGED' | 'BLOCKED';

interface StatusBadgeProps {
  status: TransactionStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  const normStatus = (status || '').toUpperCase() as TransactionStatus;

  let bgClass = 'bg-slate-100 text-slate-800 border-slate-200';
  let icon = null;
  let label: string = normStatus;

  switch (normStatus) {
    case 'SUCCESS':
      bgClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      icon = <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />;
      label = 'SUCCESS';
      break;
    case 'FAILED':
      bgClass = 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      icon = <XCircle className="w-3.5 h-3.5 shrink-0" />;
      label = 'FAILED';
      break;
    case 'FLAGGED':
      bgClass = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      icon = <AlertTriangle className="w-3.5 h-3.5 shrink-0" />;
      label = 'FLAGGED';
      break;
    case 'BLOCKED':
      bgClass = 'bg-red-100 text-red-900 border-red-400 dark:bg-red-950/90 dark:text-red-200 dark:border-red-800';
      icon = <ShieldAlert className="w-3.5 h-3.5 shrink-0" />;
      label = 'BLOCKED';
      break;
    default:
      bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
      label = status || 'UNKNOWN';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-semibold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      data-testid={`status-badge-${normStatus.toLowerCase()}`}
      className={`inline-flex items-center rounded-full border tracking-wide font-mono ${bgClass} ${sizeClasses}`}
    >
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
}
