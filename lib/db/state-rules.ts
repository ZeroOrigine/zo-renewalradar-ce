// CANONICAL state CE rule catalog service for RenewalRadar CE. Public read-only data.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profession, StateRule } from '@/lib/db/types';

export const STATE_RULE_COLUMNS =
  'id, state_code, profession, license_class, total_hours_required, renewal_period_months, category_requirements, renewal_basis, fixed_renewal_month, fixed_renewal_day, carryover_allowed, carryover_max_hours, notes, source_url, last_verified_on';

export async function listStateRules(
  supabase: SupabaseClient,
  options: {
    from: number;
    to: number;
    stateCode?: string;
    profession?: Profession;
    licenseClass?: string;
  },
): Promise<{ rules: StateRule[]; total: number }> {
  let query = supabase
    .from('renewalradarce_state_rules')
    .select(STATE_RULE_COLUMNS, { count: 'exact' })
    .order('state_code', { ascending: true })
    .order('profession', { ascending: true })
    .order('license_class', { ascending: true })
    .range(options.from, options.to);
  if (options.stateCode) query = query.eq('state_code', options.stateCode);
  if (options.profession) query = query.eq('profession', options.profession);
  if (options.licenseClass) query = query.eq('license_class', options.licenseClass);

  const { data, error, count } = await query;
  if (error) throw new Error(`listStateRules: ${error.message}`);
  return { rules: (data ?? []) as StateRule[], total: count ?? 0 };
}
