/**
 * Script chạy 1 lần để login thủ công vào ChatGPT.
 * Cookies + session sẽ được lưu vào chrome-profile/chatgpt/
 * và tự động được reuse bởi browserPool.ts mỗi khi worker chạy.
 *
 * Cách dùng: npx tsx src/scripts/loginChatgpt.ts
 */
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as path from "path";
import * as fs from "fs";

chromium.use(StealthPlugin());

// Phải khớp chính xác với profileDir trong browserPool.ts
const profileDir = path.join(process.cwd(), "chrome-profile", "chatgpt");

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
  console.log(`✅ Tạo thư mục profile: ${profileDir}`);
}

async function login() {
  console.log("🚀 Mở Chrome với profile:", profileDir);

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chromium",
    headless: false,
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const page = await context.newPage();
  await page.goto("https://chatgpt.com", { waitUntil: "domcontentloaded" });

  console.log("");
  console.log("=".repeat(60));
  console.log("👤 Hãy đăng nhập thủ công vào ChatGPT trên cửa sổ Chrome");
  console.log("   - Giải CAPTCHA nếu có");
  console.log("   - Đợi đến khi vào được trang chat chính");
  console.log("=".repeat(60));
  console.log("");
  console.log("⏳ Sau khi đăng nhập xong, nhấn ENTER ở đây để lưu session...");

  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => resolve());
  });

  // Kiểm tra đã login thật chưa
  console.log("🔍 Đang kiểm tra trạng thái đăng nhập...");

  const isLoggedIn = await page
    .waitForSelector(
      '[data-testid="profile-button"], #prompt-textarea, div[contenteditable="true"]',
      {
        timeout: 10000,
      },
    )
    .then(() => true)
    .catch(() => false);

  if (!isLoggedIn) {
    console.error("❌ Chưa phát hiện trạng thái login. Hãy thử lại.");
    await context.close();
    process.exit(1);
  }

  console.log("✅ Đã xác nhận đăng nhập thành công!");
  console.log("💾 Session đã được lưu tự động vào:", profileDir);
  console.log("");
  console.log("📌 Từ bây giờ, worker sẽ tự dùng session này.");
  console.log(
    "   Không cần đăng nhập lại trừ khi session hết hạn (~7-14 ngày).",
  );

  // Với persistentContext, cookies đã được lưu tự động vào profileDir
  // Không cần gọi context.storageState() vì browserPool.ts dùng launchPersistentContext
  await context.close();
  process.exit(0);
}

login().catch((err) => {
  console.error("❌ Lỗi:", err.message);
  process.exit(1);
});
