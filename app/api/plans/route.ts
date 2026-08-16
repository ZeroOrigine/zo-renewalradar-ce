// CANONICAL /api/plans route: public pricing catalog read from the database, never from env vars.
// rate-limit-exempt: read-only GET over a public catalog, no writes and no model spend.
import { createClient } from '@/lib/supabase/server';
import { handleRouteError, ok, parsePagination } from '@/lib/db/http';
import { listActivePlans } from '@/lib/db/plans';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { page, limit, from, to } = parsePagination(new URL(request.url));
    const supabase = createClient();
    const { plans, total } = await listActivePlans(supabase, { from, to });
    return ok({ plans, pagination: { page, limit, total } });
  } catch (error) {
    return handleRouteError(error, 'GET /api/plans');
  }
}
