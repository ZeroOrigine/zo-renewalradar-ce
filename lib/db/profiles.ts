// CANONICAL profile data service for RenewalRadar CE.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/lib/db/types';

const PROFILE_COLUMNS = 'id, email, full_name, role, timezone, email_alerts_enabled, created_at, updated_at';

export interface ProfilePatch {
  full_name?: string;
  timezone?: string;
  email_alerts_enabled?: boolean;
}

export async function ensureProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string | null,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('renewalradarce_profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(`ensureProfile lookup: ${error.message}`);
  if (data) return data as Profile;

  const { data: created, error: insertError } = await supabase
    .from('renewalradarce_profiles')
    .insert({ id: userId, email, full_name: '' })
    .select(PROFILE_COLUMNS)
    .single();
  if (!insertError && created) return created as Profile;

  if (insertError && insertError.code === '23505') {
    const { data: existing, error: retryError } = await supabase
      .from('renewalradarce_profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .single();
    if (retryError) throw new Error(`ensureProfile retry: ${retryError.message}`);
    return existing as Profile;
  }
  throw new Error(`ensureProfile insert: ${insertError?.message ?? 'unknown'}`);
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: ProfilePatch,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('renewalradarce_profiles')
    .update(patch)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`updateProfile: ${error.message}`);
  return (data as Profile | null) ?? null;
}
