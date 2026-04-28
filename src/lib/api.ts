const API_LOCAL = 'http://localhost:3456/api';

// Cloudflare Worker (set in localStorage as `pof_cloud_url`, e.g.
// "https://pof-sync.davidokc28.workers.dev"). Empty string disables
// the cloud fallback for /api/* calls — sync.ts uses cloudFetch()
// directly which is independent of this and never silently fails.
function cloudUrl(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem('pof_cloud_url') || '';
}

function authToken(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem('pof_auth_token') || '';
}

interface APIOptions extends RequestInit {
  timeout?: number;
}

export async function apiCall<T = unknown>(path: string, options: APIOptions = {}): Promise<T> {
  const { timeout = 2000, ...fetchOpts } = options;

  // Try local sync_server first
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(API_LOCAL + path, {
      ...fetchOpts,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      if (res.status === 204) return undefined as T;
      return res.json();
    }
  } catch {
    // Local server not available — fall through
  }

  // Fall back to Cloudflare. Note: the legacy /api/* surface on the
  // cloud side does not exist yet — this only succeeds if you've
  // pointed `pof_cloud_url` at a worker that mirrors it. Sync of
  // record happens via lib/sync.ts against /sync/:table.
  const cloud = cloudUrl();
  if (cloud) {
    const token = authToken();
    const res = await fetch(cloud + path, {
      ...fetchOpts,
      headers: {
        ...fetchOpts.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      if (res.status === 204) return undefined as T;
      return res.json();
    }
    throw new Error(`API error: ${res.status}`);
  }

  throw new Error('No API available');
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  return apiCall<T>(path);
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return apiCall<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  return apiCall<T>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path: string): Promise<void> {
  return apiCall(path, { method: 'DELETE' });
}

export async function checkServerOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(API_LOCAL + '/clips?limit=1', { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Cloud-only helpers used by lib/sync.ts ───
//
// Always hits the configured cloud Worker; never falls back to local.
// Returns null when the cloud is disabled (no token or URL set) so
// callers can no-op cleanly on devices that aren't enrolled yet.

export function cloudConfigured(): boolean {
  return !!(cloudUrl() && authToken());
}

export async function cloudFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T | null> {
  const cloud = cloudUrl();
  const token = authToken();
  if (!cloud || !token) return null;

  const res = await fetch(cloud + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`cloud ${init.method || 'GET'} ${path} → ${res.status}`);
  if (res.status === 204) return null;
  return res.json() as Promise<T>;
}
