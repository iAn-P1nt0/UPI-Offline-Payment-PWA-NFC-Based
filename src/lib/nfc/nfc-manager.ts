/**
 * NFC Manager
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - NFC Payment Flow
 *
 * Web NFC API wrapper with error handling and permission management
 */

/**
 * Check if NFC is supported on this device
 */
export function isNfcSupported(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return "NDEFReader" in window;
}

/**
 * Check if NFC is available (supported and permission granted)
 */
export async function isNfcAvailable(): Promise<boolean> {
  if (!isNfcSupported()) {
    return false;
  }

  try {
    // Try to create an NDEFReader to check permissions
    const reader = new (window as any).NDEFReader();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Request NFC permission
 */
export async function requestNfcPermission(): Promise<{
  granted: boolean;
  error?: string;
}> {
  if (!isNfcSupported()) {
    return {
      granted: false,
      error: "NFC is not supported on this device",
    };
  }

  try {
    const reader = new (window as any).NDEFReader();
    // Attempt to scan to trigger permission prompt
    await reader.scan();
    return { granted: true };
  } catch (error: any) {
    if (error.name === "NotAllowedError") {
      return {
        granted: false,
        error: "NFC permission denied. Please enable NFC in your device settings.",
      };
    }
    if (error.name === "NotSupportedError") {
      return {
        granted: false,
        error: "NFC is not supported on this device",
      };
    }
    return {
      granted: false,
      error: error.message || "Failed to request NFC permission",
    };
  }
}

/**
 * Read NFC tag
 */
export async function readNfcTag(): Promise<{
  success: boolean;
  data?: NFCTagData;
  error?: string;
}> {
  if (!isNfcSupported()) {
    return {
      success: false,
      error: "NFC is not supported on this device",
    };
  }

  try {
    const reader = new (window as any).NDEFReader();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        reader.abort();
        resolve({
          success: false,
          error: "NFC read timeout. Please try again.",
        });
      }, 30000); // 30 second timeout

      reader.addEventListener("reading", (event: any) => {
        clearTimeout(timeout);
        try {
          const data = parseNfcData(event.message);
          resolve({
            success: true,
            data,
          });
        } catch (error: any) {
          resolve({
            success: false,
            error: error.message || "Failed to parse NFC data",
          });
        }
      });

      reader.addEventListener("error", (event: any) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: event.message || "Failed to read NFC tag",
        });
      });

      reader.scan().catch((error: any) => {
        clearTimeout(timeout);
        if (error.name === "NotAllowedError") {
          resolve({
            success: false,
            error: "NFC permission denied",
          });
        } else {
          resolve({
            success: false,
            error: error.message || "Failed to start NFC scan",
          });
        }
      });
    });
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to initialize NFC reader",
    };
  }
}

/**
 * Write NFC tag (for merchant mode)
 */
export async function writeNfcTag(data: NFCTagData): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isNfcSupported()) {
    return {
      success: false,
      error: "NFC is not supported on this device",
    };
  }

  try {
    const reader = new (window as any).NDEFReader();
    const message = encodeNfcData(data);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        reader.abort();
        resolve({
          success: false,
          error: "NFC write timeout. Please try again.",
        });
      }, 30000);

      reader.addEventListener("write", () => {
        clearTimeout(timeout);
        resolve({ success: true });
      });

      reader.addEventListener("error", (event: any) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: event.message || "Failed to write NFC tag",
        });
      });

      reader.write(message).catch((error: any) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: error.message || "Failed to write NFC tag",
        });
      });
    });
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to initialize NFC writer",
    };
  }
}

/**
 * NFC Tag Data Interface
 */
export interface NFCTagData {
  type: "payment" | "merchant";
  merchantCode?: string;
  merchantId?: string;
  upiId?: string;
  amount?: number; // in paise
  description?: string;
  timestamp?: string;
  signature?: string;
}

/**
 * Parse NFC data from NDEF message
 */
function parseNfcData(message: any): NFCTagData {
  if (!message.records || message.records.length === 0) {
    throw new Error("No records found in NFC tag");
  }

  // Get text record
  const textRecord = message.records.find(
    (record: any) => record.recordType === "text"
  );

  if (!textRecord) {
    throw new Error("No text record found in NFC tag");
  }

  // Decode text
  const decoder = new TextDecoder();
  const text = decoder.decode(textRecord.data);

  // Parse JSON
  try {
    const data = JSON.parse(text);
    return validateNfcData(data);
  } catch (error) {
    // Try parsing as UPI payment string
    return parseUpiPaymentString(text);
  }
}

/**
 * Encode NFC data to NDEF message
 */
function encodeNfcData(data: NFCTagData): any {
  const validated = validateNfcData(data);
  const json = JSON.stringify(validated);
  const encoder = new TextEncoder();

  return {
    records: [
      {
        recordType: "text",
        data: encoder.encode(json),
      },
    ],
  };
}

/**
 * Validate NFC data structure
 */
function validateNfcData(data: any): NFCTagData {
  if (!data.type || !["payment", "merchant"].includes(data.type)) {
    throw new Error("Invalid NFC data type");
  }

  if (data.type === "payment") {
    if (!data.merchantCode && !data.merchantId) {
      throw new Error("Merchant code or ID is required for payment");
    }
    if (!data.amount || data.amount <= 0) {
      throw new Error("Valid amount is required for payment");
    }
  }

  if (data.type === "merchant") {
    if (!data.merchantCode) {
      throw new Error("Merchant code is required for merchant tag");
    }
    if (!data.upiId) {
      throw new Error("UPI ID is required for merchant tag");
    }
  }

  return {
    type: data.type,
    merchantCode: data.merchantCode,
    merchantId: data.merchantId,
    upiId: data.upiId,
    amount: data.amount,
    description: data.description,
    timestamp: data.timestamp || new Date().toISOString(),
    signature: data.signature,
  };
}

/**
 * Parse UPI payment string format
 * Format: UPI://pay?pa=<upi_id>&am=<amount>&cu=INR&tn=<description>
 */
function parseUpiPaymentString(text: string): NFCTagData {
  if (!text.startsWith("UPI://")) {
    throw new Error("Invalid UPI payment string format");
  }

  const url = new URL(text);
  const params = new URLSearchParams(url.search);

  const upiId = params.get("pa");
  const amountStr = params.get("am");
  const description = params.get("tn") || params.get("description");

  if (!upiId) {
    throw new Error("UPI ID not found in payment string");
  }

  const amount = amountStr ? parseFloat(amountStr) * 100 : undefined; // Convert to paise

  return {
    type: "payment",
    upiId,
    amount,
    description: description || undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate NFC signature for transaction
 */
export function generateNfcSignature(
  merchantCode: string,
  amount: number,
  timestamp: string,
  secret?: string
): string {
  // Simple hash (in production, use proper cryptographic signing)
  const data = `${merchantCode}:${amount}:${timestamp}${secret ? `:${secret}` : ""}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `nfc_${Math.abs(hash).toString(16)}`;
}

/**
 * Verify NFC signature
 */
export function verifyNfcSignature(
  signature: string,
  merchantCode: string,
  amount: number,
  timestamp: string,
  secret?: string
): boolean {
  const expected = generateNfcSignature(merchantCode, amount, timestamp, secret);
  return signature === expected;
}

