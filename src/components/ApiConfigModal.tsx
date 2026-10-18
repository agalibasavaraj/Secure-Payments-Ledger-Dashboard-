import React, { useState } from 'react';
import {
  Server,
  Radio,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Terminal,
  Database,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import { useApiConfig } from '../context/ApiConfigContext';
import { Modal } from './Modal';
import { useToast } from '../context/ToastContext';

export function ApiConfigModal() {
  const {
    mode,
    baseUrl,
    connectionStatus,
    lastChecked,
    lastError,
    isConfigModalOpen,
    setIsConfigModalOpen,
    setMode,
    setBaseUrl,
    checkConnection,
    resetToDefaultUrl,
    resetDemoDatabase,
  } = useApiConfig();

  const { showSuccess, showInfo, showError } = useToast();

  const [inputUrl, setInputUrl] = useState(baseUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const ok = await checkConnection(inputUrl);
      if (ok) {
        setTestResult({
          success: true,
          message: `Successfully connected to backend at ${inputUrl}!`,
        });
        showSuccess('Backend Reachable', `Connected to ${inputUrl}`);
      } else {
        setTestResult({
          success: false,
          message:
            lastError ||
            `Cannot connect to ${inputUrl}. Make sure Spring Boot is running and CORS is configured.`,
        });
        showError('Connection Failed', `Could not reach ${inputUrl}`);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndApply = () => {
    setBaseUrl(inputUrl);
    showSuccess('Backend URL Saved', `Configured API endpoint: ${inputUrl}`);
    setIsConfigModalOpen(false);
  };

  const handleModeChange = (newMode: 'DEMO' | 'LIVE') => {
    setMode(newMode);
    if (newMode === 'LIVE') {
      checkConnection(inputUrl);
      showInfo('Switched to Live API Mode', 'Requests will be sent to your Spring Boot REST backend.');
    } else {
      showInfo('Switched to Demo Mode', 'Using local fictional ledger data. No backend requests will be made.');
    }
  };

  return (
    <Modal
      isOpen={isConfigModalOpen}
      onClose={() => setIsConfigModalOpen(false)}
      title="Backend Connection & Mode Settings"
      description="Configure your Spring Boot REST API connection or switch to offline fictional demo mode."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Mode Selector Radio Cards */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Operating Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Demo Mode Card */}
            <div
              onClick={() => handleModeChange('DEMO')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                mode === 'DEMO'
                  ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>Fictional Demo Mode</span>
                </span>
                {mode === 'DEMO' && (
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full uppercase">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Runs entirely in-browser using fictional simulation data. Does not require a running backend server.
              </p>
            </div>

            {/* Live API Card */}
            <div
              onClick={() => handleModeChange('LIVE')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                mode === 'LIVE'
                  ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span>Live Spring Boot API</span>
                </span>
                {mode === 'LIVE' && (
                  <span className="text-[10px] bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded-full uppercase">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Directly calls your Java Spring Boot REST API (`/api/v1/*`). Real responses and real error propagation.
              </p>
            </div>
          </div>
        </div>

        {/* Backend URL Input Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="backend-url-input"
              className="text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Spring Boot API Base URL
            </label>
            <button
              type="button"
              onClick={() => {
                resetToDefaultUrl();
                setInputUrl(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1');
              }}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 underline"
            >
              Reset to default
            </button>
          </div>

          <div className="flex gap-2">
            <input
              id="backend-url-input"
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="http://localhost:8080/api/v1"
              className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600"
            />
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !inputUrl.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>

          {/* Test connection result banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-snug">{testResult.message}</div>
            </div>
          )}
        </div>

        {/* Local Spring Boot Startup Instructions */}
        <div className="bg-slate-900 rounded-2xl p-4 text-slate-200 space-y-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400 font-sans font-semibold text-[11px] uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>How to run the Spring Boot API locally</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] select-all space-y-1">
            <div className="text-emerald-400"># Option 1: Docker Compose (PostgreSQL 16 + API)</div>
            <div>docker-compose -f backend/docker-compose.yml up -d</div>
            <div className="text-emerald-400 pt-1"># Option 2: Maven directly</div>
            <div>cd backend &amp;&amp; mvn spring-boot:run</div>
          </div>
          <p className="text-[10px] text-slate-400 font-sans pt-1">
            Note: Spring Boot CORS is configured in `SecurityConfig.java` to allow requests from the frontend app.
          </p>
        </div>

        {/* Demo Database Reset */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Need to reset fictional demo records?</span>
          <button
            type="button"
            onClick={resetDemoDatabase}
            className="text-rose-600 hover:text-rose-800 font-semibold"
          >
            Reset Demo Database
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(false)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndApply}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
          >
            Save &amp; Apply URL
          </button>
        </div>
      </div>
    </Modal>
  );
}
