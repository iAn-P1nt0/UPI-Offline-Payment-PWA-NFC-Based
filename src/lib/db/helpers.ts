/**
 * Database Helper Functions
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md
 *
 * Common database operations and utilities
 */

import type { SupabaseClient } from "./supabase";
import type { Database } from "@/types/database";

// Type aliases for convenience
export type Tables = Database["public"]["Tables"];
export type Wallet = Tables["wallets"]["Row"];
export type Transaction = Tables["transactions"]["Row"];
export type User = Tables["users"]["Row"];
export type Merchant = Tables["merchants"]["Row"];
export type Device = Tables["devices"]["Row"];

/**
 * Currency conversion helpers
 * NPCI compliance: Always use paise (smallest unit) in database to avoid floating point errors
 */
export const currency = {
  /**
   * Convert rupees to paise
   * @param rupees Amount in rupees (e.g., 100.50)
   * @returns Amount in paise (e.g., 10050)
   */
  toPaise: (rupees: number): number => {
    return Math.round(rupees * 100);
  },

  /**
   * Convert paise to rupees
   * @param paise Amount in paise (e.g., 10050)
   * @returns Amount in rupees (e.g., 100.50)
   */
  toRupees: (paise: number): number => {
    return paise / 100;
  },

  /**
   * Format paise as rupee string
   * @param paise Amount in paise
   * @returns Formatted string (e.g., "₹100.50")
   */
  format: (paise: number): string => {
    const rupees = paise / 100;
    return `₹${rupees.toFixed(2)}`;
  },
};

/**
 * NPCI UPI Lite Limit Constants
 */
export const NPCI_LIMITS = {
  MAX_TRANSACTION_AMOUNT: 100000, // ₹1,000 in paise
  MAX_WALLET_BALANCE: 500000, // ₹5,000 in paise
  MAX_DAILY_TRANSACTIONS: 20,
  MAX_OFFLINE_TRANSACTIONS: 5,
  SYNC_DEADLINE_DAYS: 4,
} as const;

/**
 * Validate UPI ID format
 * Format: username@provider (e.g., user@paytm, john.doe@okaxis)
 */
export function validateUpiId(upiId: string): boolean {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  return upiRegex.test(upiId);
}

/**
 * Validate phone number format
 * Indian phone numbers: 10 digits
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate transaction amount against NPCI limits
 */
export function validateTransactionAmount(amountPaise: number): {
  valid: boolean;
  error?: string;
} {
  if (amountPaise <= 0) {
    return { valid: false, error: "Amount must be greater than zero" };
  }

  if (amountPaise > NPCI_LIMITS.MAX_TRANSACTION_AMOUNT) {
    return {
      valid: false,
      error: `Amount exceeds NPCI limit of ${currency.format(
        NPCI_LIMITS.MAX_TRANSACTION_AMOUNT
      )}`,
    };
  }

  return { valid: true };
}

/**
 * Get user's wallet
 */
export async function getUserWallet(
  supabase: SupabaseClient,
  userId: string
): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error) {
    console.error("Error fetching wallet:", error);
    return null;
  }

  return data;
}

/**
 * Get wallet by UPI ID
 */
export async function getWalletByUpiId(
  supabase: SupabaseClient,
  upiId: string
): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("upi_id", upiId)
    .single();

  if (error) {
    console.error("Error fetching wallet by UPI ID:", error);
    return null;
  }

  return data;
}

/**
 * Get user's transactions (paginated)
 */
export async function getUserTransactions(
  supabase: SupabaseClient,
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: Database["public"]["Enums"]["transaction_status"];
  } = {}
) {
  const { limit = 50, offset = 0, status } = options;

  // Get user's wallets first
  const { data: wallets, error: walletError } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", userId)
    .returns<Array<{ id: string }>>();

  if (walletError || !wallets || wallets.length === 0) {
    return { data: [], count: 0 };
  }

  const walletIds = wallets.map((w) => w.id);

  let query = supabase
    .from("transactions")
    .select("*, sender_wallet:wallets!sender_wallet_id(*), receiver_wallet:wallets!receiver_wallet_id(*)", { count: "exact" })
    .or(`sender_wallet_id.in.(${walletIds.join(",")}),receiver_wallet_id.in.(${walletIds.join(",")})`)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching transactions:", error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Get today's transaction stats for a wallet
 */
export async function getTodayStats(
  supabase: SupabaseClient,
  walletId: string
) {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_limits")
    .select("*")
    .eq("wallet_id", walletId)
    .eq("date", today)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = not found, which is okay
    console.error("Error fetching daily stats:", error);
    return null;
  }

  return (
    data || {
      transaction_count: 0,
      total_amount_paise: 0,
      offline_transaction_count: 0,
    }
  );
}

/**
 * Check if user can make a transaction
 */
export async function canMakeTransaction(
  supabase: SupabaseClient,
  walletId: string,
  amountPaise: number,
  isOffline: boolean = false
): Promise<{ allowed: boolean; reason?: string }> {
  // Validate amount
  const amountValidation = validateTransactionAmount(amountPaise);
  if (!amountValidation.valid) {
    return { allowed: false, reason: amountValidation.error };
  }

  // Get wallet
  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", walletId)
    .single();

  if (error || !wallet) {
    return { allowed: false, reason: "Wallet not found" };
  }

  // Check wallet status
  if ((wallet as Wallet).status !== "active") {
    return { allowed: false, reason: "Wallet is not active" };
  }

  // Check balance
  if ((wallet as Wallet).balance_paise < amountPaise) {
    return { allowed: false, reason: "Insufficient balance" };
  }

  // Get today's stats
  const stats = await getTodayStats(supabase, walletId);
  if (!stats) {
    return { allowed: false, reason: "Unable to verify daily limits" };
  }

  const walletData = wallet as Wallet;

  // Check daily transaction limit
  if (stats.transaction_count >= walletData.max_daily_transactions) {
    return { allowed: false, reason: "Daily transaction limit exceeded" };
  }

  // Check offline transaction limit
  if (isOffline && stats.offline_transaction_count >= walletData.max_offline_transactions) {
    return {
      allowed: false,
      reason: "Offline transaction limit exceeded. Please sync your wallet.",
    };
  }

  // Check sync deadline (NPCI requirement)
  if (walletData.sync_deadline && new Date(walletData.sync_deadline) < new Date()) {
    return {
      allowed: false,
      reason: "Sync deadline exceeded. Please sync your wallet.",
    };
  }

  return { allowed: true };
}

/**
 * Get active merchants (for offline caching)
 */
export async function getActiveMerchants(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    category?: string;
    nearLocation?: { lat: number; lng: number; radius?: number };
  } = {}
) {
  const { limit = 100, category } = options;

  let query = supabase
    .from("merchants")
    .select("*")
    .eq("is_active", true)
    .limit(limit);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching merchants:", error);
    return [];
  }

  return data || [];
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate unique transaction reference ID
 */
export function generateTransactionReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `TXN${timestamp}${random}`;
}

/**
 * Check if transaction needs sync
 */
export function transactionNeedsSync(transaction: Transaction): boolean {
  return transaction.is_offline && transaction.status === "pending" && !transaction.synced_at;
}

/**
 * Format date for display
 */
export function formatTransactionDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
