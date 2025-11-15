/**
 * QR Code Display Component
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - QR Code Payment Flow
 *
 * Component to display QR code for receiving payments
 */

"use client";

import { useState, useEffect } from "react";
import { generateUpiQrCode } from "@/lib/qr";

interface QrDisplayProps {
  upiId: string;
  amount?: number; // in paise
  description?: string;
  className?: string;
}

export function QrDisplay({
  upiId,
  amount,
  description,
  className = "",
}: QrDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const generateQr = async () => {
      setLoading(true);
      setError("");

      try {
        const qrCode = await generateUpiQrCode({
          upiId,
          amount,
          description,
        });
        setQrDataUrl(qrCode);
      } catch (err: any) {
        setError(err.message || "Failed to generate QR code");
      } finally {
        setLoading(false);
      }
    };

    if (upiId) {
      generateQr();
    }
  }, [upiId, amount, description]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-upi-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Generating QR code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  if (!qrDataUrl) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <img
          src={qrDataUrl}
          alt="UPI Payment QR Code"
          className="w-64 h-64"
        />
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 mb-1">Scan to pay</p>
        <p className="font-semibold text-gray-900">{upiId}</p>
        {amount && (
          <p className="text-lg font-bold text-upi-blue mt-2">
            ₹{(amount / 100).toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}

