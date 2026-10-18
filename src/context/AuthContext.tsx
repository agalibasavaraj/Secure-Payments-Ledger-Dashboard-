import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { decodeJwtPayload, isTokenExpired, JwtUserPayload } from '../utils/jwt';
import { SESSION_EXPIRED_EVENT } from '../api/client';
import { useToast } from './ToastContext';

export interface AuthUser {
  email: string;
  role: 'USER' | 'ADMIN';
  userId: number;
  walletId?: number;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, explicitUser?: Partial<AuthUser>) => void;
  logout: (reason?: string) => void;
  updateUserWalletId: (walletId: number) => void;
  switchDemoRole: (targetRole: 'USER' | 'ADMIN') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { showWarning, showInfo } = useToast();

  const [token, setToken] = useState<string | null>(() => {
    const saved = sessionStorage.getItem('auth_token');
    if (saved && !isTokenExpired(saved)) {
      return saved;
    }
    sessionStorage.removeItem('auth_token');
    return null;
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedToken = sessionStorage.getItem('auth_token');
    if (savedToken && !isTokenExpired(savedToken)) {
      const payload = decodeJwtPayload(savedToken);
      if (payload) {
        return {
          email: payload.email,
          role: payload.role,
          userId: payload.userId || 1,
          walletId: payload.walletId,
        };
      }
    }
    return null;
  });

  const logout = useCallback(
    (reason?: string) => {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
      sessionStorage.removeItem('user_wallet_id');
      setToken(null);
      setUser(null);
      if (reason) {
        showWarning('Logged Out', reason);
      }
    },
    [showWarning]
  );

  const login = useCallback(
    (newToken: string, explicitUser?: Partial<AuthUser>) => {
      sessionStorage.setItem('auth_token', newToken);
      setToken(newToken);

      const payload = decodeJwtPayload(newToken);
      const email = explicitUser?.email || payload?.email || 'user@example.com';
      const role = explicitUser?.role || payload?.role || 'USER';
      const userId = explicitUser?.userId || payload?.userId || (email.includes('admin') ? 2 : 1);
      const walletId = explicitUser?.walletId || payload?.walletId || (role === 'ADMIN' ? 102 : 101);

      const authUser: AuthUser = {
        email,
        role,
        userId,
        walletId,
      };

      if (walletId) {
        sessionStorage.setItem('user_wallet_id', walletId.toString());
      }
      setUser(authUser);
    },
    []
  );

  const updateUserWalletId = useCallback((walletId: number) => {
    setUser((prev) => {
      if (!prev || prev.walletId === walletId) return prev;
      return { ...prev, walletId };
    });
    sessionStorage.setItem('user_wallet_id', walletId.toString());
  }, []);

  // Quick switch for demo testing between User and Admin
  const switchDemoRole = useCallback(
    (targetRole: 'USER' | 'ADMIN') => {
      const demoEmail = targetRole === 'ADMIN' ? 'admin@ledger.com' : 'user@example.com';
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const nowSec = Math.floor(Date.now() / 1000);
      const payload = btoa(
        JSON.stringify({
          sub: demoEmail,
          email: demoEmail,
          role: targetRole,
          userId: targetRole === 'ADMIN' ? 2 : 1,
          walletId: targetRole === 'ADMIN' ? 102 : 101,
          iat: nowSec,
          exp: nowSec + 3600,
        })
      );
      const mockToken = `${header}.${payload}.demoSignature`;
      login(mockToken, {
        email: demoEmail,
        role: targetRole,
        userId: targetRole === 'ADMIN' ? 2 : 1,
        walletId: targetRole === 'ADMIN' ? 102 : 101,
      });
      showInfo('Demo Persona Switched', `Active as ${demoEmail} (${targetRole})`);
    },
    [login, showInfo]
  );

  // Listen for 401 session expired events from Axios interceptor
  useEffect(() => {
    const handleExpired = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      logout(customEvent.detail?.message || 'Session expired. Please log in again.');
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    };
  }, [logout]);

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        updateUserWalletId,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
