import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, UserPlus, Shield } from 'lucide-react';
import { registerUser } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BackendApiError } from '../api/client';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const validate = (): boolean => {
    const errs: { email?: string; password?: string; confirmPassword?: string } = {};

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

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    setIsLoading(true);
    try {
      const res = await registerUser(email, password, role);
      if (res.token) {
        login(res.token, { email, role });
      }
      showSuccess('Registration Successful', `Demo account created with ${role} privileges.`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiErr = err as BackendApiError;
      setErrors({
        general: apiErr.message || 'Registration failed. Please check your details and try again.',
      });
      showError('Registration Failed', apiErr.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-slate-900 tracking-tight">
            Create Demo Account
          </h1>
          <p className="mt-1.5 text-xs text-slate-500 font-medium">
            Register to hold demo wallets and execute simulated atomic transfers
          </p>
        </div>

        {errors.general && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl border bg-rose-50 border-rose-300 text-rose-900 text-xs font-medium"
          >
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="reg-email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Email Address
            </label>
            <div className="relative rounded-xl">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                aria-invalid={!!errors.email}
                className={`block w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.email}</p>}
          </div>

          <div>
            <label
              htmlFor="reg-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Password (Min 8 Characters)
            </label>
            <div className="relative rounded-xl">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                className={`block w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                  errors.password
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                }`}
              />
            </div>
            {errors.password && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.password}</p>}
          </div>

          <div>
            <label
              htmlFor="reg-confirm-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Confirm Password
            </label>
            <div className="relative rounded-xl">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="reg-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                aria-invalid={!!errors.confirmPassword}
                className={`block w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                  errors.confirmPassword
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                }`}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Role selector for demo convenience */}
          <div className="pt-1">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Account Role
            </span>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'USER'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="USER"
                  checked={role === 'USER'}
                  onChange={() => setRole('USER')}
                  className="sr-only"
                />
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold">Standard User</span>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'ADMIN'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="ADMIN"
                  checked={role === 'ADMIN'}
                  onChange={() => setRole('ADMIN')}
                  className="sr-only"
                />
                <Shield className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold">Admin Privileges</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60 transition-all shadow-md shadow-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {isLoading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-800">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
