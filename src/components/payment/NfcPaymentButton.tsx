/**
 * NFC Payment Button Component
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - NFC Payment Flow
 *
 * Reusable NFC payment button with tap-to-pay functionality
 */

"use client";

import { useState } from "react";
import {
  readNfcTag,
  isNfcSupported,
  requestNfcPermission,
  type NFCTagData,
} from "@/lib/nfc";
import { NfcStatusIndicator } from "./NfcStatusIndicator";

interface NfcPaymentButtonProps {
  onPaymentRead: (data: NFCTagData) => void | Promise<void>;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function NfcPaymentButton({
  onPaymentRead,
  onError,
  disabled = false,
  className = "",
}: NfcPaymentButtonProps) {
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");

  const handleNfcRead = async () => {
    if (!isNfcSupported()) {
      const errMsg = "NFC is not supported on this device";
      setError(errMsg);
      onError?.(errMsg);
      return;
    }

    // Request permission
    const permission = await requestNfcPermission();
    if (!permission.granted) {
      const errMsg = permission.error || "NFC permission denied";
      setError(errMsg);
      onError?.(errMsg);
      return;
    }

    setReading(true);
    setError("");

    try {
      const result = await readNfcTag();

      if (!result.success) {
        const errMsg = result.error || "Failed to read NFC tag";
        setError(errMsg);
        onError?.(errMsg);
        setReading(false);
        return;
      }

      if (!result.data) {
        const errMsg = "No data found in NFC tag";
        setError(errMsg);
        onError?.(errMsg);
        setReading(false);
        return;
      }

      // Validate payment data
      if (result.data.type !== "payment") {
        const errMsg = "NFC tag does not contain payment data";
        setError(errMsg);
        onError?.(errMsg);
        setReading(false);
        return;
      }

      // Call callback
      await onPaymentRead(result.data);
      setReading(false);
    } catch (err: any) {
      const errMsg = err.message || "An error occurred while reading NFC tag";
      setError(errMsg);
      onError?.(errMsg);
      setReading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleNfcRead}
        disabled={disabled || reading || !isNfcSupported()}
        className="w-full bg-gradient-to-br from-upi-orange to-orange-600 text-white py-4 px-6 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {reading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Reading NFC tag...</span>
          </>
        ) : (
          <>
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
            <span>Tap to Pay with NFC</span>
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
      )}

      <div className="mt-2">
        <NfcStatusIndicator />
      </div>
    </div>
  );
}

