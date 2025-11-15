/**
 * Dashboard Page
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Wallet Dashboard
 *
 * Main wallet dashboard with balance, transactions, and quick actions
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/auth/auth-context";
import { useWallet } from "@/lib/wallet";
import { LoadingSpinner } from "@/components/auth";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const {
    wallet,
    loading: walletLoading,
    balance,
    syncStatus,
    limits,
    isOnline,
    refreshWallet,
    syncWallet,
  } = useWallet();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Redirect to onboarding if no wallet
  useEffect(() => {
    if (!authLoading && !walletLoading && isAuthenticated && !wallet) {
      router.push("/onboarding");
    }
  }, [authLoading, walletLoading, isAuthenticated, wallet, router]);

  if (authLoading || walletLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!wallet) {
    return null; // Redirecting to onboarding
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-upi-blue to-upi-green text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">UPI Offline Pay</h1>
              <p className="text-white/80 text-sm">
                {user?.phone && `+${user.phone.slice(1, 3)} ${user.phone.slice(3, 8)} ${user.phone.slice(8)}`}
              </p>
            </div>
            <button
              onClick={() => router.push("/settings")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>

          {/* Online/Offline Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-green-400" : "bg-yellow-400"
              }`}
            />
            <span className="text-sm text-white/90">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Sync Warning */}
        {syncStatus.needsSync && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">
                  Wallet Needs Sync
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {syncStatus.pendingCount} pending transactions.{" "}
                  {syncStatus.exceededDeadline
                    ? "Sync deadline exceeded!"
                    : syncStatus.hoursUntilDeadline !== null &&
                      `${syncStatus.hoursUntilDeadline} hours until deadline.`}
                </p>
                {isOnline && (
                  <button
                    onClick={async () => {
                      const result = await syncWallet();
                      if (result.success) {
                        alert("Wallet synced successfully!");
                      } else {
                        alert(`Sync failed: ${result.error}`);
                      }
                    }}
                    className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
                  >
                    Sync Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-gray-600 font-medium">Wallet Balance</h2>
            <button
              onClick={refreshWallet}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh balance"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-5xl font-bold text-gray-900">{balance.formatted}</p>
            <p className="text-sm text-gray-500 mt-2">
              UPI ID: <span className="font-mono font-semibold">{wallet.upi_id}</span>
            </p>
          </div>

          {/* NPCI Limits */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-900 font-medium mb-2">NPCI UPI Lite Limits</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-blue-700">Max Balance</p>
                <p className="font-semibold text-blue-900">{limits.maxBalance.formatted}</p>
              </div>
              <div>
                <p className="text-blue-700">Max Per Transaction</p>
                <p className="font-semibold text-blue-900">{limits.maxTransaction.formatted}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/payment/nfc")}
            className="bg-gradient-to-br from-upi-orange to-orange-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <svg
              className="w-10 h-10 mb-3"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
            <h3 className="font-bold text-lg">Pay with NFC</h3>
            <p className="text-white/80 text-sm mt-1">Tap to pay offline</p>
          </button>

          <button
            onClick={() => router.push("/payment/qr")}
            className="bg-gradient-to-br from-upi-blue to-blue-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <svg
              className="w-10 h-10 mb-3"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2zM17 17h2v2h-2zM19 19h2v2h-2z" />
            </svg>
            <h3 className="font-bold text-lg">Scan QR</h3>
            <p className="text-white/80 text-sm mt-1">Pay via QR code</p>
          </button>

          <button
            onClick={() => router.push("/transactions")}
            className="bg-white border-2 border-gray-200 text-gray-900 p-6 rounded-2xl hover:border-upi-blue hover:bg-blue-50 transition-all"
          >
            <svg
              className="w-10 h-10 mb-3 text-upi-blue"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <h3 className="font-bold text-lg text-gray-900">History</h3>
            <p className="text-gray-600 text-sm mt-1">View transactions</p>
          </button>

          <button
            onClick={() => router.push("/wallet/topup")}
            className="bg-white border-2 border-gray-200 text-gray-900 p-6 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all"
          >
            <svg
              className="w-10 h-10 mb-3 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="font-bold text-lg text-gray-900">Add Money</h3>
            <p className="text-gray-600 text-sm mt-1">Top up wallet</p>
          </button>
        </div>

        {/* Features Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4">Features</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Offline Payments</h4>
                <p className="text-sm text-gray-600">
                  Pay even without internet using NFC
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">NPCI Compliant</h4>
                <p className="text-sm text-gray-600">
                  Follows UPI Lite specifications
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Auto Sync</h4>
                <p className="text-sm text-gray-600">
                  Transactions sync when online
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
