/**
 * QR Code Parser
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - QR Code Payment Flow
 *
 * Parse UPI payment strings from QR codes
 */

/**
 * Parsed UPI Payment Data
 */
export interface ParsedUpiPayment {
  upiId: string;
  amount?: number; // in paise
  description?: string;
  merchantName?: string;
  currency?: string;
  valid: boolean;
  error?: string;
}

/**
 * Parse UPI payment string
 * Format: UPI://pay?pa=<upi_id>&am=<amount>&cu=INR&tn=<description>
 */
export function parseUpiPaymentString(qrData: string): ParsedUpiPayment {
  try {
    // Check if it's a UPI payment string
    if (!qrData.startsWith("UPI://") && !qrData.startsWith("upi://")) {
      return {
        upiId: "",
        valid: false,
        error: "Not a valid UPI payment QR code",
      };
    }

    const url = new URL(qrData);
    const params = new URLSearchParams(url.search);

    const upiId = params.get("pa");
    if (!upiId) {
      return {
        upiId: "",
        valid: false,
        error: "UPI ID not found in QR code",
      };
    }

    // Parse amount (in rupees, convert to paise)
    const amountStr = params.get("am");
    let amount: number | undefined;
    if (amountStr) {
      const rupees = parseFloat(amountStr);
      if (!isNaN(rupees) && rupees > 0) {
        amount = Math.round(rupees * 100); // Convert to paise
      }
    }

    // Parse description
    const description = params.get("tn") || params.get("description") || undefined;

    // Parse merchant name
    const merchantName = params.get("merchant") || params.get("pn") || undefined;

    // Parse currency
    const currency = params.get("cu") || "INR";

    return {
      upiId,
      amount,
      description,
      merchantName,
      currency,
      valid: true,
    };
  } catch (error: any) {
    return {
      upiId: "",
      valid: false,
      error: error.message || "Failed to parse QR code",
    };
  }
}

/**
 * Validate parsed UPI payment data
 */
export function validateParsedPayment(data: ParsedUpiPayment): {
  valid: boolean;
  error?: string;
} {
  if (!data.valid) {
    return {
      valid: false,
      error: data.error || "Invalid payment data",
    };
  }

  if (!data.upiId) {
    return {
      valid: false,
      error: "UPI ID is required",
    };
  }

  // Validate UPI ID format
  if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(data.upiId)) {
    return {
      valid: false,
      error: "Invalid UPI ID format",
    };
  }

  // Validate amount if present
  if (data.amount !== undefined) {
    if (data.amount <= 0) {
      return {
        valid: false,
        error: "Amount must be greater than zero",
      };
    }

    // NPCI limit: ₹1,000 (100,000 paise)
    if (data.amount > 100000) {
      return {
        valid: false,
        error: "Amount exceeds NPCI limit of ₹1,000",
      };
    }
  }

  return { valid: true };
}

