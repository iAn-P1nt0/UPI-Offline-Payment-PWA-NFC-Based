/**
 * Merchant Cache Management
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Offline Merchant Caching
 *
 * Manages merchant data in IndexedDB for offline access
 * Syncs merchants from Supabase and provides offline lookup
 */

import { db, type CachedMerchant } from "./dexie-client";
import type { SupabaseClient } from "./supabase";
import { calculateDistance } from "./helpers";

/**
 * Sync merchants from Supabase to IndexedDB
 * Should be called when online to cache merchants for offline use
 */
export async function syncMerchantsFromServer(
  supabase: SupabaseClient,
  options: {
    forceRefresh?: boolean;
    limit?: number;
    category?: string;
  } = {}
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { forceRefresh = false, limit = 100, category } = options;

    // Check if we need to refresh
    if (!forceRefresh) {
      const cachedCount = await db.merchants.count();
      const lastCached = await db.merchants.orderBy("cached_at").last();

      // If we have merchants and they were cached recently (< 1 day), skip
      if (cachedCount > 0 && lastCached) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        if (lastCached.cached_at > oneDayAgo) {
          return { success: true, count: cachedCount };
        }
      }
    }

    // Fetch active merchants from Supabase
    let query = supabase.from("merchants").select("*").eq("is_active", true).limit(limit);

    if (category) {
      query = query.eq("category", category);
    }

    const { data: merchants, error } = await query;

    if (error) {
      console.error("Failed to fetch merchants from server:", error);
      return { success: false, count: 0, error: error.message };
    }

    if (!merchants || merchants.length === 0) {
      return { success: true, count: 0 };
    }

    // Convert to cached merchant format
    const now = new Date().toISOString();
    const cachedMerchants: CachedMerchant[] = merchants.map((m) => ({
      ...(m as any),
      cached_at: now,
      last_used_at: null,
      usage_count: 0,
    }));

    // Store in IndexedDB
    await db.transaction("rw", db.merchants, async () => {
      // Clear old merchants if force refresh
      if (forceRefresh) {
        await db.merchants.clear();
      }

      // Add new merchants
      await db.merchants.bulkPut(cachedMerchants);
    });

    return { success: true, count: cachedMerchants.length };
  } catch (error) {
    console.error("Failed to sync merchants:", error);
    return { success: false, count: 0, error: "Failed to sync merchants" };
  }
}

/**
 * Get merchant by ID from cache
 */
export async function getCachedMerchant(merchantId: string): Promise<CachedMerchant | undefined> {
  try {
    const merchant = await db.merchants.get(merchantId);

    // Update last used timestamp
    if (merchant) {
      await db.merchants.update(merchantId, {
        last_used_at: new Date().toISOString(),
        usage_count: merchant.usage_count + 1,
      });
    }

    return merchant;
  } catch (error) {
    console.error("Failed to get cached merchant:", error);
    return undefined;
  }
}

/**
 * Get merchant by UPI ID from cache
 */
export async function getCachedMerchantByUpiId(upiId: string): Promise<CachedMerchant | undefined> {
  try {
    const merchant = await db.merchants.where("upi_id").equals(upiId).first();

    // Update last used timestamp
    if (merchant) {
      await db.merchants.update(merchant.id, {
        last_used_at: new Date().toISOString(),
        usage_count: merchant.usage_count + 1,
      });
    }

    return merchant;
  } catch (error) {
    console.error("Failed to get cached merchant by UPI ID:", error);
    return undefined;
  }
}

/**
 * Get merchant by merchant code from cache
 */
export async function getCachedMerchantByCode(
  merchantCode: string
): Promise<CachedMerchant | undefined> {
  try {
    const merchant = await db.merchants.where("merchant_code").equals(merchantCode).first();

    // Update last used timestamp
    if (merchant) {
      await db.merchants.update(merchant.id, {
        last_used_at: new Date().toISOString(),
        usage_count: merchant.usage_count + 1,
      });
    }

    return merchant;
  } catch (error) {
    console.error("Failed to get cached merchant by code:", error);
    return undefined;
  }
}

/**
 * Search cached merchants
 */
export async function searchCachedMerchants(query: string): Promise<CachedMerchant[]> {
  try {
    const lowerQuery = query.toLowerCase();
    const merchants = await db.merchants.toArray();

    return merchants.filter(
      (m) =>
        m.display_name.toLowerCase().includes(lowerQuery) ||
        m.business_name.toLowerCase().includes(lowerQuery) ||
        m.merchant_code.toLowerCase().includes(lowerQuery) ||
        m.upi_id.toLowerCase().includes(lowerQuery) ||
        (m.category && m.category.toLowerCase().includes(lowerQuery))
    );
  } catch (error) {
    console.error("Failed to search cached merchants:", error);
    return [];
  }
}

/**
 * Get merchants by category
 */
export async function getCachedMerchantsByCategory(category: string): Promise<CachedMerchant[]> {
  try {
    return await db.merchants.where("category").equals(category).toArray();
  } catch (error) {
    console.error("Failed to get merchants by category:", error);
    return [];
  }
}

/**
 * Get nearby merchants (requires location)
 */
