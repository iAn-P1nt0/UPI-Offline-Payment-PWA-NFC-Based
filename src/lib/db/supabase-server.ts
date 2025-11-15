/**
 * Supabase Server Utilities
 * Server-only helpers for Supabase auth/session handling.
 */

import { createServerClient, type CookieOptions, createBrowserClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { getSupabaseClientConfig, getSupabaseServiceRoleKey } from "@/lib/env/supabase";

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseClientConfig();

export async function createServerSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase environment variables. Please check your .env.local file."
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Ignore during static rendering
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Ignore during static rendering
        }
      },
    },
  });
}

export function createAdminClient() {
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createBrowserClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return user !== null;
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
export type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
