/**
 * Offline Helper Functions
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Offline Support
 *
 * Utility functions for offline functionality
 * Network detection, sync management, and offline state
 */

import { db } from "./dexie-client";
import { getPendingTransactions } from "./transaction-queue";
import { walletNeedsSync, hasExceededSyncDeadline } from "./wallet-state";

/**
 * Check if app is online
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

/**
 * Setup online/offline event listeners
 */
export function setupNetworkListeners(callbacks: {
  onOnline?: () => void;
  onOffline?: () => void;
}) {
  if (typeof window === "undefined") return;

  const handleOnline = () => {
    console.log("Network: Online");
    callbacks.onOnline?.();
  };

  const handleOffline = () => {
    console.log("Network: Offline");
    callbacks.onOffline?.();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * Get overall offline status
 */
export async function getOfflineStatus(): Promise<{
  isOffline: boolean;
  pendingTransactions: number;
  pendingSyncItems: number;
  walletsNeedingSync: number;
  walletsExceededDeadline: number;
}> {
  try {
    const pendingTransactions = await getPendingTransactions();
    const pendingSyncItems = await db.syncQueue.where("is_processed").equals(0).count();
    const allWallets = await db.walletState.toArray();

    let walletsNeedingSync = 0;
    let walletsExceededDeadline = 0;

    for (const wallet of allWallets) {
      if (await walletNeedsSync(wallet.id)) {
        walletsNeedingSync++;
      }
      if (await hasExceededSyncDeadline(wallet.id)) {
        walletsExceededDeadline++;
      }
    }

    return {
      isOffline: !isOnline(),
      pendingTransactions: pendingTransactions.length,
      pendingSyncItems,
      walletsNeedingSync,
      walletsExceededDeadline,
    };
  } catch (error) {
    console.error("Failed to get offline status:", error);
    return {
      isOffline: !isOnline(),
      pendingTransactions: 0,
      pendingSyncItems: 0,
      walletsNeedingSync: 0,
      walletsExceededDeadline: 0,
    };
  }
}

/**
 * Check if critical sync is needed
 */
export async function needsCriticalSync(): Promise<boolean> {
  try {
    const status = await getOfflineStatus();
    return status.walletsExceededDeadline > 0 || status.pendingTransactions > 10;
  } catch (error) {
    return false;
  }
}

/**
 * Get storage usage information
 */
export async function getStorageInfo(): Promise<{
  used: number;
  available: number;
  percentage: number;
  quota: number;
}> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { used: 0, available: 0, percentage: 0, quota: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const available = quota - used;
    const percentage = quota > 0 ? (used / quota) * 100 : 0;

    return {
      used,
      available,
      percentage,
      quota,
    };
  } catch (error) {
    console.error("Failed to get storage info:", error);
    return { used: 0, available: 0, percentage: 0, quota: 0 };
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Check if device supports required features
 */
export async function checkDeviceCapabilities(): Promise<{
  nfc: boolean;
  camera: boolean;
  geolocation: boolean;
  indexedDB: boolean;
  serviceWorker: boolean;
  notifications: boolean;
  biometric: boolean;
}> {
  const capabilities = {
    nfc: false,
    camera: false,
    geolocation: false,
    indexedDB: false,
    serviceWorker: false,
    notifications: false,
    biometric: false,
  };

  if (typeof window === "undefined") return capabilities;

  try {
    // NFC
    capabilities.nfc = "NDEFReader" in window;

    // Camera
    capabilities.camera = !!(
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    );

    // Geolocation
    capabilities.geolocation = "geolocation" in navigator;

    // IndexedDB
    capabilities.indexedDB = "indexedDB" in window;

    // Service Worker
    capabilities.serviceWorker = "serviceWorker" in navigator;

    // Notifications
    capabilities.notifications = "Notification" in window;

    // Biometric (WebAuthn)
    capabilities.biometric =
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function";

    if (capabilities.biometric) {
      capabilities.biometric =
        await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch (error) {
    console.error("Failed to check device capabilities:", error);
  }

  return capabilities;
}

/**
 * Get app settings from IndexedDB
 */
export async function getAppSetting(key: string): Promise<any> {
  try {
    const setting = await db.settings.get(key);
    return setting?.value;
  } catch (error) {
    console.error(`Failed to get app setting: ${key}`, error);
    return null;
  }
}

/**
 * Set app setting in IndexedDB
 */
export async function setAppSetting(key: string, value: any): Promise<boolean> {
  try {
    await db.settings.put({
      key,
      value,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error(`Failed to set app setting: ${key}`, error);
    return false;
  }
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<string | null> {
  try {
    return await getAppSetting("last_sync");
  } catch (error) {
    return null;
  }
}

/**
 * Set last sync timestamp
 */
export async function setLastSyncTime(): Promise<boolean> {
  try {
    return await setAppSetting("last_sync", new Date().toISOString());
  } catch (error) {
    return false;
  }
}

/**
 * Check if app is in offline mode (user preference)
 */
export async function isOfflineMode(): Promise<boolean> {
  try {
    const offlineMode = await getAppSetting("offline_mode");
    return offlineMode === true;
  } catch (error) {
    return false;
  }
}

/**
 * Set offline mode (user preference)
 */
export async function setOfflineMode(enabled: boolean): Promise<boolean> {
  try {
    return await setAppSetting("offline_mode", enabled);
  } catch (error) {
    return false;
  }
}

/**
 * Check if auto-sync is enabled
 */
export async function isAutoSyncEnabled(): Promise<boolean> {
  try {
    const autoSync = await getAppSetting("auto_sync");
    return autoSync !== false; // Default to true
  } catch (error) {
    return true;
  }
}

/**
 * Set auto-sync preference
 */
export async function setAutoSync(enabled: boolean): Promise<boolean> {
  try {
    return await setAppSetting("auto_sync", enabled);
  } catch (error) {
    return false;
  }
}

/**
 * Request persistent storage permission
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) {
      return true;
    }

    const granted = await navigator.storage.persist();
    return granted;
  } catch (error) {
    console.error("Failed to request persistent storage:", error);
    return false;
  }
}

/**
 * Check if storage is persisted
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch (error) {
    return false;
  }
}
