// CANONICAL /api/me route: profile, plan entitlement, and license count in one response.
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
import { ensureProfile, updateProfile, type ProfilePatch } from '@/lib/db/profiles';
import { getEntitlement } from '@/lib/db/plans';
import { countLicenses } from '@/lib/db/licenses';

export const dynamic = 'force-dynamic';

function timezoneIsValid(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const updateProfileSchema = z
  .object({
    full_name: z
      .string({ invalid_type_error: 'Names need to be text.' })
      .trim()
      .max(200, 'Names cap at 200 characters.')
      .optional(),
    timezone: z
      .string({ invalid_type_error: 'Timezones need to be text.' })
      .trim()
      .min(1, 'Pick a timezone.')
      .max(100, 'Timezones cap at 100 characters.')
      .refine(timezoneIsValid, 'That timezone is not recognized. Use an IANA name, like America/Chicago.')
      .optional(),
    email_alerts_enabled: z
      .boolean({ invalid_type_error: 'The email alerts setting must be true or false.' })
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Send at least one field to update.',
  });

export async function GET() {
  try {
    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const [profile, entitlement, licenseCount] = await Promise.all([
      ensureProfile(supabase, user.id, user.email ?? null),
      getEntitlement(supabase, user.id),
      countLicenses(supabase, user.id),
    ]);
    return ok({ profile, entitlement, license_count: licenseCount });
  } catch (error) {
    return handleRouteError(error, 'GET /api/me');
  }
}

export async function PATCH(request: Request) {
  try {
    const verdict = await rateLimitCheck('renewalradarce_write', clientIp(request), 30, 2000);
    if (!verdict.allowed) return failRateLimited();

    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const rawBody = await request.json().catch(() => null);
    if (rawBody === null || typeof rawBody !== 'object') {
      return fail(400, 'invalid_json', 'We could not read that request body. Send JSON.');
    }
    const parsed = updateProfileSchema.safeParse(rawBody);
    if (!parsed.success) return failValidation(parsed.error);

    const patch: ProfilePatch = parsed.data;
    const profile = await updateProfile(supabase, user.id, patch);
    if (!profile) {
      return failNotFound('We could not find your profile. Sign out and back in, then try again.');
    }
    return ok(profile);
  } catch (error) {
    return handleRouteError(error, 'PATCH /api/me');
  }
}
