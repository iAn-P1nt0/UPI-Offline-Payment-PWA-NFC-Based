/**
 * Next.js Middleware
 * Phase 1: MVP Foundations
 * Reference: CLAUDE.md - Authentication Flows
 *
 * Protects authenticated routes and redirects unauthenticated users
 * This replaces proxy.ts with proper Next.js middleware
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { getSupabaseClientConfig } from "@/lib/env/supabase";

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/wallet",
  "/transactions",
  "/settings",
  "/profile",
  "/payment",
  "/merchant",
  "/onboarding",
];

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/register", "/auth/verify-otp"];

/**
 * Auth routes that redirect to dashboard if already authenticated
 */
const AUTH_ROUTES = ["/auth/login", "/auth/register"];

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseClientConfig();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: any) {
        request.cookies.set({
          name,
          value: "",
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });

  // Get session
  let session = null;
  try {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    session = currentSession;
  } catch (error) {
    if (!isAuthSessionMissingError(error)) {
      throw error;
    }
  }

  const isAuthenticated = !!session;

  // Check if route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Check if route is auth route
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from auth routes to dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, icons, manifest)
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

