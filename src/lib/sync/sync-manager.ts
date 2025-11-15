/**
 * Sync Manager
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Transaction Synchronization
 *
 * Main sync orchestration logic
 */

import { createClient } from "@/lib/db/supabase-client";
import { syncAllPendingTransactions } from "./transaction-sync";
import { syncWalletState } from "./wallet-sync";
import { syncMerchants } from "./merchant-sync";
import { isOnline } from "@/lib/db/offline-helpers";

export interface SyncResult {
  success: boolean;
  transactions: {
    synced: number;
    failed: number;
    errors: Array<{ transactionId: string; error: string }>;
  };
  wallet: {
    success: boolean;
    error?: string;
  };
  merchants: {
    success: boolean;
    count: number;
    error?: string;
  };
}

/**
 * Perform full sync (transactions, wallet, merchants)
 */
export async function performFullSync(
  userId: string,
  walletId?: string
): Promise<SyncResult> {
  // Check if online
  if (!isOnline()) {
    return {
      success: false,
      transactions: { synced: 0, failed: 0, errors: [] },
      wallet: { success: false, error: "Device is offline" },
      merchants: { success: false, count: 0, error: "Device is offline" },
    };
  }

  const supabase = createClient();

  // Sync transactions
  const transactionResult = await syncAllPendingTransactions(supabase, walletId);

  // Sync wallet state
  const walletResult = await syncWalletState(supabase, userId);

  // Sync merchants
  const merchantResult = await syncMerchants(supabase, {
    forceRefresh: false,
    limit: 100,
  });

  return {
    success:
      transactionResult.success &&
      walletResult.success &&
      merchantResult.success,
    transactions: {
      synced: transactionResult.synced,
      failed: transactionResult.failed,
      errors: transactionResult.errors,
    },
    wallet: {
      success: walletResult.success,
      error: walletResult.error,
    },
    merchants: {
      success: merchantResult.success,
      count: merchantResult.count,
      error: merchantResult.error,
    },
  };
}

/**
 * Sync only transactions
 */
export async function syncTransactionsOnly(
  walletId?: string
): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ transactionId: string; error: string }>;
}> {
  if (!isOnline()) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: [{ transactionId: "unknown", error: "Device is offline" }],
    };
  }

  const supabase = createClient();
  return await syncAllPendingTransactions(supabase, walletId);
}

/**
 * Sync only wallet state
 */
export async function syncWalletOnly(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isOnline()) {
    return {
      success: false,
      error: "Device is offline",
    };
  }

  const supabase = createClient();
  return await syncWalletState(supabase, userId);
}

/**
 * Sync only merchants
 */
export async function syncMerchantsOnly(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  if (!isOnline()) {
    return {
      success: false,
      count: 0,
      error: "Device is offline",
    };
  }

  const supabase = createClient();
  return await syncMerchants(supabase, {
    forceRefresh: false,
    limit: 100,
  });
}

