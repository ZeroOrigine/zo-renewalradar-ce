// CANONICAL /api/alerts route: list renewal countdown alerts for the signed-in user.
// rate-limit-exempt: read-only GET endpoint, no writes and no model spend.
import { getSessionUser } from '@/lib/supabase/server';
import { fail, failUnauthorized, handleRouteError, ok, parsePagination } from '@/lib/db/http';
import { uuidSchema } from '@/lib/db/validation';
import { listAlerts } from '@/lib/db/alerts';
import type { AlertStatus } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

const ALERT_STATUSES: AlertStatus[] = ['pending', 'sent', 'dismissed'];

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const url = new URL(request.url);
    const { page, limit, from, to } = parsePagination(url);

    const statusParam = url.searchParams.get('status');
    if (statusParam !== null && !ALERT_STATUSES.includes(statusParam as AlertStatus)) {
      return fail(400, 'invalid_status', 'Status filters must be pending, sent, or dismissed.');
    }
    const licenseIdParam = url.searchParams.get('license_id');
    if (licenseIdParam !== null && !uuidSchema.safeParse(licenseIdParam).success) {
      return fail(400, 'invalid_license_id', 'That license id does not look right. Refresh and try again.');
    }

    const { alerts, total } = await listAlerts(supabase, user.id, {
      from,
      to,
      status: (statusParam as AlertStatus | null) ?? undefined,
      licenseId: licenseIdParam ?? undefined,
    });
    return ok({ alerts, pagination: { page, limit, total } });
  } catch (error) {
    return handleRouteError(error, 'GET /api/alerts');
  }
}
