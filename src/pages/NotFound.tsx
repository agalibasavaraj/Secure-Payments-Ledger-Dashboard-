import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xl space-y-6">
        <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest block">
            404 Error
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Page Not Found
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            The page you are looking for doesn't exist or has been moved to a new route.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
