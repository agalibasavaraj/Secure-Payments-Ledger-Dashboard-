import { apiClient, executeApi } from './client';
import { mockBackend } from './mockBackend';

export interface LoginResponse {
  token: string;
}

export interface RegisterResponse {
  token?: string;
  message?: string;
}

export async function registerUser(email: string, password: string, role: 'USER' | 'ADMIN' = 'USER'): Promise<RegisterResponse> {
  return executeApi<RegisterResponse>(
    () => apiClient.post('/auth/register', { email, password }),
    () => mockBackend.register(email, password, role)
  );
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  return executeApi<LoginResponse>(
    () => apiClient.post('/auth/login', { email, password }),
    () => mockBackend.login(email, password)
  );
}
