/**
 * Wallet State Management in IndexedDB
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Wallet State Caching
 *
 * Manages wallet state in IndexedDB for offline access
 * Tracks balance, limits, and sync status locally
 */

import { db, type LocalWalletState } from "./dexie-client";
import type { SupabaseClient } from "./supabase";
import type { Wallet } from "./helpers";

/**
 * Sync wallet state from Supabase to IndexedDB
 */
export async function syncWalletStateFromServer(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; wallet?: LocalWalletState; error?: string }> {
  try {
    // Fetch wallet from Supabase
    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error) {
      console.error("Failed to fetch wallet from server:", error);
      return { success: false, error: error.message };
    }

    if (!wallet) {
      return { success: false, error: "No active wallet found" };
    }

    // Convert to local wallet state
    const now = new Date().toISOString();
    const localWallet: LocalWalletState = {
      ...(wallet as any),
      cached_at: now,
      offline_balance_paise: (wallet as any).balance_paise, // Initialize with server balance
    };

    // Store in IndexedDB
    await db.walletState.put(localWallet);

    return { success: true, wallet: localWallet };
  } catch (error) {
    console.error("Failed to sync wallet state:", error);
    return { success: false, error: "Failed to sync wallet state" };
  }
}

/**
 * Get cached wallet state
 */
export async function getCachedWalletState(walletId: string): Promise<LocalWalletState | undefined> {
  try {
    return await db.walletState.get(walletId);
  } catch (error) {
    console.error("Failed to get cached wallet state:", error);
    return undefined;
  }
}

/**
 * Get cached wallet state by user ID
 */
export async function getCachedWalletStateByUserId(
  userId: string
): Promise<LocalWalletState | undefined> {
  try {
    return await db.walletState.where("user_id").equals(userId).first();
  } catch (error) {
    console.error("Failed to get cached wallet state by user ID:", error);
    return undefined;
  }
}

/**
 * Get cached wallet state by UPI ID
 */
export async function getCachedWalletStateByUpiId(
  upiId: string
): Promise<LocalWalletState | undefined> {
  try {
    return await db.walletState.where("upi_id").equals(upiId).first();
  } catch (error) {
    console.error("Failed to get cached wallet state by UPI ID:", error);
    return undefined;
  }
}

/**
 * Update offline balance after transaction
 */
export async function updateOfflineBalance(
  walletId: string,
  amountPaise: number,
  operation: "deduct" | "add"
): Promise<boolean> {
  try {
    const wallet = await db.walletState.get(walletId);
    if (!wallet) {
      return false;
    }

    const newBalance =
      operation === "deduct"
        ? wallet.offline_balance_paise - amountPaise
        : wallet.offline_balance_paise + amountPaise;

    // Don't allow negative balance
    if (newBalance < 0) {
      return false;
    }

    await db.walletState.update(walletId, {
      offline_balance_paise: newBalance,
    });

    return true;
  } catch (error) {
    console.error("Failed to update offline balance:", error);
    return false;
  }
}

/**
 * Increment pending sync count
 */
export async function incrementPendingSyncCount(walletId: string): Promise<boolean> {
  try {
    const wallet = await db.walletState.get(walletId);
    if (!wallet) {
      return false;
    }

    await db.walletState.update(walletId, {
      pending_sync_count: wallet.pending_sync_count + 1,
    });

    return true;
  } catch (error) {
    console.error("Failed to increment pending sync count:", error);
    return false;
  }
}

/**
 * Decrement pending sync count
 */
export async function decrementPendingSyncCount(walletId: string): Promise<boolean> {
  try {
    const wallet = await db.walletState.get(walletId);
    if (!wallet) {
      return false;
    }

    await db.walletState.update(walletId, {
      pending_sync_count: Math.max(0, wallet.pending_sync_count - 1),
    });

    return true;
  } catch (error) {
    console.error("Failed to decrement pending sync count:", error);
    return false;
  }
}

/**
 * Set sync deadline (NPCI: 4 days from first offline transaction)
 */
export async function setSyncDeadline(walletId: string, deadlineISO: string): Promise<boolean> {
  try {
    await db.walletState.update(walletId, {
      sync_deadline: deadlineISO,
    });

    return true;
  } catch (error) {
    console.error("Failed to set sync deadline:", error);
    return false;
  }
}

/**
 * Clear sync deadline (after successful sync)
 */
export async function clearSyncDeadline(walletId: string): Promise<boolean> {
  try {
    await db.walletState.update(walletId, {
      sync_deadline: null,
      pending_sync_count: 0,
    });

    return true;
  } catch (error) {
    console.error("Failed to clear sync deadline:", error);
    return false;
  }
}

/**
 * Update last sync timestamp
 */
