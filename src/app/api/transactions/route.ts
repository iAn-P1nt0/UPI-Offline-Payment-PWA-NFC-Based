/**
 * Transactions API Routes
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Transaction Management
 *
 * API endpoints for transaction operations
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { getUserTransactions } from "@/lib/db/helpers";

/**
 * GET /api/transactions - Get user's transactions
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const status = searchParams.get("status") || undefined;
    const paymentMethod = searchParams.get("payment_method") || undefined;

    const { data: transactions, count } = await getUserTransactions(
      supabase,
      user.id,
      {
        limit,
        offset,
        status: status as any,
      }
    );

    // Filter by payment method if provided
    let filteredTransactions = transactions || [];
    if (paymentMethod) {
      filteredTransactions = filteredTransactions.filter(
        (t: any) => t.payment_method === paymentMethod
      );
    }

    return NextResponse.json({
      transactions: filteredTransactions,
      count: filteredTransactions.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to get transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transactions - Create new transaction (for online payments)
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
    const {
      receiver_wallet_id,
      merchant_id,
      amount_paise,
      description,
      payment_method,
      nfc_tag_id,
      qr_code_data,
    } = body;

    // Validate required fields
    if (!amount_paise || amount_paise <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    // NPCI limit: ₹1,000 (100,000 paise)
    if (amount_paise > 100000) {
      return NextResponse.json(
        { error: "Amount exceeds NPCI limit of ₹1,000" },
        { status: 400 }
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

    const walletData = wallet as any;

    // Check balance
    if (walletData.balance_paise < amount_paise) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Create transaction
    const { data: transaction, error } = await (supabase as any)
      .from("transactions")
      .insert({
        sender_wallet_id: walletData.id,
        receiver_wallet_id: receiver_wallet_id || null,
        merchant_id: merchant_id || null,
        amount_paise,
        description: description || null,
        transaction_type: "payment",
        payment_method: payment_method || "manual",
        status: "processing",
        is_offline: false,
        nfc_tag_id: nfc_tag_id || null,
        qr_code_data: qr_code_data || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create transaction:", error);
      return NextResponse.json(
        { error: "Failed to create transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

