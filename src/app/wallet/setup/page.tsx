/**
 * Wallet Setup Page
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Wallet Setup
 *
 * Wallet initialization page for new users
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/auth/auth-context";
import {
  validateUpiId,
  generateUpiIdFromPhone,
  checkUpiIdAvailability,
  createWallet,
} from "@/lib/wallet";
import { LoadingSpinner } from "@/components/auth";

export default function WalletSetupPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();

  const [upiId, setUpiId] = useState("");
  const [usePhoneBased, setUsePhoneBased] = useState(true);
  const [customUsername, setCustomUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  // Generate phone-based UPI ID on mount
  useEffect(() => {
    if (user?.phone && usePhoneBased) {
      const phoneUpi = generateUpiIdFromPhone(user.phone);
      setUpiId(phoneUpi);
    }
  }, [user, usePhoneBased]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [authLoading, isAuthenticated, router]);

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

  const handleCreateWallet = async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      // Validate and check availability
      const isAvailable = await handleCheckAvailability(upiId);
      if (!isAvailable) {
        setLoading(false);
        return;
      }

      // Create wallet
      const result = await createWallet({
        userId: user.id,
        upiId,
      });

      if (!result.success) {
        setError(result.error || "Failed to create wallet");
        setLoading(false);
        return;
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Error creating wallet:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleCustomUpiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomUsername(value);
    setUpiId(`${value.toLowerCase()}@upi`);
    setError("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-upi-blue to-upi-green">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Create Your Wallet
          </h2>
          <p className="text-gray-600 mb-6">
            Set up your UPI ID to start making payments
          </p>

          {/* Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setUsePhoneBased(true);
                if (user?.phone) {
                  setUpiId(generateUpiIdFromPhone(user.phone));
                }
                setError("");
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                usePhoneBased
                  ? "bg-upi-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Use Phone
            </button>
            <button
              onClick={() => {
                setUsePhoneBased(false);
                setUpiId("");
                setCustomUsername("");
                setError("");
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                !usePhoneBased
                  ? "bg-upi-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Custom
            </button>
          </div>

          {/* UPI ID Input */}
          {usePhoneBased ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your UPI ID
              </label>
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                <p className="text-2xl font-bold text-upi-blue text-center">
                  {upiId || "Loading..."}
                </p>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Based on your phone number
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Username
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customUsername}
                  onChange={handleCustomUpiChange}
                  placeholder="yourname"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-upi-blue focus:border-transparent"
                  disabled={loading || checking}
                />
                <span className="text-gray-600 font-medium">@upi</span>
              </div>
              {upiId && (
                <p className="mt-2 text-sm text-gray-600">
                  Your UPI ID: <span className="font-semibold">{upiId}</span>
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 flex items-center">
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

          <button
            onClick={handleCreateWallet}
            disabled={loading || checking || !upiId}
            className="w-full mt-6 bg-upi-green text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {checking
              ? "Checking availability..."
              : loading
              ? "Creating wallet..."
              : "Create Wallet"}
          </button>
        </div>
      </div>
    </div>
  );
}

