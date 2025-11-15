/**
 * Merchants API Routes
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Merchant Management
 *
 * API endpoints for merchant operations
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";

/**
 * GET /api/merchants - Get merchants
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const category = searchParams.get("category") || undefined;
    const supportsNfc = searchParams.get("supports_nfc") === "true" ? true : undefined;
    const supportsQr = searchParams.get("supports_qr") === "true" ? true : undefined;

    // Build query
    let query = supabase
      .from("merchants")
      .select("*")
      .eq("is_active", true)
      .limit(limit);

    if (category) {
      query = query.eq("category", category);
    }

    if (supportsNfc !== undefined) {
      query = query.eq("nfc_enabled", supportsNfc);
    }

    if (supportsQr !== undefined) {
      query = query.eq("qr_enabled", supportsQr);
    }

    const { data: merchants, error } = await query;

    if (error) {
      console.error("Failed to get merchants:", error);
      return NextResponse.json(
        { error: "Failed to fetch merchants" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      merchants: merchants || [],
      count: merchants?.length || 0,
    });
  } catch (error) {
    console.error("Failed to get merchants:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