export async function updateLastSyncTimestamp(walletId: string): Promise<boolean> {
  try {
    await db.walletState.update(walletId, {
      last_sync_at: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Failed to update last sync timestamp:", error);
    return false;
  }
}

/**
 * Recalculate offline balance based on pending transactions
 */
export async function recalculateOfflineBalance(walletId: string): Promise<boolean> {
  try {
    const wallet = await db.walletState.get(walletId);
    if (!wallet) {
      return false;
    }

    // Get all pending offline transactions
    const pendingTransactions = await db.transactions
      .where("sender_wallet_id")
      .equals(walletId)
      .and((t) => t.is_offline && !t.synced_at)
      .toArray();

    // Calculate total pending amount
    const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount_paise, 0);

    // Offline balance = server balance - pending transactions
    const offlineBalance = wallet.balance_paise - totalPending;

    await db.walletState.update(walletId, {
      offline_balance_paise: offlineBalance,
    });

    return true;
  } catch (error) {
    console.error("Failed to recalculate offline balance:", error);
    return false;
  }
}

/**
 * Check if wallet needs sync
 */
export async function walletNeedsSync(walletId: string): Promise<boolean> {
  try {
    const wallet = await db.walletState.get(walletId);
    if (!wallet) {
      return false;
    }

    // Needs sync if there are pending transactions
    if (wallet.pending_sync_count > 0) {
      return true;
    }

    // Needs sync if deadline is approaching (within 1 day)
    if (wallet.sync_deadline) {
      const deadline = new Date(wallet.sync_deadline);
      const now = new Date();
      const oneDayInMs = 24 * 60 * 60 * 1000;

      if (deadline.getTime() - now.getTime() < oneDayInMs) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Failed to check if wallet needs sync:", error);
    return false;
  }
}

/**
 * Check if wallet has exceeded sync deadline
 */
export async function hasExceededSyncDeadline(walletId: string): Promise<boolean> {
  try {
    const wallet = await db.walletState.get(walletId);
    if (!wallet || !wallet.sync_deadline) {
      return false;
    }

    const deadline = new Date(wallet.sync_deadline);
    const now = new Date();

    return now > deadline;
  } catch (error) {
    console.error("Failed to check sync deadline:", error);
    return false;
  }
}

/**
 * Get wallet sync status
 */
export async function getWalletSyncStatus(walletId: string): Promise<{
  needsSync: boolean;
  exceededDeadline: boolean;
  pendingCount: number;
  hoursUntilDeadline: number | null;
  offlineBalanceRupees: number;
  serverBalanceRupees: number;
}> {
  try {
    const wallet = await db.walletState.get(walletId);

    if (!wallet) {
      return {
        needsSync: false,
        exceededDeadline: false,
        pendingCount: 0,
        hoursUntilDeadline: null,
        offlineBalanceRupees: 0,
        serverBalanceRupees: 0,
      };
    }

    const needsSync = await walletNeedsSync(walletId);
    const exceededDeadline = await hasExceededSyncDeadline(walletId);

    let hoursUntilDeadline: number | null = null;
    if (wallet.sync_deadline) {
      const deadline = new Date(wallet.sync_deadline);
      const now = new Date();
      hoursUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (60 * 60 * 1000));
    }

    return {
      needsSync,
      exceededDeadline,
      pendingCount: wallet.pending_sync_count,
      hoursUntilDeadline,
      offlineBalanceRupees: wallet.offline_balance_paise / 100,
      serverBalanceRupees: wallet.balance_paise / 100,
    };
  } catch (error) {
    console.error("Failed to get wallet sync status:", error);
    return {
      needsSync: false,
      exceededDeadline: false,
      pendingCount: 0,
      hoursUntilDeadline: null,
      offlineBalanceRupees: 0,
      serverBalanceRupees: 0,
    };
  }
}

/**
 * Update wallet status
 */
export async function updateWalletStatus(
  walletId: string,
  status: "active" | "frozen" | "suspended" | "closed"
): Promise<boolean> {
  try {
    await db.walletState.update(walletId, { status });
    return true;
  } catch (error) {
    console.error("Failed to update wallet status:", error);
    return false;
  }
}

/**
 * Clear all wallet state (for logout)
 */
export async function clearAllWalletState(): Promise<boolean> {
  try {
    await db.walletState.clear();
    return true;
  } catch (error) {
    console.error("Failed to clear wallet state:", error);
    return false;
  }
}

/**
 * Get all cached wallet states (for multi-wallet support in future)
 */
export async function getAllCachedWallets(): Promise<LocalWalletState[]> {
  try {
    return await db.walletState.toArray();
  } catch (error) {
    console.error("Failed to get all cached wallets:", error);
    return [];
  }
}
