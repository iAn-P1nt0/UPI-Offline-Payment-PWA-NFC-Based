/**
 * Supabase environment helpers with development fallbacks.
 * Ensures local dev doesn't crash when .env.local is missing.
 */

const DEV_DEFAULTS = {
  url: "http://127.0.0.1:54321",
  anonKey: "supabase-anon-key",
  serviceRoleKey: "supabase-service-role-key",
} as const;

const resolved = new Map<string, string>();
const warned = new Set<string>();
const isProduction = process.env.NODE_ENV === "production";

type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY";

function resolveEnv(key: EnvKey, fallback?: string) {
  if (resolved.has(key)) {
    return resolved.get(key)!;
  }

  const value = process.env[key];

  if (value) {
    resolved.set(key, value);
    return value;
  }

  if (!isProduction && fallback) {
    if (!warned.has(key)) {
      console.warn(
        `[supabase-env] ${key} is not set. Using development fallback value. Set this in .env.local to silence this warning.`
      );
      warned.add(key);
    }
    resolved.set(key, fallback);
    return fallback;
  }

  throw new Error(
    `Missing required environment variable ${key}. Please configure it in your deployment environment.`
  );
}

export function getSupabaseUrl() {
  return resolveEnv("NEXT_PUBLIC_SUPABASE_URL", DEV_DEFAULTS.url);
}

export function getSupabaseAnonKey() {
  return resolveEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", DEV_DEFAULTS.anonKey);
}

export function getSupabaseServiceRoleKey() {
  return resolveEnv("SUPABASE_SERVICE_ROLE_KEY", DEV_DEFAULTS.serviceRoleKey);
}

export function getSupabaseClientConfig() {
  return {
    url: getSupabaseUrl(),
    anonKey: getSupabaseAnonKey(),
  } as const;
}
