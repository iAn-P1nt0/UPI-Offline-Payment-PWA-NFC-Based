# Authentication Guide - UPI Offline Payment PWA

## Overview

This document explains the authentication system for the UPI Offline Payment PWA, including phone-based OTP authentication, session management, and protected routes.

---

## Architecture

### Authentication Flow

```
1. User enters phone number
   ↓
2. Supabase sends OTP via SMS
   ↓
3. User enters 6-digit OTP
   ↓
4. Supabase verifies OTP and creates session
   ↓
5. Device fingerprint registered
   ↓
6. Wallet state synced to IndexedDB
   ↓
7. User redirected to dashboard/onboarding
```

### Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `AuthProvider` | Global auth state management | `src/lib/auth/auth-context.tsx` |
| `useAuth` | React hook for auth operations | `src/hooks/useAuth.ts` |
| `middleware.ts` | Route protection | `src/middleware.ts` |
| Auth helpers | Utilities for phone/OTP validation | `src/lib/auth/auth-helpers.ts` |
| Auth pages | Login, register, OTP verification | `src/app/auth/` |

---

## Getting Started

### 1. Environment Setup

Ensure your `.env.local` has Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Supabase Auth Configuration

In Supabase Dashboard:

1. Go to **Authentication > Settings**
2. Enable **Phone Authentication**
3. Configure SMS provider (Twilio, MessageBird, etc.)
4. Add your phone numbers to **Phone Auth Settings > Phone Provider**

---

## Usage Examples

### 1. Using Auth Hook in Components

```typescript
"use client";

import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
  const { user, isAuthenticated, signOut } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Welcome {user?.phone}</h1>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### 2. Using Auth Context

```typescript
"use client";

import { useAuthContext } from "@/lib/auth/auth-context";

export default function WalletPage() {
  const { user, loading, isAuthenticated } = useAuthContext();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Not authenticated</div>;

  return <div>Wallet for {user?.phone}</div>;
}
```

### 3. Protected Routes with Component

```typescript
import { ProtectedRoute } from "@/components/auth";

export default function DashboardPage() {
  return (
    <ProtectedRoute redirectTo="/auth/login">
      <div>Protected dashboard content</div>
    </ProtectedRoute>
  );
}
```

### 4. Conditional Rendering

```typescript
import { AuthenticatedOnly, UnauthenticatedOnly } from "@/lib/auth/auth-context";

export default function HomePage() {
  return (
    <div>
      <AuthenticatedOnly>
        <h1>Welcome back!</h1>
        <DashboardLink />
      </AuthenticatedOnly>

      <UnauthenticatedOnly>
        <h1>Please sign in</h1>
        <LoginButton />
      </UnauthenticatedOnly>
    </div>
  );
}
```

### 5. Manual OTP Flow

```typescript
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function CustomLoginPage() {
  const { sendOTP, verifyOTP } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");

  const handleSendOTP = async () => {
    const result = await sendOTP(phone);
    if (result.success) {
      setStep("otp");
    } else {
      alert(result.error);
    }
  };

  const handleVerifyOTP = async () => {
    const result = await verifyOTP(phone, otp);
    if (result.success) {
      // Redirect to dashboard
      window.location.href = "/dashboard";
    } else {
      alert(result.error);
    }
  };

  return step === "phone" ? (
    <div>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      <button onClick={handleSendOTP}>Send OTP</button>
    </div>
  ) : (
    <div>
      <input value={otp} onChange={(e) => setOtp(e.target.value)} />
      <button onClick={handleVerifyOTP}>Verify</button>
    </div>
  );
}
```

### 6. Check Session Expiry

```typescript
import { useSessionMonitor } from "@/hooks/useAuth";

export default function AppLayout() {
  const { isExpiringSoon } = useSessionMonitor();

  return (
    <div>
      {isExpiringSoon && (
        <div className="alert">Your session is expiring soon!</div>
      )}
      {/* App content */}
    </div>
  );
}
```

### 7. Device Fingerprinting

```typescript
import { generateDeviceFingerprint, registerDevice } from "@/lib/auth";

async function setupDevice(userId: string) {
  const fingerprint = await generateDeviceFingerprint();
  const result = await registerDevice(userId, fingerprint);

  if (result.success) {
    console.log("Device registered successfully");
  }
}
```

### 8. Phone Validation

```typescript
import { validatePhoneNumber, formatPhoneForDisplay } from "@/lib/auth";

const validation = validatePhoneNumber("+919876543210");
if (validation.valid) {
  console.log("Formatted:", validation.formatted); // +919876543210
  console.log("Display:", formatPhoneForDisplay(validation.formatted!)); // +91 98765 43210
} else {
  console.error("Error:", validation.error);
}
```

---

## Middleware Protection

### Protected Routes

The following routes are automatically protected by middleware:

- `/dashboard`
- `/wallet`
- `/transactions`
- `/settings`
- `/profile`
- `/payment`
- `/merchant`
- `/onboarding`

Unauthenticated users are redirected to `/auth/login`.

### Public Routes

These routes are accessible without authentication:

- `/` (home)
- `/auth/login`
- `/auth/register`
- `/auth/verify-otp`

### Custom Protection

To add more protected routes, edit `src/middleware.ts`:

```typescript
const PROTECTED_ROUTES = [
  "/dashboard",
  "/wallet",
  "/your-new-route", // Add here
];
```

---

## Auth Helpers Reference

### Phone Validation

```typescript
validatePhoneNumber(phone: string, country?: "IN" | "INTL"): {
  valid: boolean;
  formatted?: string;
  error?: string;
}
```

### OTP Management

```typescript
// Send OTP
sendOTP(phone: string): Promise<{ success: boolean; error?: string }>

