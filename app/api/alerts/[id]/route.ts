// CANONICAL /api/alerts/[id] route: dismiss or restore one countdown alert.
import { z } from 'zod';
import { rateLimitCheck, clientIp } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/supabase/server';
import {
  fail,
  failNotFound,
  failRateLimited,
  failUnauthorized,
  failValidation,
  handleRouteError,
  ok,
} from '@/lib/db/http';
import { uuidSchema } from '@/lib/db/validation';
import { setAlertStatus } from '@/lib/db/alerts';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

const updateAlertSchema = z.object({
  status: z.enum(['pending', 'dismissed'], {
    errorMap: () => ({ message: 'Alerts can be set to pending or dismissed.' }),
  }),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const verdict = await rateLimitCheck('renewalradarce_write', clientIp(request), 30, 2000);
    if (!verdict.allowed) return failRateLimited();

    const idCheck = uuidSchema.safeParse(context.params.id);
    if (!idCheck.success) {
      return fail(400, 'invalid_id', 'That alert id does not look right. Refresh and try again.');
    }

    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const rawBody = await request.json().catch(() => null);
    if (rawBody === null || typeof rawBody !== 'object') {
      return fail(400, 'invalid_json', 'We could not read that request body. Send JSON.');
    }
    const parsed = updateAlertSchema.safeParse(rawBody);
    if (!parsed.success) return failValidation(parsed.error);

    const alert = await setAlertStatus(supabase, user.id, idCheck.data, parsed.data.status);
    if (!alert) {
      return failNotFound('We could not find that alert. It may have been cleared already.');
    }
    return ok(alert);
  } catch (error) {
    return handleRouteError(error, 'PATCH /api/alerts/[id]');
  }
}
