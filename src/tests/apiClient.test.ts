import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeApi, apiClient, updateApiClientBaseUrl, parseApiError } from '../api/client';

describe('Configurable API Client', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('allows updating the Axios client base URL dynamically', () => {
    updateApiClientBaseUrl('https://my-custom-backend.run.app/api/v1');
    expect(apiClient.defaults.baseURL).toBe('https://my-custom-backend.run.app/api/v1');
  });

  it('runs mockCall in DEMO mode', async () => {
    localStorage.setItem('spl_app_mode', 'DEMO');

    const apiCallMock = vi.fn().mockRejectedValue(new Error('Real backend should not be called'));
    const mockCallFn = vi.fn().mockReturnValue({ fictional: true, balance: 1000 });

    const result = await executeApi(apiCallMock, mockCallFn);

    expect(mockCallFn).toHaveBeenCalled();
    expect(apiCallMock).not.toHaveBeenCalled();
    expect(result).toEqual({ fictional: true, balance: 1000 });
  });

  it('in LIVE mode, does NOT fabricate successful response if backend fails', async () => {
    localStorage.setItem('spl_app_mode', 'LIVE');

    const networkError = new Error('Network Error');
    (networkError as any).isAxiosError = true;
    (networkError as any).code = 'ERR_NETWORK';

    const apiCallMock = vi.fn().mockRejectedValue(networkError);
    const mockCallFn = vi.fn().mockReturnValue({ fictional: true });

    await expect(executeApi(apiCallMock, mockCallFn)).rejects.toThrow();

    // mockCallFn MUST NOT have been called in Live mode!
    expect(mockCallFn).not.toHaveBeenCalled();
  });

  it('correctly parses backend error responses with status, error, and message', () => {
    const customError = {
      status: 403,
      error: 'Fraud Blocked',
      message: 'Velocity rule exceeded: > 5 transfers in 60s',
    };

    const parsed = parseApiError(customError);
    expect(parsed.status).toBe(403);
    expect(parsed.error).toBe('Fraud Blocked');
    expect(parsed.message).toBe('Velocity rule exceeded: > 5 transfers in 60s');
  });
});
