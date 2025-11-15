/**
 * Transaction Card Component
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Transaction History
 *
 * Individual transaction card component
 */

"use client";

import { format } from "date-fns";
import { currency } from "@/lib/db/helpers";
import type { LocalTransaction } from "@/lib/db/dexie-client";

interface TransactionCardProps {
  transaction: LocalTransaction;
  onClick?: () => void;
}

export function TransactionCard({ transaction, onClick }: TransactionCardProps) {
  const isPayment = transaction.transaction_type === "payment";
  const isCompleted = transaction.status === "completed";
  const isPending = transaction.status === "pending";
  const isFailed = transaction.status === "failed";
  const needsSync = transaction.needs_sync && !transaction.synced_at;

  const amountColor = isPayment ? "text-red-600" : "text-green-600";
  const statusColor = isCompleted
    ? "text-green-600"
    : isPending
    ? "text-yellow-600"
    : isFailed
    ? "text-red-600"
    : "text-gray-600";

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${
        onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">
              {transaction.description || "Payment"}
            </span>
            {needsSync && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                Pending Sync
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span>
              {format(new Date(transaction.created_at), "MMM dd, yyyy HH:mm")}
            </span>
            <span>•</span>
            <span className="capitalize">{transaction.payment_method}</span>
            {transaction.is_offline && (
              <>
                <span>•</span>
                <span className="text-blue-600">Offline</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${amountColor}`}>
              {isPayment ? "-" : "+"}
              {currency.format(transaction.amount_paise)}
            </span>
            <span className={`text-sm font-medium ${statusColor}`}>
              {transaction.status}
            </span>
          </div>
        </div>

        <div className="ml-4">
          {transaction.payment_method === "nfc" && (
            <svg
              className="w-6 h-6 text-upi-orange"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
          )}
          {transaction.payment_method === "qr" && (
            <svg
              className="w-6 h-6 text-upi-blue"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2zM17 17h2v2h-2zM19 19h2v2h-2z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

