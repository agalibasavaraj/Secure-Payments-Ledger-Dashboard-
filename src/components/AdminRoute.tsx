import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  const { showError } = useToast();

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      showError('Access Denied', 'Administrator privileges are required to view audit and fraud reports.');
    }
  }, [isAuthenticated, isAdmin, showError]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
