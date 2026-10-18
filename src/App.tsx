import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ApiConfigProvider } from './context/ApiConfigContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Transfer } from './pages/Transfer';
import { Transactions } from './pages/Transactions';
import { AdminReports } from './pages/AdminReports';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ApiConfigProvider>
          <AuthProvider>
            <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
              <Navbar />
              <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/transfer"
                    element={
                      <ProtectedRoute>
                        <Transfer />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/transactions"
                    element={
                      <ProtectedRoute>
                        <Transactions />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin/reports"
                    element={
                      <AdminRoute>
                        <AdminReports />
                      </AdminRoute>
                    }
                  />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </AuthProvider>
        </ApiConfigProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
