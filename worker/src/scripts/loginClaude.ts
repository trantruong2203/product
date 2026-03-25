/**
 * Script tự động đăng nhập vào Claude bằng credentials từ .env
 * Cookies + session được lưu vào chrome-profile/claude/
 *
 * Cần thiết lập biến môi trường:
 *   CLAUDE_EMAIL=your-email@gmail.com
 *   CLAUDE_PASSWORD=your-password
 *
 * Cách dùng:
 *   npx tsx src/scripts/loginClaude.ts
 * Hoặc chạy script login:claude trong package.json
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load .env file
dotenv.config();

const CLAUDE_EMAIL = process.env.CLAUDE_EMAIL;
const CLAUDE_PASSWORD = process.env.CLAUDE_PASSWORD;

const profileDir = path.join(process.cwd(), "chrome-profile", "claude");

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
  console.log(`Tao thu muc profile: ${profileDir}`);
}

// Kiem tra credentials
if (!CLAUDE_EMAIL || !CLAUDE_PASSWORD) {
  console.error("Loi: Thieu CLAUDE_EMAIL hoac CLAUDE_PASSWORD trong .env");
  console.error("Vui long them vao file .env:");
  console.error("  CLAUDE_EMAIL=your-email@gmail.com");
  console.error("  CLAUDE_PASSWORD=your-password");
  process.exit(1);
}

async function typeHumanLike(page: any, selector: string, text: string) {
  await page.click(selector);
  await page.waitForTimeout(300);

  for (const char of text) {
    await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
  }
}

async function waitForRandomDelay(minMs: number = 1000, maxMs: number = 3000) {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

async function login() {
  console.log("Bat dau dang nhap Claude tu dong...");
  console.log(`Email: ${CLAUDE_EMAIL}`);

  const stealth = StealthPlugin();

  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1280,800",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    timezoneId: "America/New_York",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ignoreHTTPSErrors: true,
  });

  // An dau automation
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();

  try {
    // Buoc 1: Den trang Claude login
    console.log("Dang mo trang Claude...");
    await page.goto("https://claude.ai/login", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await waitForRandomDelay(1500, 3000);

    // Buoc 2: Kiem tra trang hien tai - co the da o trang login
    let currentUrl = page.url();
    console.log(`URL hien tai: ${currentUrl}`);

    // Buoc 3: Nhap email
    console.log("Dang nhap email...");

    // Thu nhieu selector khac nhau cho email
    const emailInput = page.locator(
      "input[type='email'], input[name='email'], input#email, input[autocomplete='username'], input[autocomplete='email']"
    ).first();
    const isEmailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isEmailVisible) {
      // Thu click button bat dau
      const startBtn = page.locator("button:has-text('Get started'), button:has-text('Sign up'), a:has-text('Log in')").first();
      const isStartVisible = await startBtn.isVisible({ timeout: 2000 }).catch(() => false);

      if (isStartVisible) {
        console.log("Click nut Get started...");
        await startBtn.click();
        await waitForRandomDelay(1500, 3000);
      }
    }

    // Nhap email
    await emailInput.waitFor({ state: "visible", timeout: 10000 });
    await typeHumanLike(
      page,
      "input[type='email'], input[name='email'], input#email, input[autocomplete='username'], input[autocomplete='email']",
      CLAUDE_EMAIL
    );

    await waitForRandomDelay(500, 1000);

    // Click Continue
    const continueBtn = page.locator("button:has-text('Continue'), button:has-text('Next'), button:has-text('Tiếp tục')").first();
    await continueBtn.click();

    console.log("Dang cho trang nhap mat khau...");
    await waitForRandomDelay(2000, 4000);

    // Buoc 4: Nhap mat khau
    console.log("Dang nhap mat khau...");

    const passwordInput = page.locator(
      "input[type='password'], input[name='password'], input#password, input[autocomplete='current-password']"
    ).first();
    await passwordInput.waitFor({ state: "visible", timeout: 10000 });
    await typeHumanLike(
      page,
      "input[type='password'], input[name='password'], input#password, input[autocomplete='current-password']",
      CLAUDE_PASSWORD
    );

    await waitForRandomDelay(500, 1000);

    // Click Login
    const loginBtn = page.locator("button:has-text('Log in'), button:has-text('Sign in'), button:has-text('Đăng nhập'), button[type='submit']").first();
    await loginBtn.click();

    console.log("Dang xac thuc...");
    await waitForRandomDelay(3000, 5000);

    // Buoc 5: Xu ly 2FA neu co
    const twoFactorInput = page.locator(
      "input#code, input[name='code'], input[autocomplete='one-time-code'], input#totp, input[name='otp']"
    ).first();
    const isTwoFactorVisible = await twoFactorInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (isTwoFactorVisible) {
      console.log("Phat hien 2FA! Vui long nhap ma xac thuc trong 30 giay...");

      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const code = await new Promise<string>((resolve) => {
        rl.question("Nhap ma 2FA: ", (answer) => {
          rl.close();
          resolve(answer);
        });
      });

      await typeHumanLike(
        page,
        "input#code, input[name='code'], input[autocomplete='one-time-code'], input#totp, input[name='otp']",
        code
      );

      const confirmBtn = page.locator("button:has-text('Verify'), button:has-text('Confirm'), button:has-text('Continue')").first();
      await confirmBtn.click();

      await waitForRandomDelay(2000, 4000);
    }

    // Buoc 6: Xu ly terms/conditions neu co
    const termsCheckbox = page.locator("input[type='checkbox'], #terms, input[name='terms']").first();
    const isTermsVisible = await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false);

    if (isTermsVisible) {
      console.log("Dang chap nhan dieu khoan...");
      await termsCheckbox.click();
      await waitForRandomDelay(500, 1000);
    }

    // Buoc 7: Chuyen den Claude
    console.log("Dang chuyen den Claude...");
    await page.goto("https://claude.ai", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    await waitForRandomDelay(2000, 4000);

    // Buoc 8: Kiem tra ket qua
    // Claude co the la textarea hoac input
    const textarea = page.locator("textarea").first();
    const mainInput = page.locator("[data-testid='welcome-input'], [placeholder*='Message'], .ProseMirror").first();
    
    const isLoggedIn = await textarea.isVisible({ timeout: 5000 }).catch(() => false);
    const isMainInputVisible = await mainInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (isLoggedIn || isMainInputVisible) {
      console.log("Dang nhap thanh cong!");

      // Luu session
      console.log("Dang luu session...");
      await context.storageState({ path: path.join(profileDir, "state.json") });

      console.log(`Session da luu vao: ${profileDir}`);
      console.log("Ban co the dong trinh duyet.");

      await waitForRandomDelay(2000, 3000);
    } else {
      // Thu kiem tra trang hien tai
      console.log("Khong tim thay input - kiem tra trang hien tai...");

      const title = await page.title();
      console.log(`Title hien tai: ${title}`);

      const currentPageUrl = page.url();
      console.log(`URL hien tai: ${currentPageUrl}`);

      // Thu click button accept neu co
      const acceptBtn = page.locator(
        "button:has-text('Accept'), button:has-text('Accept all'), button:has-text('I agree'), button:has-text('Agree')"
      ).first();
      const isAcceptVisible = await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false);

      if (isAcceptVisible) {
        console.log("Click accept button...");
        await acceptBtn.click();
        await waitForRandomDelay(2000, 3000);
      }

      // Kiem tra lai
      const isLoggedInNow = await textarea.isVisible({ timeout: 5000 }).catch(() => false);

      if (isLoggedInNow) {
        console.log("Dang nhap thanh cong sau khi accept!");
        await context.storageState({ path: path.join(profileDir, "state.json") });
        console.log(`Session da luu vao: ${profileDir}`);
      } else {
        console.log("Van chua dang nhap thanh cong. Vui long kiem tra.");
      }
    }

    await browser.close();
    console.log("Hoan tat!");
    process.exit(0);

  } catch (err) {
    console.error("Loi khi dang nhap:", err);
    console.log("Dang dong trinh duyet...");
    await browser.close();
    process.exit(1);
  }
}

login();
