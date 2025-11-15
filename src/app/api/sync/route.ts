/**
 * Sync API Route
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Transaction Synchronization
 *
 * API endpoint for triggering sync operations
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { syncAllPendingTransactions } from "@/lib/sync/transaction-sync";
import { syncWalletState } from "@/lib/sync/wallet-sync";
import { syncMerchants } from "@/lib/sync/merchant-sync";

/**
 * POST /api/sync - Trigger sync operation
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

    const body = await request.json();
    const { type = "full", transactions } = body;

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

    const walletData = wallet as any;

    if (type === "transactions" && transactions) {
      // Sync specific transactions (from client)
      const result = await syncAllPendingTransactions(supabase, walletData.id);
      return NextResponse.json(result);
    }

    if (type === "wallet") {
      // Sync wallet state only
      const result = await syncWalletState(supabase, user.id);
      return NextResponse.json(result);
    }

    if (type === "merchants") {
      // Sync merchants only
      const result = await syncMerchants(supabase, {
        forceRefresh: false,
        limit: 100,
      });
      return NextResponse.json(result);
    }

    // Full sync
    const transactionResult = await syncAllPendingTransactions(supabase, walletData.id);
    const walletResult = await syncWalletState(supabase, user.id);
    const merchantResult = await syncMerchants(supabase, {
      forceRefresh: false,
      limit: 100,
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Failed to sync:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

