// CANONICAL Purpose Beacon collector for RenewalRadar CE.
// Public (middleware allowlisted) because signup beacons fire before a session
// exists in the email-confirmation flow. Accepts ONLY client-truth events:
// 'page_view' and 'signup'. 'activation' and 'payment' are server-authoritative
// (POST /api/licenses and /api/billing/confirm) and are rejected here so they
// can never be double counted or spoofed from a browser.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimitCheck, clientIp } from '@/lib/rate-limit';
import { emitProductMetric } from '@/lib/db/metrics';

export const dynamic = 'force-dynamic';

const beaconSchema = z.object({
  event: z.enum(['page_view', 'signup']),
  path: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .regex(/^\//, 'Paths must start with /.'),
});

export async function POST(request: Request) {
  try {
    const verdict = await rateLimitCheck('renewalradarce_beacon', clientIp(request), 60, 2000);
    if (!verdict.allowed) {
      return NextResponse.json({ data: null, error: 'rate_limited' }, { status: 429 });
    }
    const raw = await request.json().catch(() => null);
    const parsed = beaconSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: 'invalid_beacon' }, { status: 400 });
    }
    await emitProductMetric(parsed.data.event, parsed.data.path);
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch {
    // Beacons are fail-soft everywhere; never surface an error to the page.
    return NextResponse.json({ data: { ok: true }, error: null });
  }
}
