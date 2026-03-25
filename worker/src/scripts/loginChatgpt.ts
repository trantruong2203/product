/**
 * Script tự động đăng nhập vào ChatGPT bằng credentials từ .env
 * Cookies + session được lưu vào chrome-profile/chatgpt/
 *
 * Cần thiết lập biến môi trường:
 *   CHATGPT_EMAIL=your-email@gmail.com
 *   CHATGPT_PASSWORD=your-password
 *
 * Cách dùng:
 *   npx tsx src/scripts/loginChatgpt.ts
 * Hoặc chạy script login:chatgpt trong package.json
 */

import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import anonymizeUA from "puppeteer-extra-plugin-anonymize-ua";
import recaptcha from "puppeteer-extra-plugin-recaptcha";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load .env file
dotenv.config();

const CHATGPT_EMAIL = process.env.CHATGPT_EMAIL;
const CHATGPT_PASSWORD = process.env.CHATGPT_PASSWORD;

const profileDir = path.join(process.cwd(), "chrome-profile", "chatgpt");

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
  console.log(`Tao thu muc profile: ${profileDir}`);
}

// Kiem tra credentials
if (!CHATGPT_EMAIL || !CHATGPT_PASSWORD) {
  console.error("Loi: Thieu CHATGPT_EMAIL hoac CHATGPT_PASSWORD trong .env");
  console.error("Vui long them vao file .env:");
  console.error("  CHATGPT_EMAIL=your-email@gmail.com");
  console.error("  CHATGPT_PASSWORD=your-password");
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
  console.log("Bat dau dang nhap ChatGPT tu dong...");
  console.log(`Email: ${CHATGPT_EMAIL}`);

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

  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1920,1080",
      "--no-first-run",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
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
    // Buoc 1: Den trang ChatGPT login
    console.log("Dang mo trang ChatGPT...");
    await page.goto("https://chatgpt.com/auth/login", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await waitForRandomDelay(1500, 3000);

    // Buoc 2: Click nut "Log in" neu can
    const loginBtn = page.locator("button:has-text('Log in'), button:has-text('Sign in'), a:has-text('Log in')").first();
    const isLoginBtnVisible = await loginBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (isLoginBtnVisible) {
      console.log("Click nut Log in...");
      await loginBtn.click();
      await waitForRandomDelay(1500, 3000);
    }

    // Buoc 3: Kiem tra trang hien tai
    const currentUrl = page.url();
    console.log(`URL hien tai: ${currentUrl}`);

    // Buoc 4: Nhap email
    console.log("Dang nhap email...");

    // Thu nhieu selector khac nhau
    const emailInput = page.locator("input[type='email'], input[name='email'], input#email, input[autocomplete='username']").first();
    const isEmailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isEmailVisible) {
      // Thu kich ban Alt+S hoac tim nut continue
      const continueBtn = page.locator("button:has-text('Continue'), button:has-text('Continue with email')").first();
      const isContinueVisible = await continueBtn.isVisible({ timeout: 2000 }).catch(() => false);

      if (isContinueVisible) {
        console.log("Click Continue...");
        await continueBtn.click();
        await waitForRandomDelay(1500, 3000);
      }
    }

    // Thu nhap email
    await emailInput.waitFor({ state: "visible", timeout: 10000 });
    await typeHumanLike(page, "input[type='email'], input[name='email'], input#email, input[autocomplete='username']", CHATGPT_EMAIL);

    await waitForRandomDelay(500, 1000);

    // Click Continue
    const continueEmailBtn = page.locator("button:has-text('Continue'), button:has-text('Next'), button:has-text('Tiếp tục')").first();
    await continueEmailBtn.click();

    console.log("Dang cho trang nhap mat khau...");
    await waitForRandomDelay(2000, 4000);

    // Buoc 5: Nhap mat khau
    console.log("Dang nhap mat khau...");

    const passwordInput = page.locator("input[type='password'], input[name='password'], input#password, input[autocomplete='current-password']").first();
    await passwordInput.waitFor({ state: "visible", timeout: 10000 });
    await typeHumanLike(page, "input[type='password'], input[name='password'], input#password, input[autocomplete='current-password']", CHATGPT_PASSWORD);

    await waitForRandomDelay(500, 1000);

    // Click Login
    const loginSubmitBtn = page.locator("button:has-text('Log in'), button:has-text('Sign in'), button:has-text('Đăng nhập'), button[type='submit']").first();
    await loginSubmitBtn.click();

    console.log("Dang xac thuc...");
    await waitForRandomDelay(3000, 5000);

    // Buoc 6: Xu ly 2FA neu co
    const twoFactorInput = page.locator("input#code, input[name='code'], input[autocomplete='one-time-code'], input#totp").first();
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

      await typeHumanLike(page, "input#code, input[name='code'], input[autocomplete='one-time-code'], input#totp", code);

      const confirmBtn = page.locator("button:has-text('Verify'), button:has-text('Confirm'), button:has-text('Continue')").first();
      await confirmBtn.click();

      await waitForRandomDelay(2000, 4000);
    }

    // Buoc 7: Xu ly CAPTCHA neu co
    const captchaFrame = page.locator("iframe[src*='captcha'], iframe[title*='reCAPTCHA']").first();
    const isCaptchaVisible = await captchaFrame.isVisible({ timeout: 2000 }).catch(() => false);

    if (isCaptchaVisible) {
      console.log("Phat hien CAPTCHA! Vui long giai CAPTCHA trong trinh duyet...");
      console.log("Sau khi xong, nhan ENTER trong terminal nay...");

      await new Promise<void>((resolve) => {
        process.stdin.resume();
        process.stdin.once("data", () => resolve());
      });
    }

    // Buoc 8: Chuyen den ChatGPT
    console.log("Dang chuyen den ChatGPT...");
    await page.goto("https://chatgpt.com", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    await waitForRandomDelay(2000, 4000);

    // Buoc 9: Kiem tra ket qua
    const textarea = page.locator("textarea").first();
    const isLoggedIn = await textarea.isVisible({ timeout: 10000 }).catch(() => false);

    if (isLoggedIn) {
      console.log("Dang nhap thanh cong!");

      // Luu session
      console.log("Dang luu session...");
      await context.storageState({ path: path.join(profileDir, "state.json") });

      console.log(`Session da luu vao: ${profileDir}`);
      console.log("Ban co the dong trinh duyet.");

      await waitForRandomDelay(2000, 3000);
    } else {
      // Thu kiem tra trang hien tai
      console.log("Khong tim thay textarea - kiem tra trang hien tai...");

      const title = await page.title();
      console.log(`Title hien tai: ${title}`);

      const currentPageUrl = page.url();
      console.log(`URL hien tai: ${currentPageUrl}`);

      // Thu click button accept neu co
      const acceptBtn = page.locator("button:has-text('Accept'), button:has-text('Accept all'), button:has-text('I agree')").first();
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
