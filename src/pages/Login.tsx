import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, Sparkles, ShieldAlert } from 'lucide-react';
import { loginUser } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BackendApiError } from '../api/client';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);

  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const validate = (): boolean => {
    const errs: { email?: string; password?: string } = {};
    if (!email) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLockedOut(false);

    if (!validate()) return;

    setIsLoading(true);
    try {
      const res = await loginUser(email, password);
      login(res.token);
      showSuccess('Welcome back!', 'Successfully signed in to demo ledger.');
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      const apiErr = err as BackendApiError;
      if (apiErr.status === 403 && apiErr.message.toLowerCase().includes('locked')) {
        setIsLockedOut(true);
        setErrors({
          general: apiErr.message || 'Account is temporarily locked due to 5 failed login attempts. Please wait 5 minutes.',
        });
      } else {
        setErrors({
          general: apiErr.message || 'Invalid email or password. Please try again.',
        });
      }
      showError('Authentication Failed', apiErr.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper quick fills for instant evaluation
  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrors({});
    setIsLockedOut(false);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign in to Ledger
          </h1>
          <p className="mt-1.5 text-xs text-slate-500 font-medium">
            Access your demo wallet, transfers & transaction logs
          </p>
        </div>

        {/* Demo Credentials Quick-Fill Bar */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-900 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Quick Demo Accounts:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('user@example.com', 'Password123!')}
              className="px-2.5 py-1.5 bg-white border border-indigo-200 rounded-xl text-left hover:border-indigo-400 text-indigo-950 transition-colors"
            >
              <div className="font-bold">Standard User</div>
              <div className="text-[10px] text-slate-500 font-mono">user@example.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('admin@ledger.com', 'AdminPassword123!')}
              className="px-2.5 py-1.5 bg-white border border-indigo-200 rounded-xl text-left hover:border-indigo-400 text-indigo-950 transition-colors"
            >
              <div className="font-bold">Admin Persona</div>
              <div className="text-[10px] text-slate-500 font-mono">admin@ledger.com</div>
            </button>
          </div>
        </div>

        {errors.general && (
          <div
            role="alert"
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isLockedOut
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {isLockedOut ? (
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs leading-relaxed font-medium">
              <p className="font-bold">{isLockedOut ? 'Account Locked' : 'Notice'}</p>
              <p>{errors.general}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Email Address
            </label>
            <div className="relative rounded-xl">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={`block w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                }`}
              />
            </div>
            {errors.email && (
              <p id="email-error" className="text-xs text-rose-600 mt-1 font-medium">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Password
            </label>
            <div className="relative rounded-xl">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`block w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                  errors.password
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                }`}
              />
            </div>
            {errors.password && (
              <p id="password-error" className="text-xs text-rose-600 mt-1 font-medium">
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60 transition-all shadow-md shadow-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {isLoading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500">
          Don't have a demo account?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-800">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
