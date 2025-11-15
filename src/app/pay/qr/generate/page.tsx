/**
 * QR Generate Page
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - QR Code Payment Flow
 *
 * QR code display for receiving payments
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/auth/auth-context";
import { useWallet } from "@/hooks/useWallet";
import { QrDisplay } from "@/components/payment/QrDisplay";
import { LoadingSpinner } from "@/components/auth";
import { currency } from "@/lib/db/helpers";

export default function QrGeneratePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const { wallet, loading: walletLoading } = useWallet();

  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");

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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and one decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const amountInPaise = amount ? Math.round(parseFloat(amount) * 100) : undefined;

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
      <div className="max-w-md mx-auto">
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
          <h1 className="text-3xl font-bold text-gray-900">Receive Payment</h1>
          <p className="text-gray-600 mt-2">Share your QR code to receive money</p>
        </div>

        {/* QR Code Display */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <QrDisplay
            upiId={wallet.upi_id || ""}
            amount={amountInPaise}
            description={description || undefined}
          />
        </div>

        {/* Amount Input (Optional) */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-upi-blue focus:border-transparent"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Leave empty for any amount payment request
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Payment description"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-upi-blue focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How to receive payment</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Share this QR code with the payer</li>
            <li>They scan it with their UPI app</li>
            <li>Payment will be received in your wallet</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

