/**
 * QR Scanner Component
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - QR Code Payment Flow
 *
 * Reusable QR scanner component
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { createQrScanner, isCameraAvailable, requestCameraPermission } from "@/lib/qr";

interface QrScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function QrScanner({ onScan, onError, className = "" }: QrScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerInstanceRef = useRef<ReturnType<typeof createQrScanner> | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [cameraAvailable, setCameraAvailable] = useState(false);

  useEffect(() => {
    // Check camera availability
    isCameraAvailable().then(setCameraAvailable);

    return () => {
      // Cleanup on unmount
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    if (!scannerRef.current) {
      return;
    }

    // Request camera permission
    const permission = await requestCameraPermission();
    if (!permission.granted) {
      const errMsg = permission.error || "Camera permission denied";
      setError(errMsg);
      onError?.(errMsg);
      return;
    }

    // Create unique ID for scanner element
    const scannerId = `qr-scanner-${Date.now()}`;
    scannerRef.current.innerHTML = `<div id="${scannerId}"></div>`;

    try {
      const scanner = createQrScanner(scannerId);
      scannerInstanceRef.current = scanner;

      await scanner.start(
        (data) => {
          onScan(data);
          // Stop after successful scan
          scanner.stop().catch(console.error);
          setScanning(false);
        },
        (err) => {
          // Ignore common scanning errors
          if (err !== "NotFoundException") {
            setError(err);
            onError?.(err);
          }
        }
      );

      setScanning(true);
      setError("");
    } catch (err: any) {
      const errMsg = err.message || "Failed to start QR scanner";
      setError(errMsg);
      onError?.(errMsg);
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerInstanceRef.current) {
      await scannerInstanceRef.current.stop();
      scannerInstanceRef.current = null;
      setScanning(false);
    }
  };

  if (!cameraAvailable) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <p className="text-yellow-800 text-sm">No camera available on this device</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={scannerRef} className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden"></div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {!scanning ? (
          <button
            onClick={startScanning}
            className="flex-1 bg-upi-blue text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-all"
          >
            Start Scanning
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-600 transition-all"
          >
            Stop Scanning
          </button>
        )}
      </div>
    </div>
  );
}

