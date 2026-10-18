/**
 * JWT utility for decoding payload client-side without external dependencies.
 * Never executes or trusts client-side validation as authoritative;
 * all sensitive authorization is enforced by the backend API.
 */

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
  userId?: number;
  walletId?: number;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string): JwtUserPayload | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    // Base64Url to Base64
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const parsed = JSON.parse(jsonPayload);
    return {
      sub: parsed.sub || parsed.email || 'user',
      email: parsed.email || parsed.sub || 'user@example.com',
      role: (parsed.role === 'ADMIN' || parsed.roles?.includes('ROLE_ADMIN') || parsed.roles?.includes('ADMIN')) ? 'ADMIN' : 'USER',
      userId: parsed.userId || (parsed.id ? Number(parsed.id) : 1),
      walletId: parsed.walletId ? Number(parsed.walletId) : undefined,
      exp: parsed.exp,
      iat: parsed.iat,
    };
  } catch (err) {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return false;
  // Exp is in seconds; check if expired with 10s grace
  return Date.now() >= (payload.exp - 10) * 1000;
}
