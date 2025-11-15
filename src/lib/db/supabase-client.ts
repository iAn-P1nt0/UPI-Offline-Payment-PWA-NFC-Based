/**
 * Supabase Browser Client
 * Provides safe client-side access using anon key only.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseClientConfig } from "@/lib/env/supabase";

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseClientConfig();

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export type SupabaseClient = ReturnType<typeof createClient>;
