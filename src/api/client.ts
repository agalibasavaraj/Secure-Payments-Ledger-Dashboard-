import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Default Base URL from env variable VITE_API_BASE_URL (e.g. http://localhost:8080/api/v1)
export const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

// Custom event to notify app of session expiration
export const SESSION_EXPIRED_EVENT = 'spl_session_expired';

export function getActiveBackendUrl(): string {
  const custom = localStorage.getItem('spl_backend_url');
  return custom ? custom.trim().replace(/\/+$/, '') : DEFAULT_API_BASE_URL;
}

export function isDemoModeActive(): boolean {
  const mode = localStorage.getItem('spl_app_mode');
  if (mode === 'DEMO') return true;
  if (mode === 'LIVE') return false;
  // If no env var was set and no preference stored, default to DEMO mode
  return !import.meta.env.VITE_API_BASE_URL;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: getActiveBackendUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function updateApiClientBaseUrl(newUrl: string): void {
  apiClient.defaults.baseURL = newUrl;
}

// Attach Authorization Bearer token from sessionStorage
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for 401 and errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
      window.dispatchEvent(
        new CustomEvent(SESSION_EXPIRED_EVENT, {
          detail: { message: 'Session expired or unauthorized. Please log in again.' },
        })
      );
    }
    return Promise.reject(error);
  }
);

/**
 * Standard backend error parser
 * Backend error format: { timestamp, status, error, message, path }
 */
export interface BackendApiError {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  path?: string;
  isNetworkError?: boolean;
}

export function parseApiError(err: unknown): BackendApiError {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as BackendApiError | undefined;
    if (data && data.message) {
      return {
        status: err.response?.status || 500,
        error: data.error || 'API Error',
        message: data.message,
        timestamp: data.timestamp,
        path: data.path,
      };
    }
    if (err.code === 'ERR_NETWORK' || !err.response) {
      const activeUrl = apiClient.defaults.baseURL || DEFAULT_API_BASE_URL;
      return {
        status: 0,
        error: 'Backend Unavailable',
        message: `Could not reach backend at ${activeUrl}. Please ensure your Spring Boot server is running and CORS is configured, or switch to Demo Mode.`,
        isNetworkError: true,
      };
    }
    return {
      status: err.response?.status || 500,
      error: err.code || 'HTTP Error',
      message: err.message,
    };
  }

  // Handle mock errors
  if (err && typeof err === 'object' && 'message' in err) {
    const anyErr = err as Record<string, unknown>;
    return {
      status: Number(anyErr.status) || 500,
      error: String(anyErr.error || 'Error'),
      message: String(anyErr.message || 'An unexpected error occurred'),
      timestamp: String(anyErr.timestamp || new Date().toISOString()),
    };
  }

  return {
    status: 500,
    error: 'Internal Error',
    message: String(err) || 'An unexpected error occurred.',
  };
}

/**
 * Configurable API Executor.
 *
 * STRICT COMPLIANCE RULES:
 * 1. When mode is 'LIVE':
 *    - Calls the actual Spring Boot REST API.
 *    - DOES NOT fabricate successful responses when the backend fails or is offline.
 *    - Propagates real HTTP error status codes (400, 401, 403, 409, 500, or network down).
 *
 * 2. When mode is 'DEMO':
 *    - Calls the client-side simulation engine (fictional in-browser data).
 *    - Data is explicitly presented to the user as fictional simulation data.
 */
export async function executeApi<T>(
  apiCall: () => Promise<{ data: T }>,
  mockCall: () => T | Promise<T>
): Promise<T> {
  const isDemo = isDemoModeActive();

  if (isDemo) {
    try {
      return await mockCall();
    } catch (mockErr) {
      throw parseApiError(mockErr);
    }
  }

  // LIVE MODE: Call real backend. Never fabricate responses!
  try {
    const res = await apiCall();
    return res.data;
  } catch (error) {
    // Re-throw parsed error directly to the caller. Do NOT fallback to mock silently.
    throw parseApiError(error);
  }
}
