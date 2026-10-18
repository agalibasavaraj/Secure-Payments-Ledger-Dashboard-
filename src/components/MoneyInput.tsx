import React, { useId } from 'react';
import { toMinorUnits } from '../utils/money';

interface MoneyInputProps {
  label: string;
  value: string;
  onChange: (majorValue: string, minorUnits: number) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  minRupees?: number;
  maxRupees?: number;
  quickChips?: number[]; // Values in Rupees
}

export function MoneyInput({
  label,
  value,
  onChange,
  error,
  helperText,
  placeholder = '0.00',
  disabled = false,
  quickChips,
}: MoneyInputProps) {
  const id = useId();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Allow digits and up to one decimal point
    raw = raw.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts.slice(1).join('');
    }
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      raw = parts[0] + '.' + parts[1].slice(0, 2);
    }

    const minor = toMinorUnits(raw);
    onChange(raw, minor);
  };

  const handleChipClick = (rupees: number) => {
    const raw = rupees.toString();
    const minor = toMinorUnits(raw);
    onChange(raw, minor);
  };

  return (
    <div className="w-full space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
        {label}
      </label>

      <div className="relative rounded-xl shadow-xs">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <span className="text-base font-semibold text-slate-500">₹</span>
        </div>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={`block w-full rounded-xl border py-2.5 pl-8 pr-4 text-base font-medium transition-all focus:outline-none focus:ring-2 ${
            error
              ? 'border-rose-400 text-rose-950 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-indigo-100'
          } ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
        />
      </div>

      {quickChips && quickChips.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {quickChips.map((rupees) => (
            <button
              key={rupees}
              type="button"
              onClick={() => handleChipClick(rupees)}
              className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors"
            >
              +₹{rupees.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-rose-600 mt-1">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-xs text-slate-500 mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
