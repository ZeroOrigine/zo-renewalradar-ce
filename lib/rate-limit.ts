// CANONICAL rate limiter for RenewalRadar CE API routes.
// Two windows per (bucket, ip): a short per-minute burst cap and a per-day cap.
// In-memory per server instance (no external dependency); fail-open by design so
// a limiter fault can never take the product down. Buckets are product-prefixed.
//
// KNOWN LIMITATION (QA-004): the store below is per-instance and in-memory, so
// counters reset on every cold start and are NOT shared across concurrent
// serverless instances. Treat these limits as a best-effort abuse dampener,
// not a hard security boundary. For hard guarantees, back this with a shared
// store (e.g., Upstash Redis) and/or key write buckets by the authenticated
// user.id in routes (e.g., rateLimitCheck('bucket', `user:${user.id}`, ...))
// so a spoofed or rotating IP cannot dodge per-user limits.

interface WindowState {
  minuteStart: number;
  minuteCount: number;
  dayStart: number;
  dayCount: number;
}

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const MAX_KEYS = 10_000; // bounded memory: evict oldest key past this

const store = new Map<string, WindowState>();

export function clientIp(request: Request): string {
  // Prefer the platform-trusted header first: Netlify sets
  // x-nf-client-connection-ip at its edge from the real TCP connection, so
  // clients cannot spoof it. x-forwarded-for is only a best-effort fallback
  // (client-supplied unless strictly behind a trusted proxy that overwrites
  // it) — acceptable for coarse rate limiting, never for authz decisions.
  const trusted = request.headers.get('x-nf-client-connection-ip')?.trim();
  if (trusted) return trusted;
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export interface RateLimitVerdict {
  allowed: boolean;
  remaining_minute: number;
  remaining_day: number;
}

export async function rateLimitCheck(
  bucket: string,
  ip: string,
  perMinute: number,
  perDay: number,
): Promise<RateLimitVerdict> {
  try {
    const key = `${bucket}:${ip}`;
    const now = Date.now();
    let state = store.get(key);
    if (!state) {
      if (store.size >= MAX_KEYS) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      state = { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
      store.set(key, state);
    }
    if (now - state.minuteStart >= MINUTE_MS) {
      state.minuteStart = now;
      state.minuteCount = 0;
    }
    if (now - state.dayStart >= DAY_MS) {
      state.dayStart = now;
      state.dayCount = 0;
    }
    if (state.minuteCount >= perMinute || state.dayCount >= perDay) {
      return {
        allowed: false,
        remaining_minute: Math.max(0, perMinute - state.minuteCount),
        remaining_day: Math.max(0, perDay - state.dayCount),
      };
    }
    state.minuteCount += 1;
    state.dayCount += 1;
    return {
      allowed: true,
      remaining_minute: perMinute - state.minuteCount,
      remaining_day: perDay - state.dayCount,
    };
  } catch {
    // Fail open: a limiter bug must never block real users.
    return { allowed: true, remaining_minute: 1, remaining_day: 1 };
  }
}