export async function getNearbyMerchants(
  latitude: number,
  longitude: number,
  radiusKm: number = 5
): Promise<Array<CachedMerchant & { distance: number }>> {
  try {
    const merchants = await db.merchants
      .filter((m) => m.latitude !== null && m.longitude !== null)
      .toArray();

    const merchantsWithDistance = merchants
      .map((m) => ({
        ...m,
        distance: calculateDistance(latitude, longitude, m.latitude!, m.longitude!),
      }))
      .filter((m) => m.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return merchantsWithDistance;
  } catch (error) {
    console.error("Failed to get nearby merchants:", error);
    return [];
  }
}

/**
 * Get recently used merchants
 */
export async function getRecentlyUsedMerchants(limit: number = 10): Promise<CachedMerchant[]> {
  try {
    return await db.merchants
      .filter((m) => m.last_used_at !== null)
      .reverse()
      .sortBy("last_used_at")
      .then((merchants) => merchants.slice(0, limit));
  } catch (error) {
    console.error("Failed to get recently used merchants:", error);
    return [];
  }
}

/**
 * Get popular merchants (by usage count)
 */
export async function getPopularMerchants(limit: number = 10): Promise<CachedMerchant[]> {
  try {
    return await db.merchants
      .orderBy("usage_count")
      .reverse()
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error("Failed to get popular merchants:", error);
    return [];
  }
}

/**
 * Get all cached merchants with filters
 */
export async function getAllCachedMerchants(options: {
  category?: string;
  supportsNfc?: boolean;
  supportsQr?: boolean;
  limit?: number;
} = {}): Promise<CachedMerchant[]> {
  try {
    const { category, supportsNfc, supportsQr, limit = 100 } = options;

    let merchants = await db.merchants.toArray();

    // Apply filters
    if (category) {
      merchants = merchants.filter((m) => m.category === category);
    }

    if (supportsNfc !== undefined) {
      merchants = merchants.filter((m) => m.nfc_enabled === supportsNfc);
    }

    if (supportsQr !== undefined) {
      merchants = merchants.filter((m) => m.qr_enabled === supportsQr);
    }

    // Sort by last used (most recent first)
    merchants.sort((a, b) => {
      if (!a.last_used_at && !b.last_used_at) return 0;
      if (!a.last_used_at) return 1;
      if (!b.last_used_at) return -1;
      return b.last_used_at.localeCompare(a.last_used_at);
    });

    return merchants.slice(0, limit);
  } catch (error) {
    console.error("Failed to get all cached merchants:", error);
    return [];
  }
}

/**
 * Add custom merchant (user-added)
 */
export async function addCustomMerchant(merchant: {
  business_name: string;
  display_name: string;
  upi_id: string;
  category?: string;
  phone_number?: string;
  description?: string;
}): Promise<{ success: boolean; merchant?: CachedMerchant; error?: string }> {
  try {
    const now = new Date().toISOString();
    const customMerchant: CachedMerchant = {
      id: `custom_${Date.now()}`,
      business_name: merchant.business_name,
      display_name: merchant.display_name,
      merchant_code: `CUSTOM_${Date.now()}`,
      upi_id: merchant.upi_id,
      phone_number: merchant.phone_number || null,
      email: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      postal_code: null,
      country: "IN",
      latitude: null,
      longitude: null,
      category: merchant.category || "Other",
      description: merchant.description || null,
      logo_url: null,
      is_active: true,
      is_verified: false,
      supports_offline: true,
      nfc_enabled: false,
      qr_enabled: true,
      cached_at: now,
      last_used_at: null,
      usage_count: 0,
    };

    await db.merchants.add(customMerchant);

    return { success: true, merchant: customMerchant };
  } catch (error) {
    console.error("Failed to add custom merchant:", error);
    return { success: false, error: "Failed to add merchant" };
  }
}

/**
 * Update merchant in cache
 */
export async function updateCachedMerchant(
  merchantId: string,
  updates: Partial<CachedMerchant>
): Promise<boolean> {
  try {
    await db.merchants.update(merchantId, updates);
    return true;
  } catch (error) {
    console.error("Failed to update cached merchant:", error);
    return false;
  }
}

/**
 * Delete merchant from cache
 */
export async function deleteCachedMerchant(merchantId: string): Promise<boolean> {
  try {
    await db.merchants.delete(merchantId);
    return true;
  } catch (error) {
    console.error("Failed to delete cached merchant:", error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getMerchantCacheStats() {
  try {
    const merchants = await db.merchants.toArray();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    return {
      total: merchants.length,
      active: merchants.filter((m) => m.is_active).length,
      verified: merchants.filter((m) => m.is_verified).length,
      nfcEnabled: merchants.filter((m) => m.nfc_enabled).length,
      qrEnabled: merchants.filter((m) => m.qr_enabled).length,
      cachedRecently: merchants.filter((m) => m.cached_at > oneDayAgo).length,
      usedRecently: merchants.filter((m) => m.last_used_at && m.last_used_at > oneWeekAgo).length,
      categories: [...new Set(merchants.map((m) => m.category).filter(Boolean))],
    };
  } catch (error) {
    console.error("Failed to get merchant cache stats:", error);
    return {
      total: 0,
      active: 0,
      verified: 0,
      nfcEnabled: 0,
      qrEnabled: 0,
      cachedRecently: 0,
      usedRecently: 0,
      categories: [],
    };
  }
}

/**
 * Cleanup old unused merchants
 */
export async function cleanupOldMerchants(daysUnused: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysUnused);
    const cutoffISO = cutoffDate.toISOString();

    const oldMerchants = await db.merchants
      .filter((m) => !m.last_used_at || m.last_used_at < cutoffISO)
      .toArray();

    const idsToDelete = oldMerchants.map((m) => m.id);
    await db.merchants.bulkDelete(idsToDelete);

    return idsToDelete.length;
  } catch (error) {
    console.error("Failed to cleanup old merchants:", error);
    return 0;
  }
}
