import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  ArrowRightLeft,
  History,
  BarChart3,
  LogOut,
  Menu,
  X,
  Server,
  Layers,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApiConfig } from '../context/ApiConfigContext';
import { ConnectionBanner } from './ConnectionBanner';
import { ApiConfigModal } from './ApiConfigModal';

export function Navbar() {
  const { user, isAuthenticated, isAdmin, logout, switchDemoRole } = useAuth();
  const { mode, connectionStatus, setIsConfigModalOpen } = useApiConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Transfer', path: '/transfer', icon: ArrowRightLeft },
    { name: 'Transactions', path: '/transactions', icon: History },
    ...(isAdmin ? [{ name: 'Reports', path: '/admin/reports', icon: BarChart3 }] : []),
  ];

  return (
    <>
      <ConnectionBanner />
      <ApiConfigModal />

      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <NavLink to={isAuthenticated ? '/dashboard' : '/login'} className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 group-hover:bg-indigo-700 transition-colors">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-base font-bold text-slate-900 tracking-tight block">
                    SecureLedger
                  </span>
                  <span className="text-[10px] font-mono tracking-widest text-indigo-600 uppercase font-semibold block">
                    Spring Boot UI
                  </span>
                </div>
              </NavLink>

              {/* Status Badge clickable pill */}
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                  mode === 'DEMO'
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    : connectionStatus === 'CONNECTED'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                }`}
                title="Click to configure API connection or switch mode"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    mode === 'DEMO'
                      ? 'bg-amber-500'
                      : connectionStatus === 'CONNECTED'
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`}
                />
                <span>
                  {mode === 'DEMO'
                    ? 'Fictional Demo Mode'
                    : connectionStatus === 'CONNECTED'
                    ? 'Spring Boot API: Online'
                    : 'Spring Boot API: Offline'}
                </span>
                <Settings className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>
            </div>

            {/* Desktop Navigation Links */}
            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{link.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            )}

            {/* Right section: User role, switch demo persona, logout */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {/* Persona quick switch */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200">
                    <button
                      type="button"
                      onClick={() => switchDemoRole('USER')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        user?.role === 'USER'
                          ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Switch to Demo User"
                    >
                      User
                    </button>
                    <button
                      type="button"
                      onClick={() => switchDemoRole('ADMIN')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        user?.role === 'ADMIN'
                          ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Switch to Demo Admin"
                    >
                      Admin
                    </button>
                  </div>

                  {/* User pill */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold uppercase">
                      {user?.email ? user.email[0] : 'U'}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                        {user?.email}
                      </p>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full uppercase tracking-wider font-semibold ${
                          isAdmin
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {user?.role}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <NavLink
                    to="/login"
                    className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Sign In
                  </NavLink>
                  <NavLink
                    to="/register"
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
                  >
                    Register
                  </NavLink>
                </div>
              )}
            </div>

            {/* Mobile hamburger button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="p-1.5 rounded-lg border text-xs"
                title="API Connection"
              >
                <Settings className="w-4 h-4 text-slate-600" />
              </button>

              {isAuthenticated && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
                    isAdmin ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {user?.role}
                </span>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
            {isAuthenticated ? (
              <>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{user?.email}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Role: {user?.role}</p>
                  </div>
                  <div className="flex gap-1 text-xs">
                    <button
                      onClick={() => {
                        switchDemoRole('USER');
                        setMobileMenuOpen(false);
                      }}
                      className="px-2 py-1 bg-white border rounded text-xs"
                    >
                      User
                    </button>
                    <button
                      onClick={() => {
                        switchDemoRole('ADMIN');
                        setMobileMenuOpen(false);
                      }}
                      className="px-2 py-1 bg-indigo-600 text-white rounded text-xs"
                    >
                      Admin
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.path;
                    return (
                      <NavLink
                        key={link.path}
                        to={link.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-5 h-5 text-indigo-600" />
                        <span>{link.name}</span>
                      </NavLink>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 w-full px-3.5 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <NavLink
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Sign In
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl"
                >
                  Register
                </NavLink>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}
