/**
 * Transaction List Component
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Transaction History
 *
 * Transaction list component with loading and empty states
 */

"use client";

import { TransactionCard } from "./TransactionCard";
import type { LocalTransaction } from "@/lib/db/dexie-client";

interface TransactionListProps {
  transactions: LocalTransaction[];
  loading?: boolean;
  onTransactionClick?: (transaction: LocalTransaction) => void;
}

export function TransactionList({
  transactions,
  loading = false,
  onTransactionClick,
}: TransactionListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-gray-600">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          onClick={() => onTransactionClick?.(transaction)}
        />
      ))}
    </div>
  );
}

