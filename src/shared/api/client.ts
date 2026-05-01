import { ApiError } from './errors';

const LS_API = 'maklago_api_base';
const LS_TENANT = 'maklago_tenant_slug';
const LS_PLATFORM = 'maklago_platform_key';
const LS_PLATFORM_TOKEN = 'maklago_platform_token';
const LS_TOKEN = 'maklago_access_token';

const DEV_DIRECT_API = new Set(['http://localhost:3000', 'http://127.0.0.1:3000']);

/**
 * API origin. Empty string = same origin as the SPA (Vite dev proxies `/api` → backend — no CORS).
 * If you previously saved `http://localhost:3000`, that bypasses the proxy and triggers CORS; we normalize in dev.
 */
export function getApiBase(): string {
  const stored = localStorage.getItem(LS_API);
  if (stored !== null) {
    const s = stored.replace(/\/$/, '');
    if (import.meta.env.DEV && DEV_DIRECT_API.has(s)) {
      localStorage.setItem(LS_API, '');
      return '';
    }
    return s;
  }
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

export function setApiBase(url: string) {
  localStorage.setItem(LS_API, url.replace(/\/$/, ''));
}

export function getTenantSlug(): string {
  return localStorage.getItem(LS_TENANT) || '';
}

/** Persist slug for optional `x-tenant-id`; omit argument or pass '' to clear (slugless / JWT-only). */
export function setTenantSlug(slug: string) {
  const s = slug.trim().toLowerCase();
  if (!s) localStorage.removeItem(LS_TENANT);
  else localStorage.setItem(LS_TENANT, s);
}

export function clearTenantSlug() {
  localStorage.removeItem(LS_TENANT);
}

export function getPlatformKey(): string {
  return localStorage.getItem(LS_PLATFORM) || '';
}

export function setPlatformKey(key: string) {
  localStorage.setItem(LS_PLATFORM, key);
}

export function getPlatformToken(): string | null {
  return localStorage.getItem(LS_PLATFORM_TOKEN);
}

export function setPlatformToken(token: string | null) {
  if (token) localStorage.setItem(LS_PLATFORM_TOKEN, token);
  else localStorage.removeItem(LS_PLATFORM_TOKEN);
}

export function getToken(): string | null {
  return localStorage.getItem(LS_TOKEN);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(LS_TOKEN, token);
  else localStorage.removeItem(LS_TOKEN);
}

export type RequestOptions = RequestInit & {
  /** Send Bearer token (default true for tenant routes) */
  auth?: boolean;
  /** Include x-platform-key */
  platform?: boolean;
  /** Omit x-tenant-id (platform routes) */
  skipTenant?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, platform = false, skipTenant = false, ...init } = options;
  const base = getApiBase();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (platform) {
    const pt = getPlatformToken();
    if (pt) headers.set('Authorization', `Bearer ${pt}`);
    else {
      const k = getPlatformKey();
      if (k) headers.set('x-platform-key', k);
    }
  } else if (auth) {
    const t = getToken();
    if (t) headers.set('Authorization', `Bearer ${t}`);
  }
  if (!skipTenant) {
    const tenant = getTenantSlug();
    if (tenant) headers.set('x-tenant-id', tenant);
  }

  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
