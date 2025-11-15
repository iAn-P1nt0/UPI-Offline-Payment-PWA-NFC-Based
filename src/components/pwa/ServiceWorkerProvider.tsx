/**
 * Service Worker Provider Component
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - PWA Configuration
 *
 * Registers service worker on app load
 */

"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/service-worker-registration";

export function ServiceWorkerProvider() {
  useEffect(() => {
    // Register service worker
    registerServiceWorker().catch(console.error);

    // Listen for service worker messages
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SYNC_TRANSACTIONS") {
          // Trigger sync from client
          // This will be handled by the sync hook
          window.dispatchEvent(new CustomEvent("sw-sync-request"));
        }
      });
    }
  }, []);

  return null;
}

