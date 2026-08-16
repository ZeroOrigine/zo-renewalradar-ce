// CANONICAL client-side fetch helper for RenewalRadar CE. Every API returns { data, error, code }.
export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  code: string | null;
  status: number;
  details?: Record<string, string[] | undefined>;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        data: null,
        error: body?.error ?? 'Something hiccupped on our side. Please try again in a moment.',
        code: body?.code ?? null,
        status: res.status,
        details: body?.details,
      };
    }
    return { data: (body?.data ?? null) as T, error: null, code: null, status: res.status };
  } catch {
    return {
      data: null,
      error: 'We could not reach the server. Check your connection and try again.',
      code: 'network',
      status: 0,
    };
  }
}

export function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return apiRequest<T>(path);
}

export function apiSend<T>(path: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  return apiRequest<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
}
