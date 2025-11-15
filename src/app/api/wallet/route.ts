/**
 * Wallet API Routes
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Wallet Management
 *
 * API endpoints for wallet operations
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import {
  getUserWallet,
  getWalletByUpiId,
  canMakeTransaction,
} from "@/lib/db/helpers";
import { validateUpiId } from "@/lib/wallet/wallet-helpers";

/**
 * GET /api/wallet - Get user's wallet
 */
export async function GET(request: NextRequest) {
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

    const wallet = await getUserWallet(supabase, user.id);

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ wallet });
  } catch (error) {
    console.error("Failed to get wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wallet - Create new wallet
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
    const { upiId } = body;

    if (!upiId) {
      return NextResponse.json(
        { error: "UPI ID is required" },
        { status: 400 }
      );
    }

    // Validate UPI ID format
    const validation = validateUpiId(upiId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check if user already has a wallet
    const existingWallet = await getUserWallet(supabase, user.id);
    if (existingWallet) {
      return NextResponse.json(
        { error: "User already has a wallet" },
        { status: 400 }
      );
    }

    // Check if UPI ID is already taken
    const existingUpiWallet = await getWalletByUpiId(supabase, upiId);
    if (existingUpiWallet) {
      return NextResponse.json(
        { error: "UPI ID is already taken" },
        { status: 400 }
      );
    }

    // Create wallet
    const { data: wallet, error } = await (supabase as any)
      .from("wallets")
      .insert({
        user_id: user.id,
        upi_id: upiId.toLowerCase(),
        balance_paise: 0,
        max_balance_paise: 500000, // ₹5,000
        max_transaction_paise: 100000, // ₹1,000
        max_daily_transactions: 20,
        max_offline_transactions: 5,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create wallet:", error);
      return NextResponse.json(
        { error: "Failed to create wallet" },
        { status: 500 }
      );
    }

    return NextResponse.json({ wallet }, { status: 201 });
  } catch (error) {
    console.error("Failed to create wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/wallet - Update wallet
 */
export async function PATCH(request: NextRequest) {
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

    const wallet = await getUserWallet(supabase, user.id);
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: any = {};

    // Only allow updating certain fields
    if (body.status !== undefined) {
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: updatedWallet, error } = await (supabase as any)
      .from("wallets")
      .update(updates)
      .eq("id", (wallet as any).id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update wallet:", error);
      return NextResponse.json(
        { error: "Failed to update wallet" },
        { status: 500 }
      );
    }

    return NextResponse.json({ wallet: updatedWallet });
  } catch (error) {
    console.error("Failed to update wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

