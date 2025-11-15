import {
  validatePhoneNumber,
  formatPhoneForDisplay,
  isSessionExpired,
  getSessionExpiryTime,
} from "@/lib/auth/auth-helpers";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("auth-helpers", () => {
  describe("validatePhoneNumber", () => {
    it("accepts valid Indian numbers and applies +91 prefix", () => {
      const result = validatePhoneNumber("9876543210");
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe("+919876543210");
    });

    it("rejects invalid Indian numbers", () => {
      const result = validatePhoneNumber("12345");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/valid Indian mobile number/i);
    });

    it("validates international numbers when country is INTL", () => {
      const result = validatePhoneNumber("+15551234567", "INTL");
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe("+15551234567");
    });
  });

  describe("formatPhoneForDisplay", () => {
    it("formats +91 numbers with spacing", () => {
      expect(formatPhoneForDisplay("+919876543210")).toBe("+91 98765 43210");
    });

    it("returns other formats unchanged", () => {
      expect(formatPhoneForDisplay("+15551234567")).toBe("+15551234567");
    });
  });

  describe("session helpers", () => {
    const realDateNow = Date.now;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-11-15T10:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
      Date.now = realDateNow;
    });

    it("detects when a session is about to expire", () => {
      const thirtySecondsFromNow = Math.floor((Date.now() + 30 * 1000) / 1000);
      expect(isSessionExpired(thirtySecondsFromNow)).toBe(true);
    });

    it("provides human readable expiry when session is active", () => {
      const later = Math.floor((Date.now() + 90 * 60 * 1000) / 1000); // 1h30m
      expect(getSessionExpiryTime(later)).toBe("1h 30m");
    });
  });
});
