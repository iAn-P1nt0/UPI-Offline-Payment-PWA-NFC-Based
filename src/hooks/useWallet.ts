/**
 * useWallet Hook
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Wallet Management
 *
 * React hook for wallet state and operations
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/lib/auth/auth-context";
import {
  getWalletByUserId,
  checkWalletBalance,
  canMakeWalletTransaction,
  formatWalletBalance,
  getWalletLimits,
} from "@/lib/wallet/wallet-helpers";
import {
  getCachedWalletState,
  syncWalletStateFromServer,
  getWalletSyncStatus,
} from "@/lib/db/wallet-state";
import { createClient } from "@/lib/db/supabase-client";
import { isOnline } from "@/lib/db/offline-helpers";

export interface WalletState {
  wallet: any | null;
  loading: boolean;
  error: string | null;
  balance: {
    paise: number;
    rupees: number;
    formatted: string;
  };
  syncStatus: {
    needsSync: boolean;
    exceededDeadline: boolean;
    pendingCount: number;
    hoursUntilDeadline: number | null;
  };
}

export interface UseWalletReturn extends WalletState {
  // Actions
  refreshWallet: () => Promise<void>;
  syncWallet: () => Promise<{ success: boolean; error?: string }>;
  canMakeTransaction: (
    amountPaise: number,
    isOffline?: boolean
  ) => Promise<{ allowed: boolean; reason?: string }>;

  // Utilities
  formatBalance: (paise: number) => {
    rupees: string;
    paise: string;
    formatted: string;
  };
  limits: ReturnType<typeof getWalletLimits>;
  isOnline: boolean;
}

/**
 * Main wallet hook
 */
export function useWallet(): UseWalletReturn {
  const { user, isAuthenticated } = useAuthContext();
  const [walletState, setWalletState] = useState<WalletState>({
    wallet: null,
    loading: true,
    error: null,
    balance: {
      paise: 0,
      rupees: 0,
      formatted: "₹0.00",
    },
    syncStatus: {
      needsSync: false,
      exceededDeadline: false,
      pendingCount: 0,
      hoursUntilDeadline: null,
    },
  });

  const [online, setOnline] = useState(isOnline());

  /**
   * Load wallet data
   */
  const loadWallet = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setWalletState({
        wallet: null,
        loading: false,
        error: "Not authenticated",
        balance: { paise: 0, rupees: 0, formatted: "₹0.00" },
        syncStatus: {
          needsSync: false,
          exceededDeadline: false,
          pendingCount: 0,
          hoursUntilDeadline: null,
        },
      });
      return;
    }

    setWalletState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Try online first
      if (online) {
        const result = await getWalletByUserId(user.id);

        if (result.success && result.wallet) {
          const wallet = result.wallet;
          const formatted = formatWalletBalance(wallet.balance_paise);

          // Sync to IndexedDB
          await syncWalletStateFromServer(createClient(), user.id);

          // Get sync status
          const syncStatus = await getWalletSyncStatus(wallet.id);

          setWalletState({
            wallet,
            loading: false,
            error: null,
            balance: {
              paise: wallet.balance_paise,
              rupees: formatted.rupees as any,
              formatted: formatted.formatted,
            },
            syncStatus,
          });
          return;
        }
      }

      // Fall back to cached data
      const cachedWallet = await getCachedWalletState(user.id);

      if (cachedWallet) {
        const formatted = formatWalletBalance(cachedWallet.offline_balance_paise);
        const syncStatus = await getWalletSyncStatus(cachedWallet.id);

        setWalletState({
          wallet: cachedWallet,
          loading: false,
          error: online ? "Failed to load wallet" : null,
          balance: {
            paise: cachedWallet.offline_balance_paise,
            rupees: formatted.rupees as any,
            formatted: formatted.formatted,
          },
          syncStatus,
        });
      } else {
        setWalletState({
          wallet: null,
          loading: false,
          error: "No wallet found",
          balance: { paise: 0, rupees: 0, formatted: "₹0.00" },
          syncStatus: {
            needsSync: false,
            exceededDeadline: false,
            pendingCount: 0,
            hoursUntilDeadline: null,
          },
        });
      }
    } catch (error) {
      console.error("Failed to load wallet:", error);
      setWalletState({
        wallet: null,
        loading: false,
        error: "Failed to load wallet",
        balance: { paise: 0, rupees: 0, formatted: "₹0.00" },
        syncStatus: {
          needsSync: false,
          exceededDeadline: false,
          pendingCount: 0,
          hoursUntilDeadline: null,
        },
      });
    }
  }, [user, isAuthenticated, online]);

  /**
   * Initialize wallet on mount and auth change
   */
  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  /**
   * Monitor online status
   */
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      loadWallet();
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadWallet]);

  /**
   * Refresh wallet
   */
  const refreshWallet = useCallback(async () => {
    await loadWallet();
  }, [loadWallet]);

  /**
   * Sync wallet
   */
  const syncWallet = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (!online) {
      return { success: false, error: "You are offline" };
    }

    try {
      const supabase = createClient();
      const result = await syncWalletStateFromServer(supabase, user.id);

      if (result.success) {
        await loadWallet();
        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error) {
      console.error("Failed to sync wallet:", error);
      return { success: false, error: "Failed to sync wallet" };
    }
  }, [user, online, loadWallet]);

  /**
   * Check if can make transaction
   */
  const canMakeTransaction = useCallback(
    async (
      amountPaise: number,
      isOfflineTransaction: boolean = false
    ): Promise<{ allowed: boolean; reason?: string }> => {
      if (!walletState.wallet) {
        return { allowed: false, reason: "No wallet found" };
      }

      return await canMakeWalletTransaction(
        walletState.wallet.id,
        amountPaise,
        isOfflineTransaction
      );
    },
    [walletState.wallet]
  );

  return {
    ...walletState,
    refreshWallet,
    syncWallet,
    canMakeTransaction,
    formatBalance: formatWalletBalance,
    limits: getWalletLimits(),
    isOnline: online,
  };
}

/**
 * Hook to require wallet
 * Redirects to wallet setup if no wallet found
 */
export function useRequireWallet() {
  const { wallet, loading } = useWallet();
  const hasWallet = !!wallet;

  useEffect(() => {
    if (!loading && !hasWallet) {
      // Redirect to wallet setup
      window.location.href = "/onboarding";
    }
  }, [hasWallet, loading]);

  return { hasWallet, loading };
}
