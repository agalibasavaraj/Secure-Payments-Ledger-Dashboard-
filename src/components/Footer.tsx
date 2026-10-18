import React from 'react';
import { ShieldCheck, Heart, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-slate-700">secure-payments-ledger-ui</span>
          <span>•</span>
          <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            Demo project - not a real payment system.
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Spring Boot 3 + React 18 + Vite</span>
          <span>•</span>
          <span>All money is simulated (paise)</span>
        </div>
      </div>
    </footer>
  );
}
