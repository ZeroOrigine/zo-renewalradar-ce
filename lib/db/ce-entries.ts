// CANONICAL CE entry data service for RenewalRadar CE.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CeEntry } from '@/lib/db/types';

const CE_ENTRY_COLUMNS =
  'id, user_id, license_id, course_name, provider_name, category, hours, completed_on, certificate_url, notes, created_at, updated_at';

export interface CeEntryInput {
  license_id: string;
  course_name: string;
  provider_name: string;
  category: string;
  hours: number;
  completed_on: string;
  certificate_url: string | null;
  notes: string;
}

export type CeEntryPatch = Partial<Omit<CeEntryInput, 'license_id'>>;

export async function listCeEntries(
  supabase: SupabaseClient,
  userId: string,
  options: { from: number; to: number; licenseId?: string },
): Promise<{ entries: CeEntry[]; total: number }> {
  let query = supabase
    .from('renewalradarce_ce_entries')
    .select(CE_ENTRY_COLUMNS, { count: 'exact' })
    .eq('user_id', userId)
    .order('completed_on', { ascending: false })
    .order('created_at', { ascending: false })
    .range(options.from, options.to);
  if (options.licenseId) query = query.eq('license_id', options.licenseId);

  const { data, error, count } = await query;
  if (error) throw new Error(`listCeEntries: ${error.message}`);
  return { entries: (data ?? []) as CeEntry[], total: count ?? 0 };
}

export async function getCeEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
): Promise<CeEntry | null> {
  const { data, error } = await supabase
    .from('renewalradarce_ce_entries')
    .select(CE_ENTRY_COLUMNS)
    .eq('id', entryId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`getCeEntry: ${error.message}`);
  return (data as CeEntry | null) ?? null;
}

export async function createCeEntry(
  supabase: SupabaseClient,
  userId: string,
  input: CeEntryInput,
): Promise<CeEntry> {
  const { data, error } = await supabase
    .from('renewalradarce_ce_entries')
    .insert({
      user_id: userId,
      product_id: 'renewalradarce',
      license_id: input.license_id,
      course_name: input.course_name,
      provider_name: input.provider_name,
      category: input.category,
      hours: input.hours,
      completed_on: input.completed_on,
      certificate_url: input.certificate_url,
      notes: input.notes,
    })
    .select(CE_ENTRY_COLUMNS)
    .single();
  if (error) throw new Error(`createCeEntry: ${error.message}`);
  return data as CeEntry;
}

export async function updateCeEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
  patch: CeEntryPatch,
): Promise<CeEntry | null> {
  const { data, error } = await supabase
    .from('renewalradarce_ce_entries')
    .update(patch)
    .eq('id', entryId)
    .eq('user_id', userId)
    .select(CE_ENTRY_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`updateCeEntry: ${error.message}`);
  return (data as CeEntry | null) ?? null;
}

export async function deleteCeEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
): Promise<{ id: string; license_id: string } | null> {
  const { data, error } = await supabase
    .from('renewalradarce_ce_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)
    .select('id, license_id');
  if (error) throw new Error(`deleteCeEntry: ${error.message}`);
  const rows = (data ?? []) as Array<{ id: string; license_id: string }>;
  return rows[0] ?? null;
}
