/**
 * Wallet Module Exports
 * Phase 1: MVP Foundations
 *
 * Central export point for all wallet functionality
 */

// Wallet helpers
export {
  validateUpiId,
  generateUpiIdFromPhone,
  generateCustomUpiId,
  checkUpiIdAvailability,
  createWallet,
  getWalletByUserId,
  getWalletByUpiId,
  checkWalletBalance,
  validateWalletStatus,
  canMakeWalletTransaction,
  formatWalletBalance,
  getWalletLimits,
  needsKYC,
} from "./wallet-helpers";

// Wallet hooks
export { useWallet, useRequireWallet } from "@/hooks/useWallet";

// Types
export type { WalletState, UseWalletReturn } from "@/hooks/useWallet";
