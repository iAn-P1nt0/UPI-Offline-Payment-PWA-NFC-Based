/**
 * Transaction Synchronization
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Transaction Synchronization
 *
 * Handles syncing offline transactions to Supabase
 */

import { getPendingTransactions, markTransactionSynced } from "@/lib/db/transaction-queue";
import type { SupabaseClient } from "@/lib/db/supabase";
import type { LocalTransaction } from "@/lib/db/dexie-client";

/**
 * Sync a single transaction to server
 */
export async function syncTransaction(
  supabase: SupabaseClient,
  transaction: LocalTransaction
): Promise<{
  success: boolean;
  serverTransactionId?: string;
  error?: string;
}> {
  try {
    // Create transaction in Supabase
    const { data: serverTransaction, error } = await (supabase as any)
      .from("transactions")
      .insert({
        sender_wallet_id: transaction.sender_wallet_id,
        receiver_wallet_id: transaction.receiver_wallet_id,
        merchant_id: transaction.merchant_id,
        amount_paise: transaction.amount_paise,
        description: transaction.description,
        reference_id: transaction.reference_id,
        transaction_type: transaction.transaction_type,
        payment_method: transaction.payment_method,
        status: "completed",
        is_offline: true,
        created_offline_at: transaction.created_offline_at,
        nfc_tag_id: transaction.nfc_tag_id,
        nfc_signature: transaction.nfc_signature,
        qr_code_data: transaction.qr_code_data,
        device_id: transaction.device_id,
        device_fingerprint: transaction.device_fingerprint,
        latitude: transaction.latitude,
        longitude: transaction.longitude,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to sync transaction:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Mark as synced in IndexedDB
    await markTransactionSynced(transaction.id, (serverTransaction as any).id);

    return {
      success: true,
      serverTransactionId: (serverTransaction as any).id,
    };
  } catch (error: any) {
    console.error("Error syncing transaction:", error);
    return {
      success: false,
      error: error.message || "Failed to sync transaction",
    };
  }
}

/**
 * Sync all pending transactions
 */
export async function syncAllPendingTransactions(
  supabase: SupabaseClient,
  walletId?: string
): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ transactionId: string; error: string }>;
}> {
  try {
    const pendingTransactions = await getPendingTransactions(walletId);

    if (pendingTransactions.length === 0) {
      return {
        success: true,
        synced: 0,
        failed: 0,
        errors: [],
      };
    }

    const results = await Promise.allSettled(
      pendingTransactions.map((tx) => syncTransaction(supabase, tx))
    );

    const synced = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    const failed = results.length - synced;

    const errors = results
      .map((r, i) => {
        if (r.status === "fulfilled" && !r.value.success) {
          return {
            transactionId: pendingTransactions[i].id,
            error: r.value.error || "Unknown error",
          };
        }
        return null;
      })
      .filter((e): e is { transactionId: string; error: string } => e !== null);

    return {
      success: failed === 0,
      synced,
      failed,
      errors,
    };
  } catch (error: any) {
    console.error("Error syncing transactions:", error);
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: [
        {
          transactionId: "unknown",
          error: error.message || "Failed to sync transactions",
        },
      ],
    };
  }
}

