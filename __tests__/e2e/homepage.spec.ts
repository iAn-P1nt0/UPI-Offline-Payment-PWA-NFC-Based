import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ARTIFACT_DATE = process.env.TEST_ARTIFACT_DATE || "2025-11-15";
const SCREENSHOT_DIR = path.resolve(
  process.cwd(),
  "docs",
  "testing-artifacts",
  ARTIFACT_DATE,
  "screenshots"
);

test("homepage renders hero copy", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "UPI Offline Pay" })).toBeVisible();
  await expect(
    page.getByText("Secure payments, even without internet")
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Account" })).toBeVisible();

  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const screenshotPath = path.join(SCREENSHOT_DIR, "homepage.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
});
