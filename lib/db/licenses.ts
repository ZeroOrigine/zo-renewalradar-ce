// CANONICAL license data service for RenewalRadar CE. Routes call these; services never render UI.
import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError } from '@/lib/db/http';
import { STATE_RULE_COLUMNS } from '@/lib/db/state-rules';
import type {
  CategoryProgress,
  License,
  LicenseProgress,
  LicenseStatus,
  LicenseWithProgress,
  Profession,
  StateRule,
} from '@/lib/db/types';

const LICENSE_COLUMNS =
  'id, user_id, state_code, profession, license_class, license_number, label, state_rule_id, status, issued_on, current_period_start, renewal_deadline, hours_required_override, notes, created_at, updated_at';

const LICENSE_WITH_RULE = `${LICENSE_COLUMNS}, state_rule:renewalradarce_state_rules(${STATE_RULE_COLUMNS})`;

export interface ProgressEntry {
  license_id: string;
  category: string;
  hours: number;
  completed_on: string;
}

export interface LicenseInput {
  state_code: string;
  profession: Profession;
  license_class: string;
  license_number: string;
  label: string;
  status: LicenseStatus;
  issued_on: string | null;
  current_period_start: string | null;
  renewal_deadline: string;
  hours_required_override: number | null;
  state_rule_id: string | null;
  notes: string;
}

export type LicensePatch = Partial<LicenseInput>;

function mapLicenseWriteError(error: { code?: string; message: string }): Error {
  if (error.code === '23503') {
    return new ServiceError(
      400,
      'invalid_reference',
      'That state rule reference does not exist. Leave it blank and we will match one for you.',
    );
  }
  return new Error(`license write: ${error.message}`);
}

