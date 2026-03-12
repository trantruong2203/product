/**
 * Script chạy 1 lần để login thủ công vào ChatGPT.
 * Cookies + session sẽ được lưu vào chrome-profile/chatgpt/
 *
 * Run:
 * npx tsx src/scripts/loginChatgpt.ts
 */

import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import anonymizeUA from "puppeteer-extra-plugin-anonymize-ua";
import recaptcha from "puppeteer-extra-plugin-recaptcha";
import * as path from "path";
import * as fs from "fs";

// Enable stealth plugins
chromium.use(stealth());
chromium.use(anonymizeUA());

if (process.env.RECAPTCHA_API_KEY) {
  chromium.use(
    recaptcha({
      provider: {
        id: "2captcha",
        token: process.env.RECAPTCHA_API_KEY,
      },
      visualFeedback: true,
    })
  );
}

const profileDir = path.join(process.cwd(), "chrome-profile", "chatgpt");

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
  console.log(`Tao thu muc profile: ${profileDir}`);
}

async function login() {

  console.log("Mo Chrome voi profile:", profileDir);

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  const page = await context.newPage();

  console.log("");
  console.log("============================================================");
  console.log("Dang mo ChatGPT...");
  console.log("============================================================");

  await page.goto("https://chatgpt.com", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(5000);

  console.log("");
  console.log("============================================================");
  console.log("Hay dang nhap thu cong vao ChatGPT tren cua so Chrome");
  console.log("");
  console.log("Sau khi dang nhap xong:");
  console.log("👉 quay lai TERMINAL");
  console.log("👉 nhan ENTER de luu session");
  console.log("============================================================");
  console.log("");

  // WAIT FOR ENTER
  process.stdin.resume();

  process.stdin.once("data", async () => {

    console.log("");
    console.log("Dang luu session...");

    try {
      await context.storageState({
        path: path.join(profileDir, "state.json"),
      });
    } catch (e) {
      console.log("Storage state save error (not critical):", e);
    }

    console.log("Dang dong browser...");

    await context.close();

    console.log("");
    console.log("============================================================");
    console.log("Login thanh cong!");
    console.log("Session da luu vao:", profileDir);
    console.log("============================================================");

    process.exit(0);
  });

}

login().catch((err) => {
  console.error("Loi:", err);
  process.exit(1);
});