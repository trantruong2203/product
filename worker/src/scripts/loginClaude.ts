/**
 * Script chạy 1 lần để login thủ công vào Claude.
 * Cookies + session sẽ được lưu vào chrome-profile/claude/
 *
 * Run:
 * npx tsx src/scripts/loginClaude.ts
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as path from "path";
import * as fs from "fs";

chromium.use(StealthPlugin());

const profileDir = path.join(process.cwd(), "chrome-profile", "claude");

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
  console.log(`✅ Tạo thư mục profile: ${profileDir}`);
}

async function login() {

  console.log("🚀 Mở Chrome với profile:", profileDir);

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    ignoreDefaultArgs: ["--enable-automation"],
  });

  const page = await context.newPage();

  console.log("🌍 Đang mở Claude...");

  await page.goto("https://claude.ai", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(4000);

  console.log("");
  console.log("============================================================");
  console.log("👤 Hãy đăng nhập thủ công vào Claude trên cửa sổ Chrome");
  console.log("");
  console.log("Sau khi đăng nhập xong:");
  console.log("👉 quay lại TERMINAL");
  console.log("👉 nhấn ENTER để lưu session");
  console.log("============================================================");
  console.log("");

  // WAIT FOR ENTER
  process.stdin.resume();

  process.stdin.once("data", async () => {

    console.log("💾 Đang lưu session...");

    try {
      await context.storageState({
        path: path.join(profileDir, "state.json"),
      });
    } catch (e) {
      console.log("⚠️ storageState error (không quan trọng):", e);
    }

    console.log("🔒 Đóng browser...");

    await context.close();

    console.log("");
    console.log("============================================================");
    console.log("✅ Login Claude thành công!");
    console.log("📂 Session lưu tại:", profileDir);
    console.log("============================================================");

    process.exit(0);
  });

}

login().catch((err) => {
  console.error("❌ Lỗi:", err);
  process.exit(1);
});