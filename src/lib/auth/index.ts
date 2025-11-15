/**
 * Authentication Module Exports
 * Phase 1: MVP Foundations
 *
 * Central export point for all authentication functionality
 */

// Auth helpers
export {
  validatePhoneNumber,
  formatPhoneForDisplay,
  sendOTP,
  verifyOTP,
  signOut,
  getCurrentSession,
  getCurrentAuthUser,
  isUserAuthenticated,
  refreshSession,
  setupAuthListener,
  isSessionExpired,
  getSessionExpiryTime,
  generateDeviceFingerprint,
  registerDevice,
  isDeviceTrusted,
  canRequestOTP,
  recordOTPRequest,
  clearOTPRateLimit,
} from "./auth-helpers";

// Auth context
export {
  AuthProvider,
  useAuthContext,
  withAuth,
  AuthenticatedOnly,
  UnauthenticatedOnly,
} from "./auth-context";

// Auth hooks
export { useAuth, useRequireAuth, useSessionMonitor } from "@/hooks/useAuth";

// Types
export type { AuthState, UseAuthReturn } from "@/hooks/useAuth";
