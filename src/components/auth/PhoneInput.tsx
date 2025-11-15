/**
 * Phone Input Component
 * Reusable phone number input with validation
 */

"use client";

import { useState } from "react";
import { validatePhoneNumber } from "@/lib/auth";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string;
  label?: string;
  placeholder?: string;
}

export function PhoneInput({
  value,
  onChange,
  onValidationChange,
  disabled = false,
  autoFocus = false,
  error: externalError,
  label = "Mobile Number",
  placeholder = "98765 43210",
}: PhoneInputProps) {
  const [internalError, setInternalError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Allow only digits, +, spaces, and hyphens
    if (/^[\d\s\-+]*$/.test(newValue)) {
      onChange(newValue);
      setInternalError("");

      // Validate on change
      if (newValue.length >= 10) {
        const validation = validatePhoneNumber(newValue);
        onValidationChange?.(validation.valid);
        if (!validation.valid) {
          setInternalError(validation.error || "");
        }
      } else {
        onValidationChange?.(false);
      }
    }
  };

  const displayError = externalError || internalError;

  return (
    <div>
      <label
        htmlFor="phone-input"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-500 font-medium">+91</span>
        </div>
        <input
          id="phone-input"
          type="tel"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-upi-blue focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={15}
          required
        />
      </div>
      {displayError && (
        <p className="mt-2 text-sm text-red-600 flex items-center">
          <svg
            className="w-4 h-4 mr-1 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {displayError}
        </p>
      )}
    </div>
  );
}
