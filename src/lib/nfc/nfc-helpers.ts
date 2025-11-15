/**
 * NFC Helper Functions
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - NFC Payment Flow
 *
 * Utilities for NFC data encoding/decoding and validation
 */

import type { NFCTagData } from "./nfc-manager";

/**
 * Format NFC data for display
 */
export function formatNfcDataForDisplay(data: NFCTagData): string {
  if (data.type === "payment") {
    return `Payment: ₹${(data.amount || 0) / 100} to ${data.merchantCode || data.upiId || "Merchant"}`;
  }
  return `Merchant: ${data.merchantCode || "Unknown"}`;
}

/**
 * Extract merchant information from NFC data
 */
export function extractMerchantInfo(data: NFCTagData): {
  merchantCode?: string;
  merchantId?: string;
  upiId?: string;
  name?: string;
} {
  return {
    merchantCode: data.merchantCode,
    merchantId: data.merchantId,
    upiId: data.upiId,
    name: data.merchantCode,
  };
}

/**
 * Validate payment amount from NFC
 */
export function validateNfcPaymentAmount(amount: number): {
  valid: boolean;
  error?: string;
} {
  if (amount <= 0) {
    return { valid: false, error: "Amount must be greater than zero" };
  }

  // NPCI limit: ₹1,000 (100,000 paise)
  if (amount > 100000) {
    return {
      valid: false,
      error: "Amount exceeds NPCI limit of ₹1,000",
    };
  }

  return { valid: true };
}

/**
 * Create NFC payment data structure
 */
export function createNfcPaymentData(params: {
  merchantCode: string;
  merchantId?: string;
  amount: number; // in paise
  description?: string;
  signature?: string;
}): NFCTagData {
  return {
    type: "payment",
    merchantCode: params.merchantCode,
    merchantId: params.merchantId,
    amount: params.amount,
    description: params.description,
    timestamp: new Date().toISOString(),
    signature: params.signature,
  };
}

/**
 * Create NFC merchant data structure
 */
export function createNfcMerchantData(params: {
  merchantCode: string;
  upiId: string;
  name?: string;
}): NFCTagData {
  return {
    type: "merchant",
    merchantCode: params.merchantCode,
    upiId: params.upiId,
    description: params.name,
    timestamp: new Date().toISOString(),
  };
}

