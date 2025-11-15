/**
 * Transaction Filters Component
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Transaction History
 *
 * Filter UI for transactions (status, date, type)
 */

"use client";

import { useState } from "react";

export interface TransactionFilter {
  status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
  paymentMethod?: "nfc" | "qr" | "manual";
  dateRange?: "today" | "week" | "month" | "all";
  needsSync?: boolean;
}

interface TransactionFiltersProps {
  filters: TransactionFilter;
  onFiltersChange: (filters: TransactionFilter) => void;
}

export function TransactionFilters({
  filters,
  onFiltersChange,
}: TransactionFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof TransactionFilter, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" ? undefined : value,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-semibold text-gray-900">Filters</span>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform ${
            showFilters ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {showFilters && (
        <div className="mt-4 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status || "all"}
              onChange={(e) => updateFilter("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-upi-blue focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <select
              value={filters.paymentMethod || "all"}
              onChange={(e) => updateFilter("paymentMethod", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-upi-blue focus:border-transparent"
            >
              <option value="all">All Methods</option>
              <option value="nfc">NFC</option>
              <option value="qr">QR Code</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={filters.dateRange || "all"}
              onChange={(e) => updateFilter("dateRange", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-upi-blue focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Needs Sync Filter */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.needsSync || false}
                onChange={(e) => updateFilter("needsSync", e.target.checked ? true : undefined)}
                className="w-4 h-4 text-upi-blue border-gray-300 rounded focus:ring-upi-blue"
              />
              <span className="text-sm text-gray-700">Pending Sync Only</span>
            </label>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => onFiltersChange({})}
            className="w-full text-sm text-upi-blue hover:underline"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

