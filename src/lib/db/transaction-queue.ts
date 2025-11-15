/**
 * Offline Transaction Queue Management
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Offline Transaction Queue
 *
 * Manages offline transactions in IndexedDB
 * Handles creation, validation, and syncing of offline transactions
 */

import { nanoid } from "nanoid";
import { db, type LocalTransaction } from "./dexie-client";
import { currency, NPCI_LIMITS, generateTransactionReference } from "./helpers";

/**
 * Create offline transaction
 * Stores transaction locally when offline
 */
export async function createOfflineTransaction(params: {
  senderWalletId: string;
  receiverWalletId: string | null;
  merchantId: string | null;
  amountPaise: number;
  description?: string;
  transactionType: "payment" | "receive" | "refund" | "topup";
  paymentMethod: "nfc" | "qr" | "manual";
  nfcTagId?: string;
  nfcSignature?: string;
  qrCodeData?: string;
  deviceId?: string;
  deviceFingerprint?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
}): Promise<{ success: boolean; transaction?: LocalTransaction; error?: string }> {
  try {
    // Validate amount
    if (params.amountPaise <= 0) {
      return { success: false, error: "Amount must be greater than zero" };
    }

    if (params.amountPaise > NPCI_LIMITS.MAX_TRANSACTION_AMOUNT) {
      return {
        success: false,
        error: `Amount exceeds NPCI limit of ${currency.format(
          NPCI_LIMITS.MAX_TRANSACTION_AMOUNT
        )}`,
      };
    }

    // Check wallet state
    const walletState = await db.walletState.get(params.senderWalletId);
    if (!walletState) {
      return { success: false, error: "Wallet not found in local storage" };
    }

    if (walletState.status !== "active") {
      return { success: false, error: "Wallet is not active" };
    }

    // Check offline balance
    if (walletState.offline_balance_paise < params.amountPaise) {
      return { success: false, error: "Insufficient balance" };
    }

    // Check today's limits
    const today = new Date().toISOString().split("T")[0];
    const todayStats = await db.dailyStats
      .where("[wallet_id+date]")
      .equals([params.senderWalletId, today])
      .first();

    const currentStats = todayStats || {
      transaction_count: 0,
      offline_transaction_count: 0,
      total_amount_paise: 0,
    };

    // Check daily transaction limit
    if (currentStats.transaction_count >= walletState.max_daily_transactions) {
      return { success: false, error: "Daily transaction limit exceeded" };
    }

    // Check offline transaction limit (NPCI: max 5)
    if (currentStats.offline_transaction_count >= walletState.max_offline_transactions) {
      return {
        success: false,
        error: "Offline transaction limit exceeded. Please sync your wallet.",
      };
    }

    // Check sync deadline
    if (walletState.sync_deadline && new Date(walletState.sync_deadline) < new Date()) {
      return {
        success: false,
        error: "Sync deadline exceeded. Please sync your wallet.",
      };
    }

    // Create transaction
    const now = new Date().toISOString();
    const transaction: LocalTransaction = {
      id: nanoid(),
      sender_wallet_id: params.senderWalletId,
      receiver_wallet_id: params.receiverWalletId,
      merchant_id: params.merchantId,
      amount_paise: params.amountPaise,
      description: params.description || null,
      reference_id: generateTransactionReference(),
      transaction_type: params.transactionType,
      payment_method: params.paymentMethod,
      status: "pending",
      is_offline: true,
      created_offline_at: now,
      synced_at: null,
      nfc_tag_id: params.nfcTagId || null,
      nfc_signature: params.nfcSignature || null,
      qr_code_data: params.qrCodeData || null,
      device_id: params.deviceId || null,
      device_fingerprint: params.deviceFingerprint || null,
      latitude: params.latitude || null,
      longitude: params.longitude || null,
      location_accuracy: params.locationAccuracy || null,
      error_code: null,
      error_message: null,
      retry_count: 0,
      created_at: now,
      updated_at: now,
      completed_at: null,
      // Local-only fields
      needs_sync: true,
      sync_attempts: 0,
      last_sync_attempt: null,
    };

    // Store transaction
    await db.transaction("rw", [db.transactions, db.walletState, db.dailyStats], async () => {
      // Add transaction
      await db.transactions.add(transaction);

      // Update wallet offline balance
      await db.walletState.update(params.senderWalletId, {
        offline_balance_paise: walletState.offline_balance_paise - params.amountPaise,
        pending_sync_count: walletState.pending_sync_count + 1,
        // Set sync deadline if first offline transaction
        sync_deadline:
          walletState.sync_deadline ||
          new Date(Date.now() + NPCI_LIMITS.SYNC_DEADLINE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Update daily stats
      if (todayStats) {
        await db.dailyStats.update(todayStats.id, {
          transaction_count: currentStats.transaction_count + 1,
          offline_transaction_count: currentStats.offline_transaction_count + 1,
          total_amount_paise: currentStats.total_amount_paise + params.amountPaise,
          updated_at: now,
        });
      } else {
        await db.dailyStats.add({
          id: nanoid(),
          wallet_id: params.senderWalletId,
          date: today,
          transaction_count: 1,
          offline_transaction_count: 1,
          total_amount_paise: params.amountPaise,
          updated_at: now,
        });
      }
    });

    return { success: true, transaction };
  } catch (error) {
    console.error("Failed to create offline transaction:", error);
    return { success: false, error: "Failed to create transaction" };
  }
}

/**
 * Get all pending offline transactions that need sync
 */
export async function getPendingTransactions(walletId?: string): Promise<LocalTransaction[]> {
  try {
    let query = db.transactions.where("needs_sync").equals(1);

    if (walletId) {
      const transactions = await query.toArray();
      return transactions.filter((t) => t.sender_wallet_id === walletId);
    }

    return await query.toArray();
  } catch (error) {
    console.error("Failed to get pending transactions:", error);
    return [];
  }
}

/**
 * Get transaction by ID
 */
export async function getLocalTransaction(id: string): Promise<LocalTransaction | undefined> {
  try {
    return await db.transactions.get(id);
  } catch (error) {
    console.error("Failed to get transaction:", error);
    return undefined;
  }
}

/**
 * Get all transactions for a wallet (paginated)
 */
export async function getWalletTransactions(
  walletId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: LocalTransaction["status"];
  } = {}
): Promise<LocalTransaction[]> {
  try {
    const { limit = 50, offset = 0, status } = options;

    let query = db.transactions
      .where("sender_wallet_id")
      .equals(walletId)
      .or("receiver_wallet_id")
      .equals(walletId);

    if (status) {
      const allTransactions = await query.toArray();
      const filtered = allTransactions.filter((t) => t.status === status);
      return filtered.slice(offset, offset + limit);
    }

    return await query.offset(offset).limit(limit).reverse().sortBy("created_at");
  } catch (error) {
    console.error("Failed to get wallet transactions:", error);
    return [];
  }
}

/**
 * Mark transaction as synced
 */
export async function markTransactionSynced(
  id: string,
  serverTransactionId?: string
): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    await db.transactions.update(id, {
      synced_at: now,
      needs_sync: false,
      status: "completed",
      updated_at: now,
      // Optionally update ID if server provides one
      ...(serverTransactionId && { id: serverTransactionId }),
    });

    // Update wallet pending sync count
    const transaction = await db.transactions.get(id);
    if (transaction && transaction.sender_wallet_id) {
      const wallet = await db.walletState.get(transaction.sender_wallet_id);
      if (wallet) {
        await db.walletState.update(transaction.sender_wallet_id, {
          pending_sync_count: Math.max(0, wallet.pending_sync_count - 1),
          last_sync_at: now,
        });
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to mark transaction as synced:", error);
    return false;
  }
}

/**
 * Mark transaction as failed
 */
export async function markTransactionFailed(
  id: string,
  errorCode: string,
  errorMessage: string
): Promise<boolean> {
  try {
    await db.transactions.update(id, {
      status: "failed",
      error_code: errorCode,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Failed to mark transaction as failed:", error);
    return false;
  }
}

/**
 * Retry failed transaction
 */
export async function retryTransaction(id: string): Promise<boolean> {
  try {
    const transaction = await db.transactions.get(id);
    if (!transaction) {
      return false;
    }

    if (transaction.retry_count >= 3) {
      return false; // Max retries exceeded
    }

    await db.transactions.update(id, {
      status: "pending",
      retry_count: transaction.retry_count + 1,
      needs_sync: true,
      error_code: null,
      error_message: null,
      last_sync_attempt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Failed to retry transaction:", error);
    return false;
  }
}

/**
 * Get transaction statistics
 */
export async function getTransactionStats(walletId: string) {
  try {
    const allTransactions = await db.transactions
      .where("sender_wallet_id")
      .equals(walletId)
      .or("receiver_wallet_id")
      .equals(walletId)
      .toArray();

    const today = new Date().toISOString().split("T")[0];
    const todayTransactions = allTransactions.filter(
      (t) => t.created_at.split("T")[0] === today
    );

    return {
      total: allTransactions.length,
      pending: allTransactions.filter((t) => t.status === "pending").length,
      completed: allTransactions.filter((t) => t.status === "completed").length,
      failed: allTransactions.filter((t) => t.status === "failed").length,
      offline: allTransactions.filter((t) => t.is_offline && !t.synced_at).length,
      today: todayTransactions.length,
      todayAmount: todayTransactions.reduce((sum, t) => sum + t.amount_paise, 0),
    };
  } catch (error) {
    console.error("Failed to get transaction stats:", error);
    return {
      total: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      offline: 0,
      today: 0,
      todayAmount: 0,
    };
  }
}

/**
 * Delete old completed transactions (cleanup)
 */
export async function cleanupOldTransactions(daysToKeep: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();

    const oldTransactions = await db.transactions
      .where("status")
      .equals("completed")
      .and((t) => t.synced_at !== null && t.synced_at < cutoffISO)
      .toArray();

    const idsToDelete = oldTransactions.map((t) => t.id);
    await db.transactions.bulkDelete(idsToDelete);

    return idsToDelete.length;
  } catch (error) {
    console.error("Failed to cleanup old transactions:", error);
    return 0;
  }
}
