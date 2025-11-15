/**
 * Wallet Helper Functions
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Wallet Management
 *
 * Utilities for wallet creation, UPI ID generation, and validation
 */

import { createClient } from "@/lib/db/supabase-client";
import { NPCI_LIMITS, currency } from "@/lib/db/helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * UPI ID patterns
 */
const UPI_PATTERNS = {
  // Standard UPI: user@bank
  STANDARD: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/,
  // Phone-based: phone@upi
  PHONE: /^\d{10}@[a-zA-Z0-9]+$/,
  // VPA format
  VPA: /^[a-zA-Z0-9._-]{3,}@[a-zA-Z0-9]{3,}$/,
};

/**
 * Validate UPI ID format
 */
export function validateUpiId(upiId: string): {
  valid: boolean;
  error?: string;
  type?: "standard" | "phone" | "vpa";
} {
  if (!upiId || typeof upiId !== "string") {
    return { valid: false, error: "UPI ID is required" };
  }

  const cleaned = upiId.trim().toLowerCase();

  if (cleaned.length < 5) {
    return { valid: false, error: "UPI ID must be at least 5 characters" };
  }

  if (cleaned.length > 50) {
    return { valid: false, error: "UPI ID must not exceed 50 characters" };
  }

  if (!cleaned.includes("@")) {
    return { valid: false, error: "UPI ID must contain @" };
  }

  const [username, handle] = cleaned.split("@");

  if (!username || username.length < 3) {
    return {
      valid: false,
      error: "Username must be at least 3 characters before @",
    };
  }

  if (!handle || handle.length < 2) {
    return { valid: false, error: "Handle must be at least 2 characters after @" };
  }

  // Check patterns
  if (UPI_PATTERNS.PHONE.test(cleaned)) {
    return { valid: true, type: "phone" };
  }

  if (UPI_PATTERNS.VPA.test(cleaned)) {
    return { valid: true, type: "vpa" };
  }

  if (UPI_PATTERNS.STANDARD.test(cleaned)) {
    return { valid: true, type: "standard" };
  }

  return {
    valid: false,
    error: "Invalid UPI ID format. Use alphanumeric, dots, hyphens, or underscores",
  };
}

/**
 * Generate UPI ID from phone number
 */
export function generateUpiIdFromPhone(phone: string, handle: string = "upi"): string {
  // Remove +91 prefix and spaces
  const cleaned = phone.replace(/^\+91/, "").replace(/\s/g, "");

  // Last 10 digits
  const phoneNumber = cleaned.slice(-10);

  return `${phoneNumber}@${handle}`;
}

/**
 * Generate custom UPI ID
 */
export function generateCustomUpiId(
  username: string,
  handle: string = "upi"
): { valid: boolean; upiId?: string; error?: string } {
  // Clean username
  const cleaned = username
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");

  if (cleaned.length < 3) {
    return {
      valid: false,
      error: "Username must be at least 3 characters",
    };
  }

  if (cleaned.length > 30) {
    return {
      valid: false,
      error: "Username must not exceed 30 characters",
    };
  }

  const upiId = `${cleaned}@${handle}`;
  const validation = validateUpiId(upiId);

  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  return { valid: true, upiId };
}

/**
 * Check if UPI ID is available
 */
export async function checkUpiIdAvailability(
  upiId: string
): Promise<{ available: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { data, error } = await (supabase as any)
      .from("wallets")
      .select("id")
      .eq("upi_id", upiId.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("Error checking UPI ID availability:", error);
      return { available: false, error: "Failed to check availability" };
    }

    return { available: !data };
  } catch (error) {
    console.error("Error checking UPI ID availability:", error);
    return { available: false, error: "Failed to check availability" };
  }
}

/**
 * Create wallet for user
 */
