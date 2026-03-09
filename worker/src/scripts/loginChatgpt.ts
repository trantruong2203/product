import { chromium } from "playwright";

async function login() {

  const browser = await chromium.launch({
    headless: false
  });

  const context = await chromium.launchPersistentContext(
    "./chrome-profile",
    {
      channel: "chrome",
      headless: false,
      args: ["--disable-blink-features=AutomationControlled"]
    }
  )
  const page = await context.newPage();

  await page.goto("https://chatgpt.com");

  console.log("Login + solve captcha manually, then press ENTER");

  process.stdin.once("data", async () => {

    await context.storageState({
      path: "./sessions/ChatGPT.json"
    });

    console.log("Session saved");

    await browser.close();

    process.exit();

  });

}

login();