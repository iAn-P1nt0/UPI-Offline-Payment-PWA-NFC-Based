/**
 * Dexie IndexedDB Client
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Offline Storage
 *
 * This file sets up IndexedDB using Dexie.js for offline-first functionality
 * Stores transactions, merchants, wallet state, and sync queue locally
 */

import Dexie, { type Table } from "dexie";

/**
 * Local Transaction Interface
 * Matches Supabase transaction structure but stored locally
 */
export interface LocalTransaction {
  id: string;
  sender_wallet_id: string | null;
  receiver_wallet_id: string | null;
  merchant_id: string | null;
  amount_paise: number;
  description: string | null;
  reference_id: string | null;
  transaction_type: "payment" | "receive" | "refund" | "topup";
  payment_method: "nfc" | "qr" | "manual";
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  is_offline: boolean;
  created_offline_at: string | null;
  synced_at: string | null;
  nfc_tag_id: string | null;
  nfc_signature: string | null;
  qr_code_data: string | null;
  device_id: string | null;
  device_fingerprint: string | null;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Local-only fields
  needs_sync: boolean;
  sync_attempts: number;
  last_sync_attempt: string | null;
}

/**
 * Cached Merchant Interface
 * Local copy of merchant data for offline use
 */
export interface CachedMerchant {
  id: string;
  business_name: string;
  display_name: string;
  merchant_code: string;
  upi_id: string;
  phone_number: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  supports_offline: boolean;
  nfc_enabled: boolean;
  qr_enabled: boolean;
  // Local-only fields
  cached_at: string;
  last_used_at: string | null;
  usage_count: number;
}

/**
 * Local Wallet State Interface
 * Cached wallet information for offline access
 */
export interface LocalWalletState {
  id: string;
  user_id: string;
  upi_id: string;
  upi_provider: string | null;
  balance_paise: number;
  max_balance_paise: number;
  max_transaction_paise: number;
  max_daily_transactions: number;
  max_offline_transactions: number;
  status: "active" | "frozen" | "suspended" | "closed";
  last_sync_at: string | null;
  pending_sync_count: number;
  sync_deadline: string | null;
  // Local-only fields
  cached_at: string;
  offline_balance_paise: number; // Balance considering pending offline transactions
}

/**
 * Sync Queue Item Interface
 * Tracks operations that need to be synced to server
 */
export interface SyncQueueItem {
  id: string;
  user_id: string;
  operation_type: "transaction" | "wallet_update" | "device_update";
  payload: any; // JSON payload
  priority: number;
  retry_count: number;
  max_retries: number;
  is_processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  last_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Daily Stats Interface
 * Track today's transaction limits locally
 */
export interface LocalDailyStats {
  id: string;
  wallet_id: string;
  date: string;
  transaction_count: number;
  total_amount_paise: number;
  offline_transaction_count: number;
  updated_at: string;
}

/**
 * Device Info Interface
 * Store device information locally
 */
export interface LocalDeviceInfo {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_name: string | null;
  platform: string | null;
  browser: string | null;
  os_version: string | null;
  app_version: string | null;
  supports_nfc: boolean;
  supports_biometric: boolean;
  status: "active" | "pending" | "revoked";
  created_at: string;
  updated_at: string;
}

/**
 * App Settings Interface
 * Store app settings and preferences
 */
export interface AppSettings {
  key: string;
  value: any;
  updated_at: string;
}

/**
 * Dexie Database Class
 * Defines the schema and version for IndexedDB
 */
export class UPIOfflineDB extends Dexie {
  // Declare tables
  transactions!: Table<LocalTransaction, string>;
  merchants!: Table<CachedMerchant, string>;
  walletState!: Table<LocalWalletState, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  dailyStats!: Table<LocalDailyStats, string>;
  deviceInfo!: Table<LocalDeviceInfo, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("UPIOfflineDB");

    // Define schema version 1
    this.version(1).stores({
      // Transactions - indexed by status, needs_sync, created_at
      transactions:
        "id, sender_wallet_id, receiver_wallet_id, merchant_id, status, is_offline, needs_sync, created_at, reference_id",

      // Merchants - indexed by merchant_code, category, is_active, last_used_at
      merchants: "id, merchant_code, upi_id, category, is_active, last_used_at, cached_at",

      // Wallet State - indexed by user_id
      walletState: "id, user_id, upi_id",

      // Sync Queue - indexed by is_processed, priority, created_at
      syncQueue: "id, user_id, operation_type, is_processed, priority, created_at",

      // Daily Stats - indexed by wallet_id and date
      dailyStats: "id, wallet_id, date",

      // Device Info - indexed by user_id and device_fingerprint
      deviceInfo: "id, user_id, device_fingerprint",

      // Settings - key-value store
      settings: "key",
    });
  }
}

