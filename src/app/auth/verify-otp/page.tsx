/**
 * OTP Verification Page
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Authentication Flows
 *
 * OTP verification page for registration and login
 */

"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { formatPhoneForDisplay } from "@/lib/auth";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sendOTP, verifyOTP, canRequestOTP } = useAuth();

  const phone = searchParams.get("phone") || "";
  const isRegister = searchParams.get("register") === "true";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Send OTP on mount
  useEffect(() => {
    if (phone && !otpSent) {
      handleSendOTP();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleSendOTP = async () => {
    if (!phone) {
      router.push(isRegister ? "/auth/register" : "/auth/login");
      return;
    }

    setError("");
    setLoading(true);

    const result = await sendOTP(phone);

    if (!result.success) {
      setError(result.error || "Failed to send OTP");
      setLoading(false);
      return;
    }

    setOtpSent(true);
    setResendCountdown(60);
    setLoading(false);

    // Focus first input
    inputRefs.current[0]?.focus();
  };

  const handleOtpChange = (index: number, value: string) => {
    // Allow only digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    if (index === 5 && value) {
      const fullOtp = [...newOtp.slice(0, 5), value].join("");
      handleVerifyOTP(fullOtp);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    // Allow only 6-digit OTP
    if (!/^\d{6}$/.test(pastedData)) {
      return;
    }

    const digits = pastedData.split("");
    setOtp(digits);

    // Focus last input
    inputRefs.current[5]?.focus();

    // Auto-verify
    handleVerifyOTP(pastedData);
  };

  const handleVerifyOTP = async (otpValue?: string) => {
    const otpCode = otpValue || otp.join("");

    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setError("");
    setLoading(true);

    const result = await verifyOTP(phone, otpCode);

    if (!result.success) {
      setError(result.error || "Invalid OTP");
      setLoading(false);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      return;
    }

    // Success - redirect to onboarding or dashboard
    if (isRegister) {
      router.push("/onboarding");
    } else {
      router.push("/dashboard");
    }
  };

  const handleResendOTP = async () => {
    const rateLimit = canRequestOTP();
    if (!rateLimit.allowed) {
      setError(`Please wait ${rateLimit.waitSeconds} seconds`);
      return;
    }

    setOtp(["", "", "", "", "", ""]);
    await handleSendOTP();
  };

  if (!phone) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-upi-blue to-upi-green">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() =>
              router.push(isRegister ? "/auth/register" : "/auth/login")
            }
            className="absolute top-4 left-4 text-white hover:text-white/80 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg
              className="w-12 h-12 text-upi-green"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Verify Your Number
          </h1>
          <p className="text-white/80">
            We sent a code to{" "}
            <span className="font-semibold">
              {formatPhoneForDisplay(phone)}
            </span>
          </p>
        </div>

        {/* OTP Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyOTP();
            }}
            className="space-y-6"
          >
            {/* OTP Inputs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                Enter 6-Digit Code
              </label>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-upi-blue focus:ring-2 focus:ring-upi-blue/20 transition-all"
                    disabled={loading}
                  />
                ))}
              </div>
              {error && (
                <p className="mt-4 text-sm text-red-600 text-center flex items-center justify-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.some((d) => !d)}
              className="w-full bg-upi-green text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-3"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Verify & Continue"
              )}
            </button>
          </form>

          {/* Resend OTP */}
          <div className="mt-6 text-center">
            {resendCountdown > 0 ? (
              <p className="text-sm text-gray-600">
                Resend code in{" "}
                <span className="font-semibold text-upi-blue">
                  {resendCountdown}s
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-sm text-upi-blue hover:underline font-medium disabled:opacity-50"
              >
                Didn't receive code? Resend
              </button>
            )}
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center text-sm text-white/80">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Never share your OTP with anyone</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-upi-blue"></div>
        </div>
      }
    >
      <VerifyOTPContent />
    </Suspense>
  );
}
