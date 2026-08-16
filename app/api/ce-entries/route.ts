// CANONICAL /api/ce-entries collection route: list CE entries, log a completed course.
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
  parsePagination,
} from '@/lib/db/http';
import { courseHoursSchema, isoDateSchema, uuidSchema } from '@/lib/db/validation';
import { createCeEntry, listCeEntries } from '@/lib/db/ce-entries';
import { attachProgress, getLicenseRecord } from '@/lib/db/licenses';

export const dynamic = 'force-dynamic';

const createCeEntrySchema = z.object({
  license_id: uuidSchema,
  course_name: z
    .string({
      required_error: 'What was the course called?',
      invalid_type_error: 'Course names need to be text.',
    })
    .trim()
    .min(1, 'What was the course called?')
    .max(300, 'Course names cap at 300 characters.'),
  provider_name: z
    .string({ invalid_type_error: 'Provider names need to be text.' })
    .trim()
    .max(200, 'Provider names cap at 200 characters.')
    .default(''),
  category: z
    .string({ invalid_type_error: 'Categories need to be text.' })
    .trim()
    .min(1, 'Categories cannot be blank. Use general if you are unsure.')
    .max(100, 'Categories cap at 100 characters.')
    .default('general'),
  hours: courseHoursSchema,
  completed_on: isoDateSchema,
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
    .default(''),
});

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getSessionUser();
    if (!user) return failUnauthorized();

    const url = new URL(request.url);
    const { page, limit, from, to } = parsePagination(url);
    const licenseIdParam = url.searchParams.get('license_id');
    if (licenseIdParam !== null && !uuidSchema.safeParse(licenseIdParam).success) {
      return fail(400, 'invalid_license_id', 'That license id does not look right. Refresh and try again.');
    }

    const { entries, total } = await listCeEntries(supabase, user.id, {
      from,
      to,
      licenseId: licenseIdParam ?? undefined,
    });
    return ok({ ce_entries: entries, pagination: { page, limit, total } });
  } catch (error) {
    return handleRouteError(error, 'GET /api/ce-entries');
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
    const parsed = createCeEntrySchema.safeParse(rawBody);
    if (!parsed.success) return failValidation(parsed.error);

    const licenseRecord = await getLicenseRecord(supabase, user.id, parsed.data.license_id);
    if (!licenseRecord) {
      return failNotFound('We could not find that license. Refresh and try again.');
    }

    const entry = await createCeEntry(supabase, user.id, {
      license_id: parsed.data.license_id,
      course_name: parsed.data.course_name,
      provider_name: parsed.data.provider_name,
      category: parsed.data.category,
      hours: parsed.data.hours,
      completed_on: parsed.data.completed_on,
      certificate_url: parsed.data.certificate_url ?? null,
      notes: parsed.data.notes,
    });

    // Fresh progress lets the UI celebrate the new total in one round trip.
    const [license] = await attachProgress(supabase, user.id, [licenseRecord]);
    return ok({ entry, license: license ?? null }, 201);
  } catch (error) {
    return handleRouteError(error, 'POST /api/ce-entries');
  }
}
