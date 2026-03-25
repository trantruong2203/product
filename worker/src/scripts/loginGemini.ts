/**
 * Script tự động đăng nhập vào Gemini bằng credentials từ .env
 * Cookies + session được lưu vào chrome-profile/gemini/
 *
 * Cần thiết lập biến môi trường:
 *   GEMINI_EMAIL=your-email@gmail.com
 *   GEMINI_PASSWORD=your-password
 *
 * Cách dùng:
 *   npx tsx src/scripts/loginGemini.ts
 * Hoặc chạy script login:gemini trong package.json
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load .env file
dotenv.config();

const GEMINI_EMAIL = process.env.GEMINI_EMAIL;
const GEMINI_PASSWORD = process.env.GEMINI_PASSWORD;

const profileDir = path.join(process.cwd(), "chrome-profile", "gemini");

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
  console.log(`Tao thu muc profile: ${profileDir}`);
}

// Kiem tra credentials
if (!GEMINI_EMAIL || !GEMINI_PASSWORD) {
  console.error("Loi: Thieu GEMINI_EMAIL hoac GEMINI_PASSWORD trong .env");
  console.error("Vui long them vao file .env:");
  console.error("  GEMINI_EMAIL=your-email@gmail.com");
  console.error("  GEMINI_PASSWORD=your-password");
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

async function clickNextButton(page: any) {
  // Thu nhieu selector khac nhau cho nut Next
  const selectors = [
    "button#identifierNext",
    "button#passwordNext",
    "button[type='submit']",
    ".VfPpkd-LgbsSe[role='button']",
    "div#identifierNext",
    "div#passwordNext",
  ];

  for (const selector of selectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click();
        return true;
      }
    } catch {
      // Thu selector tiep theo
    }
  }

  // Thu kich ban phim Enter
  await page.keyboard.press("Enter");
  return true;
}

async function login() {
  console.log("Bat dau dang nhap Gemini tu dong...");
  console.log(`Email: ${GEMINI_EMAIL}`);

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
    // Buoc 1: Den trang Google login
    console.log("Dang mo trang dang nhap Google...");
    await page.goto("https://accounts.google.com/v3/signin/identifier?dsh=S-1234567890%3A1234567890&continue=https%3A%2F%2Fgemini.google.com%2Fapp&followup=https%3A%2F%2Fgemini.google.com%2Fapp&hl=vi&ifkv=Ab randomstring&passive=true&service=lso&flowName=GlifWebSignIn&flowEntry=ServiceLogin", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await waitForRandomDelay(1500, 3000);

    // Buoc 2: Nhap email
    console.log("Dang nhap email...");

    const emailInput = page.locator("input[type='email'], input[name='identifier'], input#identifierId").first();
    await emailInput.waitFor({ state: "visible", timeout: 10000 });
    await typeHumanLike(page, "input[type='email'], input[name='identifier'], input#identifierId", GEMINI_EMAIL);

    await waitForRandomDelay(500, 1000);

    // Click nut Next
    console.log("Click nut Next...");
    await clickNextButton(page);

    console.log("Dang cho trang nhap mat khau...");
    await waitForRandomDelay(2000, 4000);

    // Buoc 3: Nhap mat khau
    console.log("Dang nhap mat khau...");

    const passwordInput = page.locator("input[type='password'], input[name='Passwd'], input#password").first();
    await passwordInput.waitFor({ state: "visible", timeout: 10000 });
    await typeHumanLike(page, "input[type='password'], input[name='Passwd'], input#password", GEMINI_PASSWORD);

    await waitForRandomDelay(500, 1000);

    // Click nut Next/Dang nhap
    console.log("Click nut Dang nhap...");
    await clickNextButton(page);

    console.log("Dang xac thuc...");
    await waitForRandomDelay(3000, 5000);

    // Buoc 4: Xu ly 2FA neu co
    const twoFactorInput = page.locator("input#totpCode, input[name='totpPin'], input[name='code']").first();
    const isTwoFactorVisible = await twoFactorInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (isTwoFactorVisible) {
      console.log("Phat hien 2FA! Vui long nhap ma xac thuc trong 30 giay...");
      console.log("(Hoac nhap ma 2FA trong terminal nay)");

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

      await typeHumanLike(page, "input#totpCode, input[name='totpPin'], input[name='code']", code);

      const confirmBtn = page.locator("button:has-text('Verify'), button:has-text('Xac nhan'), button:has-text('Confirm')").first();
      await confirmBtn.click();

      await waitForRandomDelay(2000, 4000);
    }

    // Buoc 5: Chap nhan dieu khoan neu can
    const termsCheckbox = page.locator("input[type='checkbox'], #termOfService, input[name='terms']").first();
    const isTermsVisible = await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false);

    if (isTermsVisible) {
      console.log("Dang chap nhan dieu khoan...");
      await termsCheckbox.click();
      await waitForRandomDelay(500, 1000);
    }

    // Buoc 6: Chuyen den Gemini
    console.log("Dang chuyen den Gemini...");
    await page.goto("https://gemini.google.com", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    await waitForRandomDelay(2000, 4000);

    // Buoc 7: Kiem tra ket qua
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

      // Thu lay title
      const title = await page.title();
      console.log(`Title hien tai: ${title}`);

      // Thu click button accept neu co
      const acceptBtn = page.locator("button:has-text('Accept'), button:has-text('Chấp nhận'), button:has-text('I agree'), button:has-text('Agree')").first();
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