export async function createWallet(params: {
  userId: string;
  upiId: string;
  walletPin?: string;
}): Promise<{
  success: boolean;
  walletId?: string;
  error?: string;
}> {
  try {
    const { userId, upiId } = params;

    // Validate UPI ID
    const validation = validateUpiId(upiId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check availability
    const availability = await checkUpiIdAvailability(upiId);
    if (!availability.available) {
      return { success: false, error: "UPI ID is already taken" };
    }

    const supabase = createClient();

    // Create wallet
    const { data, error } = await (supabase as any)
      .from("wallets")
      .insert({
        user_id: userId,
        upi_id: upiId.toLowerCase(),
        balance_paise: 0,
        max_balance_paise: NPCI_LIMITS.MAX_WALLET_BALANCE,
        max_transaction_paise: NPCI_LIMITS.MAX_TRANSACTION_AMOUNT,
        max_daily_transactions: NPCI_LIMITS.MAX_DAILY_TRANSACTIONS,
        max_offline_transactions: NPCI_LIMITS.MAX_OFFLINE_TRANSACTIONS,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create wallet:", error);
      return { success: false, error: error.message };
    }

    return { success: true, walletId: data.id };
  } catch (error) {
    console.error("Error creating wallet:", error);
    return { success: false, error: "Failed to create wallet" };
  }
}

/**
 * Get wallet by user ID
 */
export async function getWalletByUserId(userId: string): Promise<{
  success: boolean;
  wallet?: any;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await (supabase as any)
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Failed to get wallet:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "No active wallet found" };
    }

    return { success: true, wallet: data };
  } catch (error) {
    console.error("Error getting wallet:", error);
    return { success: false, error: "Failed to get wallet" };
  }
}

/**
 * Get wallet by UPI ID
 */
export async function getWalletByUpiId(upiId: string): Promise<{
  success: boolean;
  wallet?: any;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await (supabase as any)
      .from("wallets")
      .select("*")
      .eq("upi_id", upiId.toLowerCase())
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Failed to get wallet by UPI ID:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "Wallet not found" };
    }

    return { success: true, wallet: data };
  } catch (error) {
    console.error("Error getting wallet by UPI ID:", error);
    return { success: false, error: "Failed to get wallet" };
  }
}

/**
 * Check wallet balance
 */
export async function checkWalletBalance(walletId: string): Promise<{
  success: boolean;
  balancePaise?: number;
  balanceRupees?: number;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await (supabase as any)
      .from("wallets")
      .select("balance_paise")
      .eq("id", walletId)
      .single();

    if (error) {
      console.error("Failed to check balance:", error);
      return { success: false, error: error.message };
    }

    const balancePaise = data.balance_paise;
    const balanceRupees = currency.toRupees(balancePaise);

    return { success: true, balancePaise, balanceRupees };
  } catch (error) {
    console.error("Error checking balance:", error);
    return { success: false, error: "Failed to check balance" };
  }
}

/**
 * Validate wallet status
 */
export async function validateWalletStatus(walletId: string): Promise<{
  valid: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await (supabase as any)
      .from("wallets")
      .select("status")
      .eq("id", walletId)
      .single();

    if (error) {
      console.error("Failed to validate wallet status:", error);
      return { valid: false, error: error.message };
    }

    const status = data.status;

    if (status !== "active") {
      return {
        valid: false,
        status,
        error: `Wallet is ${status}`,
      };
    }

    return { valid: true, status };
  } catch (error) {
    console.error("Error validating wallet status:", error);
    return { valid: false, error: "Failed to validate wallet status" };
  }
}

/**
 * Check if wallet can make transaction
 */
