/**
 * NFC Payment Page
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - NFC Payment Flow
 *
 * NFC payment UI with tap-to-pay flow
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/auth/auth-context";
import { useWallet } from "@/hooks/useWallet";
import { NfcPaymentButton } from "@/components/payment/NfcPaymentButton";
import {
  readNfcTag,
  validateNfcPaymentAmount,
  extractMerchantInfo,
  type NFCTagData,
} from "@/lib/nfc";
import { createOfflineTransaction } from "@/lib/db/transaction-queue";
import { getCachedMerchantByCode } from "@/lib/db/merchant-cache";
import { LoadingSpinner } from "@/components/auth";
import { currency, NPCI_LIMITS } from "@/lib/db/helpers";

export default function NfcPaymentPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const { wallet, loading: walletLoading, balance } = useWallet();

  const [nfcData, setNfcData] = useState<NFCTagData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

  const handleNfcRead = async (data: NFCTagData) => {
    setNfcData(data);
    setError("");

    // Validate amount
    if (!data.amount) {
      setError("No amount found in NFC tag");
      return;
    }

    const amountValidation = validateNfcPaymentAmount(data.amount);
    if (!amountValidation.valid) {
      setError(amountValidation.error || "Invalid amount");
      return;
    }

    // Check balance
    if (balance.paise < data.amount) {
      setError("Insufficient balance");
      return;
    }
  };

  const handleConfirmPayment = async () => {
    if (!wallet || !nfcData || !nfcData.amount) {
      return;
    }

    setProcessing(true);
    setError("");

    try {
      // Get merchant info
      let merchantId: string | null = null;
      if (nfcData.merchantCode) {
        const merchant = await getCachedMerchantByCode(nfcData.merchantCode);
        merchantId = merchant?.id || null;
      }

      // Create offline transaction
      const result = await createOfflineTransaction({
        senderWalletId: wallet.id,
        receiverWalletId: null, // Will be resolved during sync
        merchantId,
        amountPaise: nfcData.amount,
        description: nfcData.description || `NFC payment to ${nfcData.merchantCode || "merchant"}`,
        transactionType: "payment",
        paymentMethod: "nfc",
        nfcTagId: nfcData.merchantCode,
        nfcSignature: nfcData.signature,
        deviceId: user?.id,
        deviceFingerprint: user?.id, // Simplified for now
      });

      if (!result.success) {
        setError(result.error || "Failed to create transaction");
        setProcessing(false);
        return;
      }

      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("Error processing NFC payment:", err);
      setError(err.message || "Failed to process payment");
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    setNfcData(null);
    setError("");
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
          <h1 className="text-3xl font-bold text-gray-900">NFC Payment</h1>
          <p className="text-gray-600 mt-2">Tap your device to the NFC tag</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
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
              <div>
                <p className="font-semibold text-green-900">Payment Successful!</p>
                <p className="text-sm text-green-700">Redirecting to dashboard...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Payment Details */}
        {nfcData && nfcData.amount && !success && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Details</h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Merchant</span>
                <span className="font-semibold">
                  {nfcData.merchantCode || "Unknown"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-bold text-xl text-upi-blue">
                  {currency.format(nfcData.amount)}
                </span>
              </div>
              {nfcData.description && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Description</span>
                  <span className="text-gray-900">{nfcData.description}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Balance</span>
                <span className="font-semibold">{balance.formatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">After Payment</span>
                <span className="font-semibold text-green-600">
                  {currency.format(balance.paise - nfcData.amount)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCancel}
                disabled={processing}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={processing}
                className="flex-1 bg-upi-green text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        )}

        {/* NFC Read Button */}
        {!nfcData && !success && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <NfcPaymentButton
              onPaymentRead={handleNfcRead}
              onError={(err) => setError(err)}
              disabled={processing}
            />
          </div>
        )}

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How to pay with NFC</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Tap the "Tap to Pay" button above</li>
            <li>Hold your device near the NFC tag</li>
            <li>Review the payment details</li>
            <li>Confirm the payment</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

