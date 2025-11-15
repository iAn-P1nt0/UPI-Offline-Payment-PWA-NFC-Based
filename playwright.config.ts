import { defineConfig } from "@playwright/test";

const PORT = process.env.PORT || 3000;
const SUPABASE_FALLBACKS: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "supabase-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "supabase-service-role-key",
};

Object.entries(SUPABASE_FALLBACKS).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

export default defineConfig({
  testDir: "__tests__/e2e",
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
