// CANONICAL /api/ce-entries/[id] route: read, update, delete one CE entry.
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
import { courseHoursSchema, isoDateSchema, uuidSchema } from '@/lib/db/validation';
import {
  deleteCeEntry,
  getCeEntry,
  updateCeEntry,
  type CeEntryPatch,
} from '@/lib/db/ce-entries';
import { attachProgress, getLicenseRecord } from '@/lib/db/licenses';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LicenseWithProgress } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

const updateCeEntrySchema = z
  .object({
    course_name: z
      .string({ invalid_type_error: 'Course names need to be text.' })
      .trim()
      .min(1, 'What was the course called?')
      .max(300, 'Course names cap at 300 characters.')
      .optional(),
    provider_name: z
      .string({ invalid_type_error: 'Provider names need to be text.' })
      .trim()
      .max(200, 'Provider names cap at 200 characters.')
      .optional(),
    category: z
      .string({ invalid_type_error: 'Categories need to be text.' })
      .trim()
      .min(1, 'Categories cannot be blank. Use general if you are unsure.')
      .max(100, 'Categories cap at 100 characters.')
      .optional(),
    hours: courseHoursSchema.optional(),
    completed_on: isoDateSchema.optional(),
    certificate_url: z
      .string({ invalid_type_error: 'Certificate links need to be text.' })
      .trim()
      .url('Certificate links need to be a full URL, like https://example.com/certificate.pdf.')
      .max(2048, 'Certificate links cap at 2048 characters.')
      .refine((value) => value.startsWith('https://'), 'Certificate links need to start with https://.')
      .nullish(),
    notes: z
      .string({ invalid_type_error: 'Notes need to be text.' })
      .trim()
      .max(2000, 'Notes cap at 2000 characters.')
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Send at least one field to update.',
  });

async function licenseProgressFor(
  supabase: SupabaseClient,
  userId: string,
  licenseId: string,
): Promise<LicenseWithProgress | null> {
  const licenseRecord = await getLicenseRecord(supabase, userId, licenseId);
  if (!licenseRecord) return null;
  const [license] = await attachProgress(supabase, userId, [licenseRecord]);
  return license ?? null;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const idCheck = uuidSchema.safeParse(context.params.id);
    if (!idCheck.success) {
      return fail(400, 'invalid_id', 'That CE entry id does not look right. Refresh and try again.');
    }

    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const entry = await getCeEntry(supabase, user.id, idCheck.data);
    if (!entry) return failNotFound('We could not find that CE entry. It may have been removed.');
    return ok(entry);
  } catch (error) {
    return handleRouteError(error, 'GET /api/ce-entries/[id]');
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const verdict = await rateLimitCheck('renewalradarce_write', clientIp(request), 30, 2000);
    if (!verdict.allowed) return failRateLimited();

    const idCheck = uuidSchema.safeParse(context.params.id);
    if (!idCheck.success) {
      return fail(400, 'invalid_id', 'That CE entry id does not look right. Refresh and try again.');
    }

    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const rawBody = await request.json().catch(() => null);
    if (rawBody === null || typeof rawBody !== 'object') {
      return fail(400, 'invalid_json', 'We could not read that request body. Send JSON.');
    }
    const parsed = updateCeEntrySchema.safeParse(rawBody);
    if (!parsed.success) return failValidation(parsed.error);

    const patch: CeEntryPatch = parsed.data;
    const entry = await updateCeEntry(supabase, user.id, idCheck.data, patch);
    if (!entry) return failNotFound('We could not find that CE entry. It may have been removed.');

    const license = await licenseProgressFor(supabase, user.id, entry.license_id);
    return ok({ entry, license });
  } catch (error) {
    return handleRouteError(error, 'PATCH /api/ce-entries/[id]');
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const verdict = await rateLimitCheck('renewalradarce_write', clientIp(request), 30, 2000);
    if (!verdict.allowed) return failRateLimited();

    const idCheck = uuidSchema.safeParse(context.params.id);
    if (!idCheck.success) {
      return fail(400, 'invalid_id', 'That CE entry id does not look right. Refresh and try again.');
    }

    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const deleted = await deleteCeEntry(supabase, user.id, idCheck.data);
    if (!deleted) {
      return failNotFound('We could not find that CE entry. It may have been removed already.');
    }

    const license = await licenseProgressFor(supabase, user.id, deleted.license_id);
    return ok({ id: deleted.id, deleted: true, license });
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/ce-entries/[id]');
  }
}
