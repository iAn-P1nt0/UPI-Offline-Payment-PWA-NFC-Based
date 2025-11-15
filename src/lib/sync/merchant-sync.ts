/**
 * Merchant Cache Synchronization
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Transaction Synchronization
 *
 * Handles syncing merchant data from server for offline caching
 */

import { syncMerchantsFromServer } from "@/lib/db/merchant-cache";
import type { SupabaseClient } from "@/lib/db/supabase";

/**
 * Sync merchants from server
 */
export async function syncMerchants(
  supabase: SupabaseClient,
  options: {
    forceRefresh?: boolean;
    limit?: number;
    category?: string;
  } = {}
): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const result = await syncMerchantsFromServer(supabase, options);

    return {
      success: result.success,
      count: result.count,
      error: result.error,
    };
  } catch (error: any) {
    console.error("Error syncing merchants:", error);
    return {
      success: false,
      count: 0,
      error: error.message || "Failed to sync merchants",
    };
  }
}

