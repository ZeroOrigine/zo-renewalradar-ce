// CANONICAL /api/licenses collection route: list licenses with CE progress, create a license.
import { z } from 'zod';
import { rateLimitCheck, clientIp } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/supabase/server';
import {
  fail,
  failRateLimited,
  failUnauthorized,
  failValidation,
  handleRouteError,
  ok,
  parsePagination,
} from '@/lib/db/http';
import {
  isoDateSchema,
  licenseStatusSchema,
  professionSchema,
  stateCodeSchema,
  uuidSchema,
} from '@/lib/db/validation';
import { countLicenses, createLicense, listLicenses } from '@/lib/db/licenses';
import { getEntitlement } from '@/lib/db/plans';
import { emitProductMetric } from '@/lib/db/metrics';
import type { LicenseStatus } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

const LICENSE_STATUSES: LicenseStatus[] = ['active', 'expired', 'inactive'];

const createLicenseSchema = z.object({
  state_code: stateCodeSchema,
  profession: professionSchema,
  license_class: z
    .string({ invalid_type_error: 'License class needs to be text.' })
    .trim()
    .min(1, 'License class cannot be blank. Use all if you are unsure.')
    .max(100, 'License class caps at 100 characters.')
    .default('all'),
  license_number: z
    .string({ invalid_type_error: 'License numbers need to be text.' })
    .trim()
    .max(100, 'License numbers cap at 100 characters.')
    .default(''),
  label: z
    .string({ invalid_type_error: 'Labels need to be text.' })
    .trim()
    .max(120, 'Labels cap at 120 characters.')
    .default(''),
  status: licenseStatusSchema.default('active'),
  issued_on: isoDateSchema.nullish(),
  current_period_start: isoDateSchema.nullish(),
  renewal_deadline: isoDateSchema,
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
    .default(''),
});

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const url = new URL(request.url);
    const { page, limit, from, to } = parsePagination(url);
    const statusParam = url.searchParams.get('status');
    if (statusParam !== null && !LICENSE_STATUSES.includes(statusParam as LicenseStatus)) {
      return fail(400, 'invalid_status', 'Status filters must be active, expired, or inactive.');
    }

    const { licenses, total } = await listLicenses(supabase, user.id, {
      from,
      to,
      status: (statusParam as LicenseStatus | null) ?? undefined,
    });
    return ok({ licenses, pagination: { page, limit, total } });
  } catch (error) {
    return handleRouteError(error, 'GET /api/licenses');
  }
}

export async function POST(request: Request) {
  try {
    const verdict = await rateLimitCheck('renewalradarce_write', clientIp(request), 30, 2000);
    if (!verdict.allowed) return failRateLimited();

    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const rawBody = await request.json().catch(() => null);
    if (rawBody === null || typeof rawBody !== 'object') {
      return fail(400, 'invalid_json', 'We could not read that request body. Send JSON.');
    }
    const parsed = createLicenseSchema.safeParse(rawBody);
    if (!parsed.success) return failValidation(parsed.error);

    const [entitlement, existingCount] = await Promise.all([
      getEntitlement(supabase, user.id),
      countLicenses(supabase, user.id),
    ]);
    if (entitlement.max_licenses !== null && existingCount >= entitlement.max_licenses) {
      return fail(
        403,
        'license_limit_reached',
        `Your ${entitlement.plan_name} plan tracks up to ${entitlement.max_licenses} licenses. Upgrade to Pro to track every license you hold.`,
      );
    }

    const license = await createLicense(supabase, user.id, {
      state_code: parsed.data.state_code,
      profession: parsed.data.profession,
      license_class: parsed.data.license_class,
      license_number: parsed.data.license_number,
      label: parsed.data.label,
      status: parsed.data.status,
      issued_on: parsed.data.issued_on ?? null,
      current_period_start: parsed.data.current_period_start ?? null,
      renewal_deadline: parsed.data.renewal_deadline,
      hours_required_override: parsed.data.hours_required_override ?? null,
      state_rule_id: parsed.data.state_rule_id ?? null,
      notes: parsed.data.notes,
    });

    // Law 116 activation: the user's first tracked license, emitted server side.
    if (existingCount === 0) {
      await emitProductMetric('activation', '/api/licenses');
    }
    return ok(license, 201);
  } catch (error) {
    return handleRouteError(error, 'POST /api/licenses');
  }
}
