/**
 * Onboarding Page
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Wallet Setup
 *
 * Wallet creation and UPI ID setup page
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

type OnboardingStep = "welcome" | "upi-setup" | "creating" | "success";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();

  const [step, setStep] = useState<OnboardingStep>("welcome");
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
    setStep("creating");

    try {
      // Validate and check availability
      const isAvailable = await handleCheckAvailability(upiId);
      if (!isAvailable) {
        setStep("upi-setup");
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
        setStep("upi-setup");
        setLoading(false);
        return;
      }

      setStep("success");

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      console.error("Error creating wallet:", err);
      setError("Something went wrong. Please try again.");
      setStep("upi-setup");
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
        {/* Welcome Step */}
        {step === "welcome" && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-upi-orange to-upi-blue rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-14 h-14 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Welcome to UPI Offline Pay!
            </h1>
            <p className="text-gray-600 mb-6">
              Let's set up your wallet in just a few steps
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 text-left">
                <div className="w-8 h-8 bg-upi-green rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Create UPI ID</h3>
                  <p className="text-sm text-gray-600">
                    Get your unique payment address
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-left">
                <div className="w-8 h-8 bg-upi-green rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Activate Wallet
                  </h3>
                  <p className="text-sm text-gray-600">
                    NPCI-compliant ₹5,000 limit
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-left">
                <div className="w-8 h-8 bg-upi-green rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Pay Offline
                  </h3>
                  <p className="text-sm text-gray-600">
                    Use NFC or QR even without internet
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep("upi-setup")}
              className="w-full bg-upi-orange text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 transition-all"
            >
              Get Started
            </button>
          </div>
        )}

        {/* UPI Setup Step */}
        {step === "upi-setup" && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Create Your UPI ID
            </h2>
            <p className="text-gray-600 mb-6">
              This will be your unique payment address
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
              {checking ? "Checking availability..." : "Create Wallet"}
            </button>
          </div>
        )}

        {/* Creating Step */}
        {step === "creating" && (
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
            <LoadingSpinner size="lg" />
            <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-2">
              Creating Your Wallet
            </h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        )}

        {/* Success Step */}
        {step === "success" && (
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-14 h-14 text-green-600"
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Wallet Created!
            </h2>
            <p className="text-gray-600 mb-4">
              Your UPI ID: <span className="font-semibold text-upi-blue">{upiId}</span>
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
