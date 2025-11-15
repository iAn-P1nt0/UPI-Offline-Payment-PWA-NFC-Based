/**
 * Transaction Sync API Route
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Transaction Synchronization
 *
 * API endpoint for syncing offline transactions to server
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { getPendingTransactions } from "@/lib/db/transaction-queue";
import { markTransactionSynced } from "@/lib/db/transaction-queue";

/**
 * POST /api/transactions/sync - Sync offline transactions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    // Get pending transactions from IndexedDB (client-side)
    // Note: This endpoint should be called from client with transaction data
    const body = await request.json();
    const { transactions } = body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: "No transactions to sync" },
        { status: 400 }
      );
    }

    const syncedTransactions = [];
    const failedTransactions = [];

    // Sync each transaction
    for (const localTransaction of transactions) {
      try {
        // Create transaction in Supabase
        const { data: serverTransaction, error: createError } = await (supabase as any)
          .from("transactions")
          .insert({
            sender_wallet_id: localTransaction.sender_wallet_id,
            receiver_wallet_id: localTransaction.receiver_wallet_id,
            merchant_id: localTransaction.merchant_id,
            amount_paise: localTransaction.amount_paise,
            description: localTransaction.description,
            reference_id: localTransaction.reference_id,
            transaction_type: localTransaction.transaction_type,
            payment_method: localTransaction.payment_method,
            status: "completed",
            is_offline: true,
            created_offline_at: localTransaction.created_offline_at,
            nfc_tag_id: localTransaction.nfc_tag_id,
            nfc_signature: localTransaction.nfc_signature,
            qr_code_data: localTransaction.qr_code_data,
            device_id: localTransaction.device_id,
            device_fingerprint: localTransaction.device_fingerprint,
            latitude: localTransaction.latitude,
            longitude: localTransaction.longitude,
          })
          .select()
          .single();

        if (createError) {
          console.error("Failed to sync transaction:", createError);
          failedTransactions.push({
            id: localTransaction.id,
            error: createError.message,
          });
          continue;
        }

        // Mark as synced in IndexedDB (client will handle this)
        syncedTransactions.push({
          localId: localTransaction.id,
          serverId: (serverTransaction as any).id,
        });
      } catch (error: any) {
        console.error("Error syncing transaction:", error);
        failedTransactions.push({
          id: localTransaction.id,
          error: error.message || "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedTransactions.length,
      failed: failedTransactions.length,
      syncedTransactions,
      failedTransactions,
    });
  } catch (error) {
    console.error("Failed to sync transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

