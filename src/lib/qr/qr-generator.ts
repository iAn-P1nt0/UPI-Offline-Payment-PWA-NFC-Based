/**
 * QR Code Generator
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - QR Code Payment Flow
 *
 * QR code generation for receiving payments
 */

import QRCode from "qrcode";

/**
 * Generate QR code for UPI payment
 * Format: UPI://pay?pa=<upi_id>&am=<amount>&cu=INR&tn=<description>
 */
export async function generateUpiQrCode(params: {
  upiId: string;
  amount?: number; // in paise
  description?: string;
  merchantName?: string;
}): Promise<string> {
  const { upiId, amount, description, merchantName } = params;

  // Build UPI payment string
  const upiString = buildUpiPaymentString({
    upiId,
    amount,
    description: description || merchantName,
  });

  // Generate QR code as data URL
  try {
    const qrDataUrl = await QRCode.toDataURL(upiString, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 400,
      margin: 2,
    });

    return qrDataUrl;
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Generate QR code for merchant payment request
 */
export async function generateMerchantQrCode(params: {
  merchantCode: string;
  merchantUpiId: string;
  amount: number; // in paise
  description?: string;
}): Promise<string> {
  return generateUpiQrCode({
    upiId: params.merchantUpiId,
    amount: params.amount,
    description: params.description || `Payment to ${params.merchantCode}`,
    merchantName: params.merchantCode,
  });
}

/**
 * Build UPI payment string
 */
export function buildUpiPaymentString(params: {
  upiId: string;
  amount?: number; // in paise
  description?: string;
}): string {
  const { upiId, amount, description } = params;

  const url = new URL("UPI://pay");
  url.searchParams.set("pa", upiId);
  url.searchParams.set("cu", "INR");

  if (amount) {
    // Convert paise to rupees
    const rupees = (amount / 100).toFixed(2);
    url.searchParams.set("am", rupees);
  }

  if (description) {
    url.searchParams.set("tn", description);
  }

  return url.toString();
}

/**
 * Generate QR code as SVG
 */
export async function generateUpiQrCodeSvg(params: {
  upiId: string;
  amount?: number;
  description?: string;
}): Promise<string> {
  const upiString = buildUpiPaymentString(params);

  try {
    const qrSvg = await QRCode.toString(upiString, {
      type: "svg",
      errorCorrectionLevel: "M",
      width: 400,
      margin: 2,
    });

    return qrSvg;
  } catch (error) {
    console.error("Failed to generate QR code SVG:", error);
    throw new Error("Failed to generate QR code");
  }
}

