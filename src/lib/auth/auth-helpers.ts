/**
 * Authentication Helper Functions
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Authentication Flows
 *
 * Utilities for phone authentication, OTP validation, and session management
 */

import { createClient } from "@/lib/db/supabase-client";
import { isSupabaseClientFallback } from "@/lib/env/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Phone number validation patterns
 */
const PHONE_PATTERNS = {
  // Indian mobile numbers: +91 followed by 10 digits
  INDIAN_MOBILE: /^(\+91)?[6-9]\d{9}$/,
  // International E.164 format
  INTERNATIONAL: /^\+[1-9]\d{1,14}$/,
};

/**
 * Validate phone number
 */
export function validatePhoneNumber(
  phone: string,
  country: "IN" | "INTL" = "IN"
): { valid: boolean; formatted?: string; error?: string } {
  // Remove whitespace and hyphens
  const cleaned = phone.replace(/[\s\-]/g, "");

  if (country === "IN") {
    if (!PHONE_PATTERNS.INDIAN_MOBILE.test(cleaned)) {
      return {
        valid: false,
        error: "Please enter a valid Indian mobile number (10 digits starting with 6-9)",
      };
    }

    // Format with +91
    const formatted = cleaned.startsWith("+91")
      ? cleaned
      : `+91${cleaned.replace(/^91/, "")}`;

    return { valid: true, formatted };
  }

  // International validation
  if (!PHONE_PATTERNS.INTERNATIONAL.test(cleaned)) {
    return {
      valid: false,
      error: "Please enter a valid phone number in international format (+CountryCode Number)",
    };
  }

  return { valid: true, formatted: cleaned };
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  const cleaned = phone.replace(/[\s\-]/g, "");

  // Indian format: +91 98765 43210
  if (cleaned.startsWith("+91")) {
    const number = cleaned.slice(3);
    return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
  }

  // Default: show as-is
  return cleaned;
}

/**
 * Send OTP via Supabase Auth
 */
export async function sendOTP(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const validation = validatePhoneNumber(phone);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    if (isSupabaseClientFallback()) {
      return {
        success: false,
        error:
          "Supabase credentials are not configured. OTP delivery is disabled in local development until NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
      };
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: validation.formatted!,
      options: {
        channel: "sms",
      },
    });

    if (error) {
      // Handle connection errors gracefully
      if (error.message.includes("Failed to fetch") || error.message.includes("ERR_CONNECTION_REFUSED")) {
        return {
          success: false,
          error: "Unable to connect to authentication service. Please check your internet connection and ensure Supabase is configured.",
        };
      }
      // Don't log expected errors in console
      if (error.name !== "AuthRetryableFetchError") {
        console.error("Failed to send OTP:", error);
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    // Handle connection errors gracefully
    if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED")) {
      return {
        success: false,
        error: "Unable to connect to authentication service. Please check your internet connection and ensure Supabase is configured.",
      };
    }
    // Don't log connection errors as they're expected when Supabase isn't running
    if (!error?.message?.includes("Failed to fetch") && !error?.message?.includes("ERR_CONNECTION_REFUSED")) {
      console.error("Error sending OTP:", error);
    }
    return { success: false, error: "Failed to send OTP. Please try again." };
  }
}

/**
 * Verify OTP and sign in
 */
export async function verifyOTP(
  phone: string,
  otp: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const validation = validatePhoneNumber(phone);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    if (isSupabaseClientFallback()) {
      return {
        success: false,
        error:
          "Supabase credentials are not configured. OTP verification is disabled in local development until NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
      };
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return { success: false, error: "OTP must be 6 digits" };
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: validation.formatted!,
      token: otp,
      type: "sms",
    });

    if (error) {
      console.error("Failed to verify OTP:", error);
      return { success: false, error: "Invalid or expired OTP" };
    }

    if (!data.user) {
      return { success: false, error: "Authentication failed" };
    }

    return { success: true, userId: data.user.id };
  } catch (error: any) {
    if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED")) {
      return {
        success: false,
        error:
          "Unable to reach Supabase for OTP verification. Ensure the service is running and credentials are configured.",
      };
    }
    console.error("Error verifying OTP:", error);
    return {
      success: false,
      error: "Failed to verify OTP. Please try again.",
    };
  }
}

