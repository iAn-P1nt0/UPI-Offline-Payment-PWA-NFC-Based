/**
 * Wallet State Synchronization
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Transaction Synchronization
 *
 * Handles syncing wallet state from server
 */

import {
  syncWalletStateFromServer,
  clearSyncDeadline,
  updateLastSyncTimestamp,
} from "@/lib/db/wallet-state";
import type { SupabaseClient } from "@/lib/db/supabase";

/**
 * Sync wallet state from server
 */
export async function syncWalletState(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const result = await syncWalletStateFromServer(supabase, userId);

    if (!result.success || !result.wallet) {
      return {
        success: false,
        error: result.error || "Failed to sync wallet state",
      };
    }

    // Update last sync timestamp
    await updateLastSyncTimestamp(result.wallet.id);

    // Clear sync deadline if no pending transactions
    if (result.wallet.pending_sync_count === 0) {
      await clearSyncDeadline(result.wallet.id);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error syncing wallet state:", error);
    return {
      success: false,
      error: error.message || "Failed to sync wallet state",
    };
  }
}

