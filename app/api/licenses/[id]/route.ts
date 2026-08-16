// CANONICAL /api/licenses/[id] route: read one license with progress, update it, delete it.
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
import {
  isoDateSchema,
  licenseStatusSchema,
  professionSchema,
  stateCodeSchema,
  uuidSchema,
} from '@/lib/db/validation';
import {
  attachProgress,
  deleteLicense,
  getLicenseRecord,
  updateLicense,
  type LicensePatch,
} from '@/lib/db/licenses';
import { listCeEntries } from '@/lib/db/ce-entries';
import { listAlerts } from '@/lib/db/alerts';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

const updateLicenseSchema = z
  .object({
    state_code: stateCodeSchema.optional(),
    profession: professionSchema.optional(),
    license_class: z
      .string({ invalid_type_error: 'License class needs to be text.' })
      .trim()
      .min(1, 'License class cannot be blank. Use all if you are unsure.')
      .max(100, 'License class caps at 100 characters.')
      .optional(),
    license_number: z
      .string({ invalid_type_error: 'License numbers need to be text.' })
      .trim()
      .max(100, 'License numbers cap at 100 characters.')
      .optional(),
    label: z
      .string({ invalid_type_error: 'Labels need to be text.' })
      .trim()
      .max(120, 'Labels cap at 120 characters.')
      .optional(),
    status: licenseStatusSchema.optional(),
    issued_on: isoDateSchema.nullish(),
    current_period_start: isoDateSchema.nullish(),
    renewal_deadline: isoDateSchema.optional(),
    hours_required_override: z
      .number({ invalid_type_error: 'Hour overrides must be a number, like 24.' })
      .min(0, 'Hour overrides must be zero or more.')
      .max(1000, 'Hour overrides cap at 1000.')
      .nullish(),
    state_rule_id: uuidSchema.nullish(),
    notes: z
      .string({ invalid_type_error: 'Notes need to be text.' })
      .trim()
      .max(2000, 'Notes cap at 2000 characters.')
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Send at least one field to update.',
  });

export async function GET(request: Request, context: RouteContext) {
  try {
    const idCheck = uuidSchema.safeParse(context.params.id);
    if (!idCheck.success) {
      return fail(400, 'invalid_id', 'That license id does not look right. Refresh and try again.');
    }

    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const licenseRecord = await getLicenseRecord(supabase, user.id, idCheck.data);
    if (!licenseRecord) {
      return failNotFound('We could not find that license. It may have been removed.');
    }

    const [withProgress, entriesResult, alertsResult] = await Promise.all([
      attachProgress(supabase, user.id, [licenseRecord]),
      listCeEntries(supabase, user.id, { from: 0, to: 499, licenseId: licenseRecord.id }),
      listAlerts(supabase, user.id, { from: 0, to: 49, licenseId: licenseRecord.id }),
    ]);

    // Progress comes from paginated attachProgress (all CE rows); the 500-row
    // listCeEntries result is for display only, with ce_entry_total for paging.
    const license = withProgress[0] ?? licenseRecord;
    return ok({
      license,
      ce_entries: entriesResult.entries,
      ce_entry_total: entriesResult.total,
      alerts: alertsResult.alerts,
      alert_total: alertsResult.total,
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/licenses/[id]');
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const verdict = await rateLimitCheck('renewalradarce_write', clientIp(request), 30, 2000);
    if (!verdict.allowed) return failRateLimited();

    const idCheck = uuidSchema.safeParse(context.params.id);
    if (!idCheck.success) {
      return fail(400, 'invalid_id', 'That license id does not look right. Refresh and try again.');
    }

    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const rawBody = await request.json().catch(() => null);
    if (rawBody === null || typeof rawBody !== 'object') {
      return fail(400, 'invalid_json', 'We could not read that request body. Send JSON.');
    }
    const parsed = updateLicenseSchema.safeParse(rawBody);
    if (!parsed.success) return failValidation(parsed.error);

    const patch: LicensePatch = parsed.data;
    const license = await updateLicense(supabase, user.id, idCheck.data, patch);
    if (!license) {
      return failNotFound('We could not find that license. It may have been removed.');
    }
    return ok(license);
  } catch (error) {
    return handleRouteError(error, 'PATCH /api/licenses/[id]');
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const verdict = await rateLimitCheck('renewalradarce_write', clientIp(request), 30, 2000);
    if (!verdict.allowed) return failRateLimited();

    const idCheck = uuidSchema.safeParse(context.params.id);
    if (!idCheck.success) {
      return fail(400, 'invalid_id', 'That license id does not look right. Refresh and try again.');
    }

    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const deleted = await deleteLicense(supabase, user.id, idCheck.data);
    if (!deleted) {
      return failNotFound('We could not find that license. It may have been removed already.');
    }
    return ok({ id: idCheck.data, deleted: true });
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/licenses/[id]');
  }
}
