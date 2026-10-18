import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { updateApiClientBaseUrl } from '../api/client';

export type AppMode = 'DEMO' | 'LIVE';
export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CHECKING' | 'DEMO_MODE';

interface ApiConfigContextType {
  mode: AppMode;
  baseUrl: string;
  connectionStatus: ConnectionStatus;
  lastChecked: Date | null;
  lastError: string | null;
  isConfigModalOpen: boolean;
  setIsConfigModalOpen: (open: boolean) => void;
  setMode: (mode: AppMode) => void;
  setBaseUrl: (url: string) => void;
  checkConnection: (targetUrl?: string) => Promise<boolean>;
  resetToDefaultUrl: () => void;
  resetDemoDatabase: () => void;
}

const DEFAULT_BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const STORAGE_KEY_MODE = 'spl_app_mode';
const STORAGE_KEY_URL = 'spl_backend_url';

const ApiConfigContext = createContext<ApiConfigContextType | undefined>(undefined);

export function ApiConfigProvider({ children }: { children: React.ReactNode }) {
  // If no environment variable is provided, default to DEMO mode so the user is never blocked
  const [mode, setModeState] = useState<AppMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MODE);
    if (saved === 'LIVE' || saved === 'DEMO') return saved;
    // Default to DEMO mode if no explicit VITE_API_BASE_URL is set in environment
    return import.meta.env.VITE_API_BASE_URL ? 'LIVE' : 'DEMO';
  });

  const [baseUrl, setBaseUrlState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_URL);
    return saved || DEFAULT_BACKEND_URL;
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
    if (savedMode === 'DEMO' || (!savedMode && !import.meta.env.VITE_API_BASE_URL)) {
      return 'DEMO_MODE';
    }
    return 'CHECKING';
  });

  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Update Axios base URL whenever baseUrl changes
  useEffect(() => {
    updateApiClientBaseUrl(baseUrl);
  }, [baseUrl]);

  const setMode = useCallback((newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY_MODE, newMode);
    if (newMode === 'DEMO') {
      setConnectionStatus('DEMO_MODE');
      setLastError(null);
    }
  }, []);

  const setBaseUrl = useCallback((newUrl: string) => {
    const trimmed = newUrl.trim().replace(/\/+$/, '');
    setBaseUrlState(trimmed);
    localStorage.setItem(STORAGE_KEY_URL, trimmed);
    updateApiClientBaseUrl(trimmed);
  }, []);

  const resetToDefaultUrl = useCallback(() => {
    setBaseUrl(DEFAULT_BACKEND_URL);
  }, [setBaseUrl]);

  // Ping backend to check reachability
  const checkConnection = useCallback(
    async (targetUrl?: string): Promise<boolean> => {
      const urlToTest = (targetUrl || baseUrl).trim().replace(/\/+$/, '');
      setConnectionStatus('CHECKING');
      setLastError(null);

      try {
        // Try pinging Swagger docs or Actuator health or auth endpoint
        // Using a short timeout of 4 seconds
        const healthUrl = urlToTest.replace(/\/api\/v1\/?$/, '') + '/actuator/health';
        // We test with fetch with no-cors or standard axios
        const res = await axios.get(healthUrl, { timeout: 4000 }).catch(async () => {
          // If /actuator/health isn't exposed, try pinging api root or swagger
          return axios.get(`${urlToTest}/auth/login`, { timeout: 4000 });
        });

        setConnectionStatus('CONNECTED');
        setLastChecked(new Date());
        setLastError(null);
        return true;
      } catch (err: unknown) {
        setConnectionStatus('DISCONNECTED');
        setLastChecked(new Date());

        let msg = 'Unable to connect to backend';
        if (axios.isAxiosError(err)) {
          if (err.code === 'ERR_NETWORK' || !err.response) {
            msg = `Server unreachable at ${urlToTest}. Ensure Spring Boot is running and CORS allows this origin.`;
          } else if (err.response?.status === 405 || err.response?.status === 400 || err.response?.status === 401) {
            // A 400/401/405 response still means the server is reachable and running!
            setConnectionStatus('CONNECTED');
            setLastChecked(new Date());
            setLastError(null);
            return true;
          } else {
            msg = `Server responded with HTTP ${err.response.status}: ${err.message}`;
          }
        } else if (err instanceof Error) {
          msg = err.message;
        }

        setLastError(msg);
        return false;
      }
    },
    [baseUrl]
  );

  // Initial connection check if in LIVE mode
  useEffect(() => {
    if (mode === 'LIVE') {
      checkConnection();
    } else {
      setConnectionStatus('DEMO_MODE');
    }
  }, [mode, checkConnection]);

  const resetDemoDatabase = useCallback(() => {
    localStorage.removeItem('secure_payments_ledger_db_v1');
    window.location.reload();
  }, []);

  return (
    <ApiConfigContext.Provider
      value={{
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
      }}
    >
      {children}
    </ApiConfigContext.Provider>
  );
}

export function useApiConfig() {
  const context = useContext(ApiConfigContext);
  if (!context) {
    throw new Error('useApiConfig must be used within an ApiConfigProvider');
  }
  return context;
}