// Verify OTP
verifyOTP(phone: string, otp: string): Promise<{
  success: boolean;
  error?: string;
  userId?: string;
}>
```

### Session Management

```typescript
// Get current session
getCurrentSession(): Promise<Session | null>

// Get current user
getCurrentAuthUser(): Promise<User | null>

// Check if authenticated
isUserAuthenticated(): Promise<boolean>

// Refresh session
refreshSession(): Promise<{ success: boolean; error?: string }>

// Sign out
signOut(): Promise<{ success: boolean; error?: string }>
```

### Rate Limiting

```typescript
// Check if OTP can be requested
canRequestOTP(): { allowed: boolean; waitSeconds?: number }

// Record OTP request (auto-called by sendOTP)
recordOTPRequest(): void

// Clear rate limit
clearOTPRateLimit(): void
```

---

## Security Features

### 1. Device Fingerprinting

Every login generates a unique device fingerprint using:
- User agent
- Screen resolution
- Timezone
- Language
- Platform
- Hardware specs

### 2. Rate Limiting

- **Client-side**: 60-second cooldown between OTP requests
- **Server-side**: Supabase enforces rate limits on OTP sends

### 3. Session Management

- Sessions expire after a set period (configured in Supabase)
- Auto-refresh when near expiry
- Secure cookie-based storage

### 4. Phone Validation

- Indian mobile format: `+91` followed by 10 digits (6-9 start)
- International E.164 format support
- Input sanitization (only digits, +, spaces, hyphens)

### 5. Middleware Protection

- Server-side route protection
- Automatic redirects for unauthenticated users
- Session validation on every protected route

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid phone number" | Incorrect format | Use +91 followed by 10 digits |
| "Please wait X seconds" | Rate limit | Wait before requesting new OTP |
| "Invalid or expired OTP" | Wrong OTP or timeout | Request new OTP |
| "Failed to send OTP" | Supabase config issue | Check Supabase SMS settings |
| "Authentication failed" | Session issue | Clear cookies and re-login |

### Error Handling Pattern

```typescript
try {
  const result = await sendOTP(phone);

  if (!result.success) {
    // Handle business logic errors
    switch (result.error) {
      case "Please wait X seconds":
        showRateLimitError();
        break;
      case "Invalid phone number":
        showValidationError();
        break;
      default:
        showGenericError(result.error);
    }
  }
} catch (error) {
  // Handle technical errors
  console.error("Technical error:", error);
  showGenericError("Something went wrong");
}
```

---

## Testing

### Test Phone Numbers

For development, configure Supabase to accept test phone numbers:

1. Go to Supabase Dashboard > Authentication > Settings
2. Add test phone numbers in **Phone Auth Settings**
3. Set OTP to a fixed value (e.g., `123456`)

### Manual Testing Checklist

- [ ] Register new user with valid phone
- [ ] Receive OTP via SMS
- [ ] Verify OTP successfully
- [ ] Access protected routes
- [ ] Log out and log back in
- [ ] Test rate limiting (rapid OTP requests)
- [ ] Test invalid phone formats
- [ ] Test expired OTP
- [ ] Test session expiry
- [ ] Test middleware protection

---

## Best Practices

### 1. Always Use Hooks

Use `useAuth()` or `useAuthContext()` instead of direct Supabase calls.

### 2. Handle Loading States

Always show loading indicators during auth operations:

```typescript
const { loading, isAuthenticated } = useAuth();

if (loading) return <LoadingSpinner />;
if (!isAuthenticated) return <LoginPrompt />;
```

### 3. Secure Phone Storage

Never store raw phone numbers in localStorage. Use Supabase session cookies.

### 4. Validate on Client and Server

- Client-side validation for UX
- Server-side validation (Supabase RLS) for security

### 5. Handle Offline Scenarios

```typescript
import { isOnline } from "@/lib/db";

if (!isOnline()) {
  alert("You're offline. Please connect to internet to sign in.");
  return;
}
```

---

## Troubleshooting

### Issue: OTP not received

**Solutions:**
1. Check Supabase SMS provider configuration
2. Verify phone number format (+91XXXXXXXXXX)
3. Check Supabase logs for errors
4. Ensure SMS credits available

### Issue: Session not persisting

**Solutions:**
1. Check browser cookie settings
2. Ensure `NEXT_PUBLIC_SUPABASE_URL` is correct
3. Clear browser cache and cookies
4. Check middleware configuration

### Issue: Infinite redirect loop

**Solutions:**
1. Check middleware protected routes list
2. Ensure `/auth/login` is not in PROTECTED_ROUTES
3. Verify Supabase session is being created

### Issue: TypeScript errors

**Solutions:**
1. Run `npm run type-check`
2. Ensure all imports use correct paths
3. Check `@/` path alias in `tsconfig.json`

---

## API Reference

See detailed type definitions in:
- `src/lib/auth/auth-helpers.ts` - Helper functions
- `src/hooks/useAuth.ts` - Auth hook types
- `src/lib/auth/auth-context.tsx` - Context types
- `src/middleware.ts` - Middleware config

---

**Authentication is the foundation of secure UPI Offline transactions!**
