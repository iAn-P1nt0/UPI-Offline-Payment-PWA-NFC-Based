/**
 * Database Module Exports
 * Phase 1: MVP Foundations
 *
 * Central export point for all database functionality
 * Includes Supabase, IndexedDB (Dexie), and helper functions
 */

// Supabase exports
export { createClient, type SupabaseClient } from "./supabase-client";

export {
  createServerSupabaseClient,
  createAdminClient,
  getCurrentUser,
  isAuthenticated,
  type SupabaseServerClient,
  type SupabaseAdminClient,
} from "./supabase-server";

// Supabase helpers
export {
  currency,
  NPCI_LIMITS,
  validateUpiId,
  validatePhoneNumber,
  validateTransactionAmount,
  getUserWallet,
  getWalletByUpiId,
  getUserTransactions,
  getTodayStats,
  canMakeTransaction,
  getActiveMerchants,
  calculateDistance,
  generateTransactionReference,
  transactionNeedsSync,
  formatTransactionDate,
  type Tables,
  type Wallet,
  type Transaction,
  type User,
  type Merchant,
  type Device,
} from "./helpers";

// Dexie exports
export {
  db,
  initializeDB,
  clearAllData,
  getDatabaseSize,
  checkDatabaseHealth,
  exportDatabase,
  importDatabase,
  UPIOfflineDB,
  type LocalTransaction,
  type CachedMerchant,
  type LocalWalletState,
  type SyncQueueItem,
  type LocalDailyStats,
  type LocalDeviceInfo,
  type AppSettings,
} from "./dexie-client";

// Transaction queue exports
export {
  createOfflineTransaction,
  getPendingTransactions,
  getLocalTransaction,
  getWalletTransactions,
  markTransactionSynced,
  markTransactionFailed,
  retryTransaction,
  getTransactionStats,
  cleanupOldTransactions,
} from "./transaction-queue";

// Merchant cache exports
export {
  syncMerchantsFromServer,
  getCachedMerchant,
  getCachedMerchantByUpiId,
  getCachedMerchantByCode,
  searchCachedMerchants,
  getCachedMerchantsByCategory,
  getNearbyMerchants,
  getRecentlyUsedMerchants,
  getPopularMerchants,
  getAllCachedMerchants,
  addCustomMerchant,
  updateCachedMerchant,
  deleteCachedMerchant,
  getMerchantCacheStats,
  cleanupOldMerchants,
} from "./merchant-cache";

// Wallet state exports
export {
  syncWalletStateFromServer,
  getCachedWalletState,
  getCachedWalletStateByUserId,
  getCachedWalletStateByUpiId,
  updateOfflineBalance,
  incrementPendingSyncCount,
  decrementPendingSyncCount,
  setSyncDeadline,
  clearSyncDeadline,
  updateLastSyncTimestamp,
  recalculateOfflineBalance,
  walletNeedsSync,
  hasExceededSyncDeadline,
  getWalletSyncStatus,
  updateWalletStatus,
  clearAllWalletState,
  getAllCachedWallets,
} from "./wallet-state";

// Offline helpers exports
export {
  isOnline,
  setupNetworkListeners,
  getOfflineStatus,
  needsCriticalSync,
  getStorageInfo,
  formatBytes,
  checkDeviceCapabilities,
  getAppSetting,
  setAppSetting,
  getLastSyncTime,
  setLastSyncTime,
  isOfflineMode,
  setOfflineMode,
  isAutoSyncEnabled,
  setAutoSync,
  requestPersistentStorage,
  isStoragePersisted,
} from "./offline-helpers";
