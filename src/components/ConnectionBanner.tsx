import React from 'react';
import {
  Server,
  Layers,
  AlertCircle,
  CheckCircle2,
  Settings,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useApiConfig } from '../context/ApiConfigContext';

export function ConnectionBanner() {
  const { mode, baseUrl, connectionStatus, lastError, setIsConfigModalOpen, setMode } = useApiConfig();

  if (mode === 'DEMO') {
    return (
      <aside aria-label="Demo mode warning" className="bg-amber-500/10 border-b border-amber-300 text-amber-950 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <div className="leading-snug">
              <strong className="font-bold text-amber-900 uppercase tracking-wider mr-1.5">
                Offline Fictional Demo Mode:
              </strong>
              <span>
                Using simulated in-browser test data. Not connected to a live Spring Boot backend.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[11px] shadow-xs transition-colors flex items-center gap-1"
            >
              <Server className="w-3 h-3" />
              <span>Connect Live Backend</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // LIVE MODE: Connected or Disconnected
  if (connectionStatus === 'DISCONNECTED') {
    return (
      <aside aria-label="Backend offline alert" className="bg-rose-50 border-b border-rose-300 text-rose-950 px-4 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <div className="leading-snug">
              <strong className="font-bold text-rose-900 uppercase tracking-wider mr-1.5">
                Backend Server Unreachable:
              </strong>
              <span>
                Could not connect to Spring Boot API at <code className="bg-white/70 px-1 py-0.5 rounded font-mono font-bold">{baseUrl}</code>.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMode('DEMO')}
              className="px-2.5 py-1 bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 font-bold rounded-lg text-[11px] transition-colors"
            >
              Switch to Fictional Demo
            </button>
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-colors flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              <span>Configure URL</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  if (connectionStatus === 'CONNECTED') {
    return (
      <aside aria-label="Backend connected confirmation" className="bg-emerald-500/10 border-b border-emerald-300 text-emerald-950 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span>
              <strong className="font-bold text-emerald-900 uppercase tracking-wider mr-1.5">
                Live Backend Connected:
              </strong>
              Calling Spring Boot REST API at <code className="font-mono font-bold text-emerald-800">{baseUrl}</code>
            </span>
          </div>
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="text-[11px] text-emerald-800 hover:text-emerald-950 underline font-medium"
          >
            Settings
          </button>
        </div>
      </aside>
    );
  }

  return null;
}
