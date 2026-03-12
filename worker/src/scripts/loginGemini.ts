/**
 * Script chạy 1 lần để login thủ công vào Gemini.
 * Cookies + session sẽ được lưu vào chrome-profile/gemini/
 * và tự động được reuse bởi browserPool.ts mỗi khi worker chạy.
 *
 * Cách dùng: npx tsx src/scripts/loginGemini.ts
 */
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as path from "path";
import * as fs from "fs";

chromium.use(StealthPlugin());

const profileDir = path.join(process.cwd(), "chrome-profile", "gemini");

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
  console.log(`✅ Tạo thư mục profile: ${profileDir}`);
}

async function login() {
  console.log("🚀 Mở Chrome với profile:", profileDir);

  try {
    const context = await chromium.launchPersistentContext(profileDir, {
      channel: "chrome",
      headless: false,
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
      // Không gửi cờ automation để Google không chặn đăng nhập
      ignoreDefaultArgs: ["--enable-automation"],
    });

    console.log("✅ Context created successfully");

    const page = await context.newPage();
    // Ẩn dấu automation trước khi load trang
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });
    console.log("✅ Page created");

    await page.goto("https://gemini.google.com", { waitUntil: "networkidle", timeout: 60000 });
    console.log("✅ Page loaded");

    console.log("");
    console.log("=".repeat(60));
    console.log("👤 Hãy đăng nhập thủ công vào Gemini trên cửa sổ Chrome");
    console.log("   - Nếu có cảnh báo 'This browser or app may not be secure':");
    console.log("     Click 'Details' > 'Go to unsafe'");
    console.log("=".repeat(60));
    console.log("");
    console.log("⏳ Sau khi đăng nhập xong, nhấn ENTER để lưu session...");

    await new Promise<void>((resolve) => {
      process.stdin.resume();
      process.stdin.once("data", () => resolve());
    });

    // Verify login
    console.log("🔍 Kiểm tra trạng thái đăng nhập...");
    
    await page.goto("https://gemini.google.com", { waitUntil: "networkidle" });
    
    const isLoggedIn = await page
      .waitForSelector("textarea", { timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    if (!isLoggedIn) {
      console.error("❌ Chưa phát hiện trạng thái login");
      await context.close();
      process.exit(1);
    }

    console.log("✅ Đăng nhập thành công! Session đã lưu vào:", profileDir);
    await context.close();
    process.exit(0);

  } catch (err) {
    console.error("❌ Lỗi:", err);
    process.exit(1);
  }
}

login();