export async function canMakeWalletTransaction(
  walletId: string,
  amountPaise: number,
  isOffline: boolean = false
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  try {
    const supabase = createClient();

    // Get wallet details
    const { data: wallet, error: walletError } = await (supabase as any)
      .from("wallets")
      .select("*")
      .eq("id", walletId)
      .single();

    if (walletError || !wallet) {
      return { allowed: false, reason: "Wallet not found" };
    }

    // Check wallet status
    if (wallet.status !== "active") {
      return { allowed: false, reason: `Wallet is ${wallet.status}` };
    }

    // Check amount
    if (amountPaise <= 0) {
      return { allowed: false, reason: "Invalid amount" };
    }

    if (amountPaise > wallet.max_transaction_paise) {
      return {
        allowed: false,
        reason: `Amount exceeds limit of ${currency.format(wallet.max_transaction_paise)}`,
      };
    }

    // Check balance
    if (amountPaise > wallet.balance_paise) {
      return { allowed: false, reason: "Insufficient balance" };
    }

    // Check daily transaction limit
    const today = new Date().toISOString().split("T")[0];
    const { data: stats, error: statsError } = await (supabase as any)
      .from("daily_limits")
      .select("transaction_count")
      .eq("wallet_id", walletId)
      .eq("date", today)
      .maybeSingle();

    if (!statsError && stats) {
      if (stats.transaction_count >= wallet.max_daily_transactions) {
        return { allowed: false, reason: "Daily transaction limit exceeded" };
      }
    }

    // Check offline transaction limit
    if (isOffline) {
      const { data: offlineTransactions, error: offlineError } = await (
        supabase as any
      )
        .from("transactions")
        .select("id")
        .eq("sender_wallet_id", walletId)
        .eq("is_offline", true)
        .is("synced_at", null);

      if (!offlineError && offlineTransactions) {
        if (offlineTransactions.length >= wallet.max_offline_transactions) {
          return {
            allowed: false,
            reason: "Offline transaction limit exceeded. Please sync your wallet",
          };
        }
      }
    }

    // Check sync deadline
    if (wallet.sync_deadline) {
      const deadline = new Date(wallet.sync_deadline);
      const now = new Date();

      if (now > deadline) {
        return {
          allowed: false,
          reason: "Sync deadline exceeded. Please sync your wallet",
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("Error checking transaction capability:", error);
    return { allowed: false, reason: "Failed to validate transaction" };
  }
}

/**
 * Format wallet balance for display
 */
export function formatWalletBalance(balancePaise: number): {
  rupees: string;
  paise: string;
  formatted: string;
} {
  const rupees = Math.floor(balancePaise / 100);
  const paise = balancePaise % 100;

  return {
    rupees: rupees.toString(),
    paise: paise.toString().padStart(2, "0"),
    formatted: currency.format(balancePaise),
  };
}

/**
 * Get wallet limits
 */
export function getWalletLimits() {
  return {
    maxTransaction: {
      paise: NPCI_LIMITS.MAX_TRANSACTION_AMOUNT,
      rupees: currency.toRupees(NPCI_LIMITS.MAX_TRANSACTION_AMOUNT),
      formatted: currency.format(NPCI_LIMITS.MAX_TRANSACTION_AMOUNT),
    },
    maxBalance: {
      paise: NPCI_LIMITS.MAX_WALLET_BALANCE,
      rupees: currency.toRupees(NPCI_LIMITS.MAX_WALLET_BALANCE),
      formatted: currency.format(NPCI_LIMITS.MAX_WALLET_BALANCE),
    },
    maxDailyTransactions: NPCI_LIMITS.MAX_DAILY_TRANSACTIONS,
    maxOfflineTransactions: NPCI_LIMITS.MAX_OFFLINE_TRANSACTIONS,
    syncDeadlineDays: NPCI_LIMITS.SYNC_DEADLINE_DAYS,
  };
}

/**
 * Check if wallet needs KYC
 */
export function needsKYC(balancePaise: number, monthlyVolumePaise: number): boolean {
  // For demo purposes - in production, implement actual KYC rules
  const KYC_BALANCE_THRESHOLD = 1000000; // ₹10,000
  const KYC_MONTHLY_THRESHOLD = 5000000; // ₹50,000

  return (
    balancePaise > KYC_BALANCE_THRESHOLD ||
    monthlyVolumePaise > KYC_MONTHLY_THRESHOLD
  );
}
