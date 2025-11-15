/**
 * Transactions Page
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Transaction History
 *
 * Transaction history page with filters
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/auth/auth-context";
import { useWallet } from "@/hooks/useWallet";
import { TransactionList } from "@/components/transaction/TransactionList";
import { TransactionFilters, type TransactionFilter } from "@/components/transaction/TransactionFilters";
import { getWalletTransactions } from "@/lib/db/transaction-queue";
import { LoadingSpinner } from "@/components/auth";
import type { LocalTransaction } from "@/lib/db/dexie-client";

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const { wallet, loading: walletLoading } = useWallet();

  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilter>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Redirect if no wallet
  useEffect(() => {
    if (!walletLoading && !wallet) {
      router.push("/wallet/setup");
    }
  }, [walletLoading, wallet, router]);

  // Load transactions
  useEffect(() => {
    const loadTransactions = async () => {
      if (!wallet) {
        return;
      }

      setLoading(true);
      try {
        const allTransactions = await getWalletTransactions(wallet.id, {
          limit: 100,
          offset: 0,
        });

        // Apply filters
        let filtered = allTransactions;

        if (filters.status) {
          filtered = filtered.filter((t) => t.status === filters.status);
        }

        if (filters.paymentMethod) {
          filtered = filtered.filter((t) => t.payment_method === filters.paymentMethod);
        }

        if (filters.needsSync) {
          filtered = filtered.filter((t) => t.needs_sync && !t.synced_at);
        }

        if (filters.dateRange) {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

          filtered = filtered.filter((t) => {
            const txDate = new Date(t.created_at);
            switch (filters.dateRange) {
              case "today":
                return txDate >= today;
              case "week":
                return txDate >= weekAgo;
              case "month":
                return txDate >= monthAgo;
              default:
                return true;
            }
          });
        }

        setTransactions(filtered);
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [wallet, filters]);

  const handleTransactionClick = (transaction: LocalTransaction) => {
    // TODO: Navigate to transaction details page
    console.log("Transaction clicked:", transaction);
  };

  if (authLoading || walletLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!wallet) {
    return null; // Redirecting
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-2">View your payment history</p>
        </div>

        {/* Filters */}
        <TransactionFilters filters={filters} onFiltersChange={setFilters} />

        {/* Transaction List */}
        <TransactionList
          transactions={transactions}
          loading={loading}
          onTransactionClick={handleTransactionClick}
        />
      </div>
    </div>
  );
}

