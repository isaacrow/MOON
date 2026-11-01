/**
 * Shared client for the Moon Supabase edge function.
 *
 * The site is served as static files (GitHub Pages), so there is no same-origin
 * `/api` backend: accounts, approvals and records must go to the edge function
 * so every browser sees the same data.
 */
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

export const MOON_API = `https://${projectId}.supabase.co/functions/v1/make-server-49c0e13c`;

const STORAGE_AUTH_KEY = 'moon_auth';

/** Server-issued session token for the signed-in user, if any. */
export function getSessionToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_AUTH_KEY);
    if (!raw) return null;
    const { sessionToken } = JSON.parse(raw);
    return typeof sessionToken === 'string' ? sessionToken : null;
  } catch {
    return null;
  }
}

export function moonHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${publicAnonKey}`,
    ...extra,
  };
  const token = getSessionToken();
  if (token) headers['X-Moon-Session'] = token;
  return headers;
}

/** fetch() against the edge function with auth headers and JSON handling. */
export async function moonFetch<T = any>(
  path: string,
  init: { method?: string; body?: unknown; sessionToken?: string | null } = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const headers = moonHeaders(init.body !== undefined ? { 'Content-Type': 'application/json' } : {});
  if (init.sessionToken) headers['X-Moon-Session'] = init.sessionToken;
  const res = await fetch(`${MOON_API}${path}`, {
    method: init.method || (init.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}
