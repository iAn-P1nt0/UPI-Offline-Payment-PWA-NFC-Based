/**
 * Supabase Client Configuration
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Database Setup
 *
 * This file sets up Supabase clients for both client-side and server-side usage
 */

import { createBrowserClient } from "@supabase/ssr";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file."
  );
}

/**
 * Create a Supabase client for client-side usage (browser)
 * Used in Client Components and API routes
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!);
}

/**
 * Create a Supabase client for server-side usage (Server Components, Server Actions)
 * Handles cookie management for authentication
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // Handle error (happens during static rendering)
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch (error) {
          // Handle error
        }
      },
    },
  });
}

/**
 * Create a Supabase admin client with service role key
 * WARNING: Only use in secure server-side contexts
 * Bypasses Row-Level Security (RLS)
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createBrowserClient<Database>(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Helper function to get the current user from server context
 */
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

/**
 * Helper function to check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Type exports for better DX
 */
export type SupabaseClient = ReturnType<typeof createClient>;
export type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
export type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
