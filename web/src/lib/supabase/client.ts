'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function getConfiguredValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function hasSupabaseBrowserConfig(): boolean {
  return Boolean(
    getConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      getConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const supabaseUrl = getConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = getConfiguredValue(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}
