// CANONICAL server-side Supabase clients for RenewalRadar CE: session-scoped plus lazy service role.
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  createClient as createBareClient,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';

export function createClient(): SupabaseClient {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server components cannot write cookies; middleware refreshes sessions.
          }
        },
      },
    },
  );
}

let serviceRoleClient: SupabaseClient | null = null;

export function createServiceRoleClient(): SupabaseClient {
  if (!serviceRoleClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error('Supabase service role configuration is missing.');
    }
    serviceRoleClient = createBareClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceRoleClient;
}

export async function getSessionUser(): Promise<{ supabase: SupabaseClient; user: User | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
