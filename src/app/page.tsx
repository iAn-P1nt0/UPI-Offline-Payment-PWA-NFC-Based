/**
 * Home Page - UPI Offline Payment PWA
 * Phase 1: MVP Foundations
 *
 * Landing page with authentication redirect logic
 * Reference: CLAUDE.md - Phase 1 MVP Foundations
 */

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 upi-gradient">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white">
            UPI Offline Pay
          </h1>
          <p className="text-xl text-white/90">
            Secure payments, even without internet
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <svg
                className="w-6 h-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-gray-700">NFC Tap-to-Pay</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <svg
                className="w-6 h-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-gray-700">QR Code Payments</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <svg
                className="w-6 h-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-gray-700">Works Offline</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <svg
                className="w-6 h-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-gray-700">NPCI Compliant</span>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <a
              href="/auth/login"
              className="block w-full bg-upi-blue text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 transition"
            >
              Login
            </a>
            <a
              href="/auth/register"
              className="block w-full bg-white text-upi-blue border-2 border-upi-blue py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Create Account
            </a>
          </div>
        </div>

        <p className="text-white/80 text-sm">
          Secure • Private • Offline-First
        </p>
      </div>
    </main>
  );
}
