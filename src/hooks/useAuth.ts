/**
 * useAuth Hook
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Authentication Flows
 *
 * React hook for authentication state and operations
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";
import {
  getCurrentSession,
  getCurrentAuthUser,
  signOut as authSignOut,
  sendOTP as authSendOTP,
  verifyOTP as authVerifyOTP,
  setupAuthListener,
  generateDeviceFingerprint,
  registerDevice,
  isSessionExpired,
  canRequestOTP,
  recordOTPRequest,
} from "@/lib/auth/auth-helpers";
import {
  syncWalletStateFromServer,
  clearAllWalletState,
} from "@/lib/db/wallet-state";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface UseAuthReturn extends AuthState {
  // Authentication actions
  sendOTP: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (
    phone: string,
    otp: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  refreshAuth: () => Promise<void>;

  // Helper functions
  canRequestOTP: () => { allowed: boolean; waitSeconds?: number };
}

/**
 * Main authentication hook
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAuthenticated: false,
  });

  /**
   * Initialize auth state
   */
  const initializeAuth = useCallback(async () => {
    try {
      const session = await getCurrentSession();
      const user = await getCurrentAuthUser();

      setAuthState({
        user,
        session,
        loading: false,
        isAuthenticated: !!user && !!session,
      });

      // If authenticated, sync wallet state
      if (user) {
        await syncWalletStateFromServer(
          (await import("@/lib/db/supabase-client")).createClient(),
          user.id
        );
      }
    } catch (error: any) {
      // Don't log AuthSessionMissingError as it's expected when not logged in
      if (error?.name !== "AuthSessionMissingError") {
        console.error("Failed to initialize auth:", error);
      }
      setAuthState({
        user: null,
        session: null,
        loading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  /**
   * Setup auth state listener
   */
  useEffect(() => {
    // Initial load
    initializeAuth();

    // Setup listener
    const unsubscribe = setupAuthListener(async (event, session) => {
      console.log("Auth event:", event);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const user = await getCurrentAuthUser();
        setAuthState({
          user,
          session,
          loading: false,
          isAuthenticated: !!user && !!session,
        });

        // Sync wallet state
        if (user) {
          await syncWalletStateFromServer(
            (await import("@/lib/db/supabase-client")).createClient(),
            user.id
          );
        }
      } else if (event === "SIGNED_OUT") {
        setAuthState({
          user: null,
          session: null,
          loading: false,
          isAuthenticated: false,
        });

        // Clear wallet state
        await clearAllWalletState();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [initializeAuth]);

  /**
   * Send OTP
   */
  const sendOTP = useCallback(
    async (phone: string): Promise<{ success: boolean; error?: string }> => {
      // Check rate limit
      const rateLimit = canRequestOTP();
      if (!rateLimit.allowed) {
        return {
          success: false,
          error: `Please wait ${rateLimit.waitSeconds} seconds before requesting another OTP`,
        };
      }

      const result = await authSendOTP(phone);

      if (result.success) {
        recordOTPRequest();
      }

      return result;
    },
    []
  );

  /**
   * Verify OTP and sign in
   */
  const verifyOTP = useCallback(
    async (
      phone: string,
      otp: string
    ): Promise<{ success: boolean; error?: string }> => {
      const result = await authVerifyOTP(phone, otp);

      if (result.success && result.userId) {
        // Register device
        const fingerprint = await generateDeviceFingerprint();
        await registerDevice(result.userId, fingerprint);

        // Sync wallet state
        const { createClient } = await import("@/lib/db/supabase-client");
        await syncWalletStateFromServer(createClient(), result.userId);
      }

      return result;
    },
    []
  );

  /**
   * Sign out
   */
  const signOut = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const result = await authSignOut();

    if (result.success) {
      // Clear wallet state
      await clearAllWalletState();

      // Redirect to login
      router.push("/auth/login");
    }

    return result;
  }, [router]);

  /**
   * Refresh authentication state
   */
  const refreshAuth = useCallback(async () => {
    await initializeAuth();
  }, [initializeAuth]);

  return {
    ...authState,
    sendOTP,
    verifyOTP,
    signOut,
    refreshAuth,
    canRequestOTP,
  };
}

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, loading, router]);

  return { isAuthenticated, loading };
}

/**
 * Hook for session expiry monitoring
 */
export function useSessionMonitor() {
  const { session, refreshAuth } = useAuth();
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    if (!session) {
      setIsExpiringSoon(false);
      return;
    }

    // Check expiry every minute
    const interval = setInterval(() => {
      const expiresAt = session.expires_at || 0;
      const expired = isSessionExpired(expiresAt);

      if (expired) {
        // Auto-refresh session
        refreshAuth();
      } else {
        // Check if expiring within 5 minutes
        const now = Math.floor(Date.now() / 1000);
        const fiveMinutes = 5 * 60;
        setIsExpiringSoon(expiresAt - now < fiveMinutes);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [session, refreshAuth]);

  return { isExpiringSoon };
}
