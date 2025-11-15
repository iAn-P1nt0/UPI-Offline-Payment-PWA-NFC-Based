/**
 * Link UPI ID Page
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Wallet Management
 *
 * Page for linking/updating UPI ID for existing wallet
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/auth/auth-context";
import { useWallet } from "@/hooks/useWallet";
import {
  validateUpiId,
  checkUpiIdAvailability,
} from "@/lib/wallet";
import { LoadingSpinner } from "@/components/auth";

export default function LinkUpiPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const { wallet, loading: walletLoading } = useWallet();

  const [newUpiId, setNewUpiId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

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

  const handleCheckAvailability = async (upiIdToCheck: string) => {
    setChecking(true);
    setError("");

    // Validate format
    const validation = validateUpiId(upiIdToCheck);
    if (!validation.valid) {
      setError(validation.error || "Invalid UPI ID");
      setChecking(false);
      return false;
    }

    // Check availability (skip if same as current)
    if (wallet && upiIdToCheck.toLowerCase() === wallet.upi_id?.toLowerCase()) {
      setError("This is already your current UPI ID");
      setChecking(false);
      return false;
    }

    // Check availability
    const availability = await checkUpiIdAvailability(upiIdToCheck);
    if (!availability.available) {
      setError("This UPI ID is already taken");
      setChecking(false);
      return false;
    }

    setChecking(false);
    return true;
  };

  const handleUpdateUpiId = async () => {
    if (!wallet || !user) return;

    setLoading(true);
    setError("");

    try {
      // Validate and check availability
      const isAvailable = await handleCheckAvailability(newUpiId);
      if (!isAvailable) {
        setLoading(false);
        return;
      }

      // Update UPI ID via API
      const response = await fetch("/api/wallet", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          upi_id: newUpiId.toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update UPI ID");
        setLoading(false);
        return;
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Error updating UPI ID:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-upi-blue to-upi-green">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Link UPI ID
          </h2>
          <p className="text-gray-600 mb-6">
            Update your payment address
          </p>

          {/* Current UPI ID */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current UPI ID
            </label>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <p className="text-lg font-semibold text-gray-900 text-center">
                {wallet.upi_id || "Not set"}
              </p>
            </div>
          </div>

          {/* New UPI ID Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New UPI ID
            </label>
            <input
              type="text"
              value={newUpiId}
              onChange={(e) => {
                setNewUpiId(e.target.value);
                setError("");
              }}
              placeholder="yourname@upi"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-upi-blue focus:border-transparent"
              disabled={loading || checking}
            />
            <p className="mt-2 text-xs text-gray-500">
              Enter a new UPI ID to replace your current one
            </p>
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600 flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateUpiId}
              disabled={loading || checking || !newUpiId}
              className="flex-1 bg-upi-blue text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {checking
                ? "Checking..."
                : loading
                ? "Updating..."
                : "Update UPI ID"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

