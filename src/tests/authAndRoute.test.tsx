import React from 'react';
import { describe, it, expect } from 'vitest';
import { act, render, renderHook, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Login } from '../pages/Login';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

describe('Auth & Route Protection Tests', () => {
  it('validates email format and minimum 8-character password on Login form', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In to Dashboard/i });

    // 1. Submit empty
    fireEvent.click(submitBtn);
    expect(await screen.findByText(/Email address is required/i)).toBeDefined();

    // 2. Submit invalid email
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeDefined();
    expect(await screen.findByText(/Password must be at least 8 characters long/i)).toBeDefined();
  });

  it('redirects to /login when unauthenticated user accesses ProtectedRoute', () => {
    // Clear any token
    sessionStorage.clear();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div data-testid="secret-dashboard">Secret Dashboard</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('secret-dashboard')).toBeNull();
    expect(screen.getByTestId('login-page')).toBeDefined();
  });

  it('keeps the authenticated user unchanged when the wallet ID is unchanged', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    const payload = btoa(
      JSON.stringify({
        sub: 'user@example.com',
        email: 'user@example.com',
        role: 'USER',
        userId: 1,
        walletId: 101,
        exp: Math.floor(Date.now() / 1000) + 600,
      })
    );

    act(() => {
      result.current.login(`e30.${payload}.signature`);
    });
    const authenticatedUser = result.current.user;

    act(() => {
      result.current.updateUserWalletId(101);
    });

    expect(result.current.user).toBe(authenticatedUser);
  });
});
