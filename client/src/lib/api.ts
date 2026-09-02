export interface ApiError extends Error {
  status: number;
}

// Catch blocks see `unknown` under strict TS. This narrows safely so screens
// can avoid `err: any` while still showing the server's user-facing message.
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

// Access tokens are short lived (1h). On a 401 we try one silent refresh via
// the httpOnly refreshToken cookie, then retry the original request once.
// A shared in flight promise keeps concurrent 401s from racing the rotation.
// Helper to resolve paths against API base URL when native/iOS or cross-origin
export function getApiUrl(path: string): string {
  const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
  const apiBase = isNative || import.meta.env.VITE_API_BASE_URL
    ? (import.meta.env.VITE_API_BASE_URL || 'https://srv1829607.hstgr.cloud')
    : '';
  return path.startsWith('http://') || path.startsWith('https://') ? path : `${apiBase}${path}`;
}

// Access tokens are short lived (1h). On a 401 we try one silent refresh via
// the httpOnly refreshToken cookie, then retry the original request once.
// A shared in flight promise keeps concurrent 401s from racing the rotation.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(getApiUrl('/api/auth/refresh'), { method: 'POST' });
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.token) {
          localStorage.setItem('token', data.token);
          // Coach sessions store the same JWT under a separate key for the
          // coach portal's raw-fetch calls. Keep it in sync on refresh so the
          // portal doesn't get stuck on an expired token after a silent renew.
          const userStr = localStorage.getItem('user');
          if (userStr) {
            try {
              const role = JSON.parse(userStr).role;
              if (role === 'coach' || role === 'admin') {
                localStorage.setItem('coachToken', data.token);
              }
            } catch { /* ignore parse failure */ }
          }
          return data.token as string;
        }
        return null;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

// Wraps fetch: injects the Bearer token, sends/parses JSON, and throws on non-2xx.
export async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const targetUrl = getApiUrl(path);

  const doFetch = async (token: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(opts.headers as Record<string, string> | undefined),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(targetUrl, { ...opts, headers });
  };

  let res = await doFetch(localStorage.getItem('token') || localStorage.getItem('coachToken'));

  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(newToken);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `Request failed (${res.status})`) as ApiError;
    err.status = res.status;
    throw err;
  }
  return data as T;
}
