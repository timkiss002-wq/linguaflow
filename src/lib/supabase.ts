import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { readEnv } from './env';

export type TypedSupabaseClient = SupabaseClient<Database>;

const result = readEnv();

/** `null` when env vars are missing; main.tsx shows a setup screen instead of the app. */
export const supabase: TypedSupabaseClient | null = result.ok
  ? createClient<Database>(result.env.VITE_SUPABASE_URL, result.env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const envIssues = result.ok ? [] : result.issues;

/** Use inside the app (always rendered after the env check passed). */
export function getSupabase(): TypedSupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured. See README → Configuration.');
  return supabase;
}