/**
 * Sign out user
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Failed to sign out:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    return { success: false, error: "Failed to sign out" };
  }
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  try {
    const supabase = createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      // Don't log AuthSessionMissingError as it's expected when not logged in
      if (error.name !== "AuthSessionMissingError") {
        console.error("Failed to get session:", error);
      }
      return null;
    }

    return session;
  } catch (error: any) {
    // Don't log AuthSessionMissingError as it's expected when not logged in
    if (error?.name !== "AuthSessionMissingError") {
      console.error("Error getting session:", error);
    }
    return null;
  }
}

/**
 * Get current user
 */
export async function getCurrentAuthUser() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // Don't log AuthSessionMissingError as it's expected when not logged in
      if (error.name !== "AuthSessionMissingError") {
        console.error("Failed to get user:", error);
      }
      return null;
    }

    return user;
  } catch (error: any) {
    // Don't log AuthSessionMissingError as it's expected when not logged in
    if (error?.name !== "AuthSessionMissingError") {
      console.error("Error getting user:", error);
    }
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isUserAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return session !== null;
}

/**
 * Refresh session
 */
export async function refreshSession(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.refreshSession();

    if (error) {
      console.error("Failed to refresh session:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error refreshing session:", error);
    return { success: false, error: "Failed to refresh session" };
  }
}

/**
 * Setup auth state change listener
 */
export function setupAuthListener(
  callback: (event: string, session: any) => void
) {
  const supabase = createClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth state changed:", event);
    callback(event, session);
  });

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Validate session token expiry
 */
export function isSessionExpired(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const bufferTime = 60; // 1 minute buffer
  return expiresAt - now < bufferTime;
}

/**
 * Get session expiry time in human-readable format
 */
export function getSessionExpiryTime(expiresAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = expiresAt - now;

  if (secondsRemaining < 0) {
    return "Expired";
  }

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

/**
 * Generate device fingerprint for security
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // User agent
  components.push(navigator.userAgent);

  // Screen resolution
  components.push(`${screen.width}x${screen.height}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Hardware concurrency
  components.push(String(navigator.hardwareConcurrency || 0));

  // Device memory (if available)
  if ("deviceMemory" in navigator) {
    components.push(String((navigator as any).deviceMemory));
  }

  // Combine and hash
  const fingerprint = components.join("|");

  // Simple hash (for production, use a proper hashing library)
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `device_${Math.abs(hash).toString(16)}`;
}

/**
 * Store device info in database
 */
export async function registerDevice(
  userId: string,
  deviceFingerprint: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const deviceInfo = {
      user_id: userId,
      device_fingerprint: deviceFingerprint,
      device_name: `${navigator.platform} - ${navigator.userAgent.split(" ").slice(0, 2).join(" ")}`,
      device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
        ? "mobile"
        : "desktop",
      os: navigator.platform,
      browser: navigator.userAgent.split(" ")[0],
      last_active_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from("devices")
      .upsert(deviceInfo as any, {
      onConflict: "device_fingerprint,user_id",
      });

    if (error) {
      console.error("Failed to register device:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error registering device:", error);
    return { success: false, error: "Failed to register device" };
  }
}

/**
 * Check if device is trusted
 */
export async function isDeviceTrusted(
  userId: string,
  deviceFingerprint: string
): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data, error } = await (supabase as any)
      .from("devices")
      .select("is_trusted")
      .eq("user_id", userId)
      .eq("device_fingerprint", deviceFingerprint)
      .single();

    if (error || !data) {
      return false;
    }

    return (data as any).is_trusted;
  } catch (error) {
    console.error("Error checking device trust:", error);
    return false;
  }
}

/**
 * OTP rate limiting check (client-side)
 */
const OTP_RATE_LIMIT_KEY = "otp_last_sent";
const OTP_RATE_LIMIT_SECONDS = 60; // 1 minute

export function canRequestOTP(): { allowed: boolean; waitSeconds?: number } {
  if (typeof window === "undefined") {
    return { allowed: true };
  }

  const lastSent = localStorage.getItem(OTP_RATE_LIMIT_KEY);
  if (!lastSent) {
    return { allowed: true };
  }

  const lastSentTime = parseInt(lastSent, 10);
  const now = Date.now();
  const elapsed = Math.floor((now - lastSentTime) / 1000);

  if (elapsed < OTP_RATE_LIMIT_SECONDS) {
    return {
      allowed: false,
      waitSeconds: OTP_RATE_LIMIT_SECONDS - elapsed,
    };
  }

  return { allowed: true };
}

export function recordOTPRequest(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(OTP_RATE_LIMIT_KEY, String(Date.now()));
}

export function clearOTPRateLimit(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(OTP_RATE_LIMIT_KEY);
}
