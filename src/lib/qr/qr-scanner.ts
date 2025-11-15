/**
 * QR Code Scanner
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - QR Code Payment Flow
 *
 * QR code scanning using html5-qrcode
 */

import { Html5Qrcode } from "html5-qrcode";

/**
 * QR Scanner Interface
 */
export interface QRScanner {
  start: (onSuccess: (data: string) => void, onError?: (error: string) => void) => Promise<void>;
  stop: () => Promise<void>;
  isScanning: () => boolean;
}

/**
 * Create QR scanner instance
 */
export function createQrScanner(elementId: string): QRScanner {
  let scanner: Html5Qrcode | null = null;
  let scanning = false;

  const start = async (
    onSuccess: (data: string) => void,
    onError?: (error: string) => void
  ): Promise<void> => {
    if (scanning && scanner) {
      return;
    }

    try {
      scanner = new Html5Qrcode(elementId);

      await scanner.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          onSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore common scanning errors
          if (errorMessage !== "NotFoundException") {
            onError?.(errorMessage);
          }
        }
      );

      scanning = true;
    } catch (error: any) {
      scanning = false;
      const errorMsg = error.message || "Failed to start QR scanner";
      onError?.(errorMsg);
      throw error;
    }
  };

  const stop = async (): Promise<void> => {
    if (!scanner || !scanning) {
      return;
    }

    try {
      await scanner.stop();
      await scanner.clear();
      scanning = false;
    } catch (error) {
      console.error("Error stopping QR scanner:", error);
      scanning = false;
    }
  };

  const isScanning = (): boolean => {
    return scanning;
  };

  return {
    start,
    stop,
    isScanning,
  };
}

/**
 * Check if camera is available
 */
export async function isCameraAvailable(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === "videoinput");
  } catch (error) {
    return false;
  }
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<{
  granted: boolean;
  error?: string;
}> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return { granted: true };
  } catch (error: any) {
    if (error.name === "NotAllowedError") {
      return {
        granted: false,
        error: "Camera permission denied. Please enable camera access in your browser settings.",
      };
    }
    if (error.name === "NotFoundError") {
      return {
        granted: false,
        error: "No camera found on this device",
      };
    }
    return {
      granted: false,
      error: error.message || "Failed to access camera",
    };
  }
}

