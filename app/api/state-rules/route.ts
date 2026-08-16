// CANONICAL /api/state-rules route: public read of the neutral state CE rule catalog.
// rate-limit-exempt: read-only GET over a public catalog, no writes and no model spend.
import { createClient } from '@/lib/supabase/server';
import { fail, handleRouteError, ok, parsePagination } from '@/lib/db/http';
import { listStateRules } from '@/lib/db/state-rules';
import type { Profession } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, from, to } = parsePagination(url);

    const stateParam = url.searchParams.get('state');
    if (stateParam !== null && !/^[A-Za-z]{2}$/.test(stateParam.trim())) {
      return fail(400, 'invalid_state', 'State filters are two letters, like CA or TX.');
    }
    const professionParam = url.searchParams.get('profession');
    if (
      professionParam !== null &&
      professionParam !== 'real_estate' &&
      professionParam !== 'insurance'
    ) {
      return fail(400, 'invalid_profession', 'Profession filters must be real_estate or insurance.');
    }
    const licenseClassParam = url.searchParams.get('license_class');

    const supabase = createClient();
    const { rules, total } = await listStateRules(supabase, {
      from,
      to,
      stateCode: stateParam ? stateParam.trim().toUpperCase() : undefined,
      profession: (professionParam as Profession | null) ?? undefined,
      licenseClass: licenseClassParam?.trim() || undefined,
    });
    return ok({ state_rules: rules, pagination: { page, limit, total } });
  } catch (error) {
    return handleRouteError(error, 'GET /api/state-rules');
  }
}
