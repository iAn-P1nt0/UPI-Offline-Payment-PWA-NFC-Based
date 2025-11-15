/**
 * useSync Hook
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Transaction Synchronization
 *
 * React hook for sync operations
 */

"use client";

import { useState, useCallback } from "react";
import { useAuthContext } from "@/lib/auth/auth-context";
import { useWallet } from "@/hooks/useWallet";
import {
  performFullSync,
  syncTransactionsOnly,
  syncWalletOnly,
  syncMerchantsOnly,
  type SyncResult,
} from "@/lib/sync";

export interface UseSyncReturn {
  syncing: boolean;
  lastSyncResult: SyncResult | null;
  syncFull: () => Promise<SyncResult>;
  syncTransactions: () => Promise<void>;
  syncWallet: () => Promise<void>;
  syncMerchants: () => Promise<void>;
}

export function useSync(): UseSyncReturn {
  const { user } = useAuthContext();
  const { wallet, refreshWallet } = useWallet();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const syncFull = useCallback(async (): Promise<SyncResult> => {
    if (!user || !wallet) {
      throw new Error("User or wallet not found");
    }

    setSyncing(true);
    try {
      const result = await performFullSync(user.id, wallet.id);
      setLastSyncResult(result);

      // Refresh wallet state after sync
      if (result.wallet.success) {
        await refreshWallet();
      }

      return result;
    } finally {
      setSyncing(false);
    }
  }, [user, wallet, refreshWallet]);

  const syncTransactions = useCallback(async (): Promise<void> => {
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    setSyncing(true);
    try {
      await syncTransactionsOnly(wallet.id);
      await refreshWallet();
    } finally {
      setSyncing(false);
    }
  }, [wallet, refreshWallet]);

  const syncWallet = useCallback(async (): Promise<void> => {
    if (!user) {
      throw new Error("User not found");
    }

    setSyncing(true);
    try {
      await syncWalletOnly(user.id);
      await refreshWallet();
    } finally {
      setSyncing(false);
    }
  }, [user, refreshWallet]);

  const syncMerchants = useCallback(async (): Promise<void> => {
    setSyncing(true);
    try {
      await syncMerchantsOnly();
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    syncing,
    lastSyncResult,
    syncFull,
    syncTransactions,
    syncWallet,
    syncMerchants,
  };
}