function daysUntil(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  const target = Date.UTC(year, month - 1, day);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeProgress(license: License, entries: ProgressEntry[]): LicenseProgress {
  const inPeriod = entries.filter(
    (entry) =>
      (license.current_period_start === null || entry.completed_on >= license.current_period_start) &&
      entry.completed_on <= license.renewal_deadline,
  );
  const hoursCompleted = round2(inPeriod.reduce((total, entry) => total + Number(entry.hours), 0));
  const requiredRaw = license.hours_required_override ?? license.state_rule?.total_hours_required ?? null;
  const hoursRequired = requiredRaw === null ? null : Number(requiredRaw);
  const hoursRemaining = hoursRequired === null ? null : round2(Math.max(0, hoursRequired - hoursCompleted));
  const percentComplete =
    hoursRequired === null || hoursRequired === 0
      ? null
      : Math.min(100, Math.round((hoursCompleted / hoursRequired) * 100));
  const categoryProgress: CategoryProgress[] = (license.state_rule?.category_requirements ?? []).map(
    (requirement) => {
      const completed = round2(
        inPeriod
          .filter((entry) => entry.category === requirement.category)
          .reduce((total, entry) => total + Number(entry.hours), 0),
      );
      return {
        category: requirement.category,
        hours_required: Number(requirement.hours),
        hours_completed: completed,
        hours_remaining: round2(Math.max(0, Number(requirement.hours) - completed)),
      };
    },
  );
  return {
    hours_required: hoursRequired,
    hours_completed: hoursCompleted,
    hours_remaining: hoursRemaining,
    percent_complete: percentComplete,
    days_until_renewal: daysUntil(license.renewal_deadline),
    entries_in_period: inPeriod.length,
    category_progress: categoryProgress,
  };
}

export async function attachProgress(
  supabase: SupabaseClient,
  userId: string,
  licenses: License[],
): Promise<LicenseWithProgress[]> {
  if (licenses.length === 0) return [];
  const licenseIds = licenses.map((license) => license.id);
  const PAGE_SIZE = 1000;
  const entries: ProgressEntry[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('renewalradarce_ce_entries')
      .select('license_id, category, hours, completed_on')
      .eq('user_id', userId)
      .in('license_id', licenseIds)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`attachProgress: ${error.message}`);
    const page = (data ?? []) as ProgressEntry[];
    entries.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return licenses.map((license) => ({
    ...license,
    progress: computeProgress(license, entries.filter((entry) => entry.license_id === license.id)),
  }));
}

export async function countLicenses(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('renewalradarce_licenses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw new Error(`countLicenses: ${error.message}`);
  return count ?? 0;
}

export async function resolveStateRule(
  supabase: SupabaseClient,
  stateCode: string,
  profession: Profession,
  licenseClass: string,
): Promise<StateRule | null> {
  const classes = licenseClass === 'all' ? ['all'] : [licenseClass, 'all'];
  const { data, error } = await supabase
    .from('renewalradarce_state_rules')
    .select(STATE_RULE_COLUMNS)
    .eq('state_code', stateCode)
    .eq('profession', profession)
    .in('license_class', classes);
  if (error) throw new Error(`resolveStateRule: ${error.message}`);
  const rules = (data ?? []) as StateRule[];
  return (
    rules.find((rule) => rule.license_class === licenseClass) ??
    rules.find((rule) => rule.license_class === 'all') ??
    null
  );
}

export async function listLicenses(
  supabase: SupabaseClient,
  userId: string,
  options: { from: number; to: number; status?: LicenseStatus },
): Promise<{ licenses: LicenseWithProgress[]; total: number }> {
  let query = supabase
    .from('renewalradarce_licenses')
    .select(LICENSE_WITH_RULE, { count: 'exact' })
    .eq('user_id', userId)
    .order('renewal_deadline', { ascending: true })
    .range(options.from, options.to);
  if (options.status) query = query.eq('status', options.status);

  const { data, error, count } = await query;
  if (error) throw new Error(`listLicenses: ${error.message}`);
  const licenses = (data ?? []) as unknown as License[];
  return { licenses: await attachProgress(supabase, userId, licenses), total: count ?? 0 };
}

export async function getLicenseRecord(
  supabase: SupabaseClient,
  userId: string,
  licenseId: string,
): Promise<License | null> {
  const { data, error } = await supabase
    .from('renewalradarce_licenses')
    .select(LICENSE_WITH_RULE)
    .eq('id', licenseId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`getLicenseRecord: ${error.message}`);
  return data ? (data as unknown as License) : null;
}

export async function getLicenseWithProgress(
  supabase: SupabaseClient,
  userId: string,
  licenseId: string,
): Promise<LicenseWithProgress | null> {
  const license = await getLicenseRecord(supabase, userId, licenseId);
  if (!license) return null;
  const [withProgress] = await attachProgress(supabase, userId, [license]);
  return withProgress ?? null;
}

export async function createLicense(
  supabase: SupabaseClient,
  userId: string,
  input: LicenseInput,
): Promise<LicenseWithProgress> {
  let stateRuleId = input.state_rule_id;
  if (!stateRuleId) {
    const rule = await resolveStateRule(supabase, input.state_code, input.profession, input.license_class);
    stateRuleId = rule?.id ?? null;
  }

  const { data, error } = await supabase
    .from('renewalradarce_licenses')
    .insert({
      user_id: userId,
      product_id: 'renewalradarce',
      state_code: input.state_code,
      profession: input.profession,
      license_class: input.license_class,
      license_number: input.license_number,
      label: input.label,
      status: input.status,
      issued_on: input.issued_on,
      current_period_start: input.current_period_start,
      renewal_deadline: input.renewal_deadline,
      hours_required_override: input.hours_required_override,
      state_rule_id: stateRuleId,
      notes: input.notes,
    })
    .select(LICENSE_WITH_RULE)
    .single();
  if (error) throw mapLicenseWriteError(error);
  const license = data as unknown as License;
  return { ...license, progress: computeProgress(license, []) };
}

export async function updateLicense(
  supabase: SupabaseClient,
  userId: string,
  licenseId: string,
  patch: LicensePatch,
): Promise<LicenseWithProgress | null> {
  const { data: existingData, error: existingError } = await supabase
    .from('renewalradarce_licenses')
    .select('id, state_code, profession, license_class, state_rule_id')
    .eq('id', licenseId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existingError) throw new Error(`updateLicense lookup: ${existingError.message}`);
  if (!existingData) return null;

  const existing = existingData as Pick<
    License,
    'id' | 'state_code' | 'profession' | 'license_class' | 'state_rule_id'
  >;
  const next: LicensePatch = { ...patch };
  const identityChanged =
    (patch.state_code !== undefined && patch.state_code !== existing.state_code) ||
    (patch.profession !== undefined && patch.profession !== existing.profession) ||
    (patch.license_class !== undefined && patch.license_class !== existing.license_class);
  if (identityChanged && patch.state_rule_id === undefined) {
    const rule = await resolveStateRule(
      supabase,
      patch.state_code ?? existing.state_code,
      patch.profession ?? existing.profession,
      patch.license_class ?? existing.license_class,
    );
    next.state_rule_id = rule?.id ?? null;
  }

  const { data, error } = await supabase
    .from('renewalradarce_licenses')
    .update(next)
    .eq('id', licenseId)
    .eq('user_id', userId)
    .select(LICENSE_WITH_RULE)
    .single();
  if (error) throw mapLicenseWriteError(error);
  const license = data as unknown as License;
  const [withProgress] = await attachProgress(supabase, userId, [license]);
  return withProgress ?? null;
}

export async function deleteLicense(
  supabase: SupabaseClient,
  userId: string,
  licenseId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('renewalradarce_licenses')
    .delete()
    .eq('id', licenseId)
    .eq('user_id', userId)
    .select('id');
  if (error) throw new Error(`deleteLicense: ${error.message}`);
  return (data ?? []).length > 0;
}