/**
 * Create and export database instance
 * Singleton pattern - only one instance throughout the app
 */
export const db = new UPIOfflineDB();

/**
 * Initialize database with default settings
 */
export async function initializeDB() {
  try {
    await db.open();
    console.log("IndexedDB initialized successfully");

    // Set default settings if not exists
    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
      await db.settings.bulkAdd([
        {
          key: "app_version",
          value: "1.0.0",
          updated_at: new Date().toISOString(),
        },
        {
          key: "last_sync",
          value: null,
          updated_at: new Date().toISOString(),
        },
        {
          key: "offline_mode",
          value: false,
          updated_at: new Date().toISOString(),
        },
        {
          key: "auto_sync",
          value: true,
          updated_at: new Date().toISOString(),
        },
      ]);
    }

    return true;
  } catch (error) {
    console.error("Failed to initialize IndexedDB:", error);
    return false;
  }
}

/**
 * Clear all data from database (for logout/reset)
 */
export async function clearAllData() {
  try {
    await db.transactions.clear();
    await db.merchants.clear();
    await db.walletState.clear();
    await db.syncQueue.clear();
    await db.dailyStats.clear();
    await db.deviceInfo.clear();
    // Keep settings
    console.log("All user data cleared from IndexedDB");
    return true;
  } catch (error) {
    console.error("Failed to clear IndexedDB:", error);
    return false;
  }
}

/**
 * Get database size (for storage management)
 */
export async function getDatabaseSize(): Promise<{
  transactions: number;
  merchants: number;
  walletState: number;
  syncQueue: number;
  dailyStats: number;
  total: number;
}> {
  const counts = {
    transactions: await db.transactions.count(),
    merchants: await db.merchants.count(),
    walletState: await db.walletState.count(),
    syncQueue: await db.syncQueue.count(),
    dailyStats: await db.dailyStats.count(),
    total: 0,
  };

  counts.total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return counts;
}

/**
 * Check if database is healthy
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Test read access
    await db.settings.count();

    // Test write access
    const testKey = "__health_check__";
    await db.settings.put({
      key: testKey,
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await db.settings.delete(testKey);

    // Check for pending syncs
    const pendingSyncs = await db.syncQueue.where("is_processed").equals(0).count();
    if (pendingSyncs > 100) {
      errors.push(`High number of pending syncs: ${pendingSyncs}`);
    }

    // Check wallet state
    const walletCount = await db.walletState.count();
    if (walletCount === 0) {
      errors.push("No wallet state cached");
    }

    return {
      healthy: errors.length === 0,
      errors,
    };
  } catch (error) {
    errors.push(`Database health check failed: ${error}`);
    return {
      healthy: false,
      errors,
    };
  }
}

/**
 * Export database for backup
 */
export async function exportDatabase() {
  try {
    const data = {
      transactions: await db.transactions.toArray(),
      merchants: await db.merchants.toArray(),
      walletState: await db.walletState.toArray(),
      syncQueue: await db.syncQueue.toArray(),
      dailyStats: await db.dailyStats.toArray(),
      deviceInfo: await db.deviceInfo.toArray(),
      settings: await db.settings.toArray(),
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data);
  } catch (error) {
    console.error("Failed to export database:", error);
    return null;
  }
}

/**
 * Import database from backup
 */
export async function importDatabase(jsonData: string) {
  try {
    const data = JSON.parse(jsonData);

    // Clear existing data
    await clearAllData();

    // Import data
    if (data.transactions) await db.transactions.bulkAdd(data.transactions);
    if (data.merchants) await db.merchants.bulkAdd(data.merchants);
    if (data.walletState) await db.walletState.bulkAdd(data.walletState);
    if (data.syncQueue) await db.syncQueue.bulkAdd(data.syncQueue);
    if (data.dailyStats) await db.dailyStats.bulkAdd(data.dailyStats);
    if (data.deviceInfo) await db.deviceInfo.bulkAdd(data.deviceInfo);
    if (data.settings) {
      await db.settings.clear();
      await db.settings.bulkAdd(data.settings);
    }

    console.log("Database imported successfully");
    return true;
  } catch (error) {
    console.error("Failed to import database:", error);
    return false;
  }
}
