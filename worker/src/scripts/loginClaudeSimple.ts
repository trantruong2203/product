/**
 * Login script for Claude with persistent session
 * Usage: npx tsx src/scripts/loginClaudeSimple.ts
 *
 * This script:
 * 1. Opens Chrome with persistent profile
 * 2. Navigates to Claude
 * 3. Waits for you to login manually
 * 4. Saves the session when you press ENTER
 */

import { chromium } from "playwright";
import * as path from "node:path";
import * as fs from "node:fs";

const ENGINE_NAME = "claude";
const profileDir = path.join(process.cwd(), "chrome-profile", ENGINE_NAME);

// Ensure profile directory exists
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

async function login() {
  console.log(`🚀 Starting ${ENGINE_NAME} login process...`);
  console.log(`📁 Profile directory: ${profileDir}`);
  console.log("");

  // Launch Chrome with persistent profile
  const browser = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    timezoneId: "America/New_York",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = browser.pages()[0] || await browser.newPage();

  // Navigate to Claude
  console.log("🌐 Navigating to Claude...");
  await page.goto("https://claude.ai", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  console.log("✅ Claude opened successfully!");
  console.log("");
  console.log("📋 Instructions:");
  console.log("  1. Login to your Anthropic account in the browser window");
  console.log("  2. Complete any 2FA if required");
  console.log("  3. Once you see the chat interface, return here");
  console.log("");
  console.log("🔔 Please login in the browser. When finished, press ENTER in this terminal.");
  console.log("");

  // Wait for user to press ENTER
  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => {
      console.log("");
      resolve();
    });
  });

  console.log("💾 Saving session...");

  // The session is automatically saved in the persistent profile
  // No need to explicitly save storageState since we're using persistent context

  console.log("✅ Session saved successfully!");
  console.log(`📁 Session stored in: ${profileDir}`);
  console.log("");
  console.log("💡 The session will be automatically reused in future runs.");

  await browser.close();
  process.exit(0);
}

login().catch((err) => {
  console.error("❌ Login failed:", err);
  process.exit(1);
});