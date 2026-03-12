import { Page, BrowserContext, ElementHandle, Locator } from "playwright";

export interface QueryResult {
  /** Plain text — used for brand/competitor matching */
  text: string;
  /** Raw innerHTML — used for HTML→Markdown conversion with citations */
  html: string;
}
import { browserPool } from "../browsers/browserPool.js";

export interface EngineConfig {
  name: string;
  url: string;
  inputSelector: string;
  responseSelector: string;
  waitAfterSubmit?: number;
  loginSelector?: string;
  loggedInSelector?: string;
}

export const ENGINE_CONFIGS: Record<string, EngineConfig> = {
  ChatGPT: {
    name: "ChatGPT",
    url: "https://chatgpt.com/",
    inputSelector: 'div[contenteditable="true"][role="textbox"]',
    responseSelector: '[data-message-author-role="assistant"]',
    waitAfterSubmit: 5000,
    loginSelector: 'button:has-text("Log in")',
    loggedInSelector: 'nav a[href*="/chat"]',
  },

  Gemini: {
    name: "Gemini",
    url: "https://gemini.google.com/app",
    inputSelector: "textarea#prompt-textarea, div[contenteditable='true'][aria-label*='message']",
    responseSelector: ".response-content, .markdown-body, [role='presentation']",
    waitAfterSubmit: 5000,
    loginSelector: 'button:has-text("Sign in")',
    loggedInSelector: "header a[href*='gemini']",
  },

  Claude: {
    name: "Claude",
    url: "https://claude.ai/",
    inputSelector: "div[contenteditable='true'][aria-label*='chat'], textarea",
    responseSelector: "[data-testid*='message'], .assistant-message, [role='presentation']",
    waitAfterSubmit: 5000,
    loginSelector: 'button:has-text("Log in"), a[href*="login"]',
    loggedInSelector: "nav a[href*='/chat']",
  },
};

export class BaseEngine {
  protected config: EngineConfig;
  protected context?: BrowserContext;
  protected page?: Page;
  private requestCount = 0;

  constructor(engineName: string) {
    const config = ENGINE_CONFIGS[engineName];

    if (!config) {
      throw new Error(`Engine ${engineName} not supported`);
    }

    this.config = config;
  }

  async initialize(): Promise<void> {
    this.context = await browserPool.getContext(this.config.name);

    this.page = await this.context.newPage();

    // Inject stealth scripts to page
    await this.injectPageStealth();

    await this.page.setViewportSize({
      width: 1280,
      height: 800,
    });
  }

  private async injectPageStealth() {
    if (!this.page) return;

    await this.page.addInitScript(() => {
      // Override console methods to hide automation messages
      const originalConsole = console.error;
      console.error = (...args: any[]) => {
        if (args[0] && typeof args[0] === "string") {
          if (
            args[0].includes("webdriver") ||
            args[0].includes("automation") ||
            args[0].includes("pxc")
          ) {
            return;
          }
        }
        originalConsole.apply(console, args);
      };
    });
  }

  async query(prompt: string): Promise<QueryResult> {
    if (!this.page) {
      throw new Error("Browser not initialized.");
    }

    this.requestCount++;
    const page = this.page;

    // Check for CAPTCHA before proceeding
    if (await this.detectCaptcha()) {
      console.log("⚠️ CAPTCHA detected! Waiting for manual resolution...");
      await this.waitForCaptchaResolution();
    }

    // Add delay between requests to avoid rate limiting
    if (this.requestCount > 1) {
      const delay = 5000 + Math.random() * 10000; // 5-15 seconds between requests
      console.log(`⏳ Waiting ${Math.round(delay / 1000)}s between requests...`);
      await this.randomDelay(delay, delay + 5000);
    }

    await page.goto(this.config.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait a bit for page to fully load
    await this.randomDelay(3000, 5000);

    // Check if logged in - if login selector is visible, user is not logged in
    if (this.config.loginSelector) {
      try {
        const loginBtn = await page.waitForSelector(this.config.loginSelector, { timeout: 5000 }).catch(() => null);
        if (loginBtn) {
          console.log(`⚠️ ${this.config.name}: User not logged in! Please run login script first.`);
          throw new Error(`${this.config.name}: User not logged in. Please login first.`);
        }
      } catch {}
    }

    // Verify we're on the right page with chat interface
    await this.randomDelay(2000, 3000);

    // Random scroll behavior after page load (mimic human reading)
    await this.humanLikeScroll();

    await this.randomDelay(2000, 4000);

    // Dismiss any popups or cookie consent dialogs
    await this.dismissPopups();

    // Scroll to bottom to ensure chat input is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.randomDelay(1000, 2000);

    // Try to find and click the input area - use config selector plus fallbacks
    let input: ElementHandle | null = null;
    // Split the inputSelector in case there are multiple selectors separated by comma
    const configSelectors = this.config.inputSelector.split(',').map(s => s.trim());
    const selectors = [
      ...configSelectors,
      'textarea[placeholder*="Message"]',
      'textarea[aria-label*="message"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="chat"]',
      'div[aria-label*="chat input"]',
      'rich-textarea div[contenteditable="true"]',
      '.input-row textarea',
      '#prompt-input',
      'form textarea',
    ];

    for (const sel of selectors) {
      try {
        input = await page.waitForSelector(sel, { state: "visible", timeout: 5000 }).catch(() => null);
        if (input) {
          console.log(`✅ Found input with selector: ${sel}`);
          break;
        }
      } catch {}
    }

    if (!input) {
      console.log("❌ Cannot find input. Page HTML:");
      const html = await page.content();
      console.log(html.slice(0, 5000));
      throw new Error(`Cannot find input field with any selector`);
    }

    // Check if it's a contenteditable element or textarea
    const isContentEditable = await input.evaluate(
      (el: Element) =>
        el.getAttribute("contenteditable") === "true" ||
        el.tagName === "TEXTAREA" ||
        el instanceof HTMLTextAreaElement
    );

    console.log(`Input type: ${isContentEditable ? "contenteditable" : "textarea/input"}`);

    // Human-like mouse movement before clicking
    await this.humanLikeMoveToInput(input);

    // Focus the input by clicking
    await input.click();
    await this.randomDelay(300, 800);

    // Clear existing content
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await this.randomDelay(200, 500);

    // Type the prompt with human-like delays
    if (isContentEditable) {
      // For contenteditable divs (ChatGPT, Claude) - type character by character
      await this.humanType(prompt);
    } else {
      // For regular textarea/input - use keyboard.type with random delay
      await page.keyboard.type(prompt, { delay: this.randomInt(10, 50) });
    }

    await this.randomDelay(500, 1500);

    // Check for CAPTCHA again before submitting
    if (await this.detectCaptcha()) {
      console.log("⚠️ CAPTCHA detected before submit! Waiting for manual resolution...");
      await this.waitForCaptchaResolution();
    }

    console.log("📝 Pressing Enter to submit...");
    await page.keyboard.press("Enter");

    console.log("⏳ Waiting for response...");

    // Wait for response with CAPTCHA check
    try {
      await page.waitForSelector(this.config.responseSelector, {
        timeout: 60000,
      });
    } catch (e) {
      // Check if CAPTCHA blocked the request
      if (await this.detectCaptcha()) {
        throw new Error("CAPTCHA blocked the request. Please resolve CAPTCHA manually.");
      }
      throw e;
    }

    await this.waitForStreamingFinish();

    await this.scrollLastResponse();

    const text = await this.extractLastResponse();
    const html = await this.extractLastResponseHtml();

    return {
      text: this.cleanText(text),
      html,
    };
  }

private async detectCaptcha(): Promise<boolean> {
    if (!this.page) return false;

    const page = this.page;

    // Check for various CAPTCHA indicators
    const captchaIndicators = await page.evaluate(() => {
      const checks = [
        // Cloudflare challenge
        document.querySelector('[class*="challenge"]'),
        document.querySelector('#cf-challenge-container'),
        document.querySelector('.cf-challenge'),
        document.querySelector('[id*="cf-"]'),
        document.querySelector('.cloudflare-challenge'),
        // reCAPTCHA
        document.querySelector('[class*="recaptcha"]'),
        document.querySelector('iframe[src*="recaptcha"]'),
        document.querySelector('[data-sitekey]'),
        // General CAPTCHA
        document.querySelector('[id*="captcha"]'),
        document.querySelector('[class*="captcha"]'),
        // hCaptcha
        document.querySelector('[class*="hcaptcha"]'),
        document.querySelector('iframe[src*="hcaptcha"]'),
        // Turnstile (Cloudflare)
        document.querySelector('[class*="turnstile"]'),
        document.querySelector('iframe[src*="turnstile"]'),
        // Blocked message
        document.body.innerText.includes("Please verify"),
        document.body.innerText.includes("unusual traffic"),
        document.body.innerText.includes("blocked"),
        document.body.innerText.includes("Checking your browser"),
        document.body.innerText.includes("Cloudflare"),
      ];
      return checks.some(c => c);
    });

    return captchaIndicators;
  }

  private async solveCaptcha(): Promise<boolean> {
    if (!this.page) return false;

    const page = this.page;

    try {
      // Try to find and click Cloudflare "Verify" button
      const verifyButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("Verify")',
        'button:has-text("Continue")',
        '#challenge-button',
        '.challenge-button',
        'button[aria-label*="Verify"]',
      ];

      for (const sel of verifyButtonSelectors) {
        try {
          const btn = await page.waitForSelector(sel, { state: "visible", timeout: 2000 }).catch(() => null);
          if (btn) {
            await btn.click();
            console.log(`✅ Clicked verify button: ${sel}`);
            await this.randomDelay(2000, 4000);
            
            // Check if CAPTCHA is resolved
            if (!(await this.detectCaptcha())) {
              return true;
            }
          }
        } catch {}
      }

      // Try reCAPTCHA
      const recaptchas = await page.$$('iframe[src*="recaptcha"]');
      if (recaptchas.length > 0) {
        console.log("🔄 Found reCAPTCHA, attempting to solve...");
        // Plugin will handle this
        return false;
      }

      // Try Turnstile
      const turnstiles = await page.$$('iframe[src*="turnstile"]');
      if (turnstiles.length > 0) {
        console.log("🔄 Found Turnstile challenge...");
        // Click the challenge frame
        for (const ts of turnstiles) {
          await ts.click();
          await this.randomDelay(1000, 2000);
        }
        return false;
      }

    } catch (e) {
      console.log("⚠️ Error solving captcha:", e);
    }

    return false;
  }

  private async waitForCaptchaResolution(): Promise<void> {
    console.log("⚠️ CAPTCHA detected!");

    // First, try to auto-solve
    const solved = await this.solveCaptcha();
    if (solved && !(await this.detectCaptcha())) {
      console.log("✅ CAPTCHA resolved automatically!");
      return;
    }

    // Try auto-solve with plugin if API key is configured
    if (process.env.RECAPTCHA_API_KEY) {
      console.log("🔄 Attempting auto-solve with 2Captcha...");
      try {
        if (this.page) {
          // Use the recaptcha plugin to solve
          const result = await this.page.solveRecaptchas();
          if (result.solved.length > 0) {
            console.log("✅ CAPTCHA auto-solved successfully!");
            await this.randomDelay(2000, 4000);
            return;
          }
        }
      } catch (e) {
        console.log("❌ Auto-solve failed:", e);
      }
    } else {
      console.log("💡 Set RECAPTCHA_API_KEY in .env to enable auto-solve");
    }

    // Fallback to manual resolution
    console.log("⏳ Waiting for manual CAPTCHA resolution (press Enter when done)...");

    // Wait for Enter key in console
    await new Promise<void>((resolve) => {
      process.stdin.resume();
      process.stdin.once("data", () => resolve());
    });

    // Wait a bit more after resolution
    await this.randomDelay(2000, 4000);
  }

  private async dismissPopups() {
    if (!this.page) return;

    const page = this.page;
    
    try {
      await page.evaluate(() => {
        const dismissButtons = [
          'button[aria-label*="Accept"]',
          'button[aria-label*="Reject"]',
          'button[text*="Accept"]',
          'button[text*="Reject"]',
          'button:has-text("Accept")',
          'button:has-text("Reject")',
          'button:has-text("I agree")',
          'button:has-text("Got it")',
          'button:has-text("Allow")',
          'button:has-text("Allow all")',
          'button:has-text("Close")',
        ];
        for (const sel of dismissButtons) {
          const btn = document.querySelector(sel);
          if (btn instanceof HTMLElement) {
            btn.click();
          }
        }
      });
    } catch {}

    await this.randomDelay(500, 1000);
  }

  private async humanLikeScroll() {
    if (!this.page) return;

    const page = this.page;

    // Random number of scrolls
    const scrollCount = this.randomInt(1, 3);

    for (let i = 0; i < scrollCount; i++) {
      const { scrollHeight, viewportHeight } = await page.evaluate(() => ({
        scrollHeight: document.body.scrollHeight,
        viewportHeight: window.innerHeight,
      }));

      const maxScroll = scrollHeight - viewportHeight;

      if (maxScroll > 0) {
        const scrollAmount = Math.random() * (maxScroll * 0.3);
        await page.evaluate((y) => window.scrollBy(0, y), scrollAmount);
        await this.randomDelay(300, 800);
      }
    }

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  private async humanLikeMoveToInput(input: ElementHandle) {
    if (!this.page) return;

    // Get bounding box of input
    const box = await input.boundingBox();
    if (!box) return;

    // Get viewport size
    const viewport = this.page.viewportSize();
    if (!viewport) return;

    // Start from a random position within viewport
    const startX = this.randomInt(50, viewport.width - 50);
    const startY = this.randomInt(50, viewport.height - 50);

    // Move mouse in bezier-like curve (approximated with multiple points)
    const points = 8;
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const x = startX + (box.x + box.width / 2 - startX) * this.easeInOutCubic(t);
      const y = startY + (box.y + box.height / 2 - startY) * this.easeInOutCubic(t);
      
      // Add some randomness
      const jitterX = (Math.random() - 0.5) * 10;
      const jitterY = (Math.random() - 0.5) * 10;
      
      await this.page.mouse.move(x + jitterX, y + jitterY);
      await this.randomDelay(20, 50);
    }
  }

  private async humanType(text: string) {
    if (!this.page) return;

    for (const char of text) {
      await this.page.keyboard.type(char, { delay: this.randomInt(20, 80) });
      
      // Occasional longer pauses (like thinking)
      if (Math.random() < 0.05) {
        await this.randomDelay(100, 300);
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private async waitForStreamingFinish() {
    if (!this.page) return;

    const page = this.page;

    let lastLength = 0;
    let stableCount = 0; // số lần liên tiếp length không đổi
    const STABLE_REQUIRED = 3; // cần 3 lần liên tiếp mới coi là xong
    const MIN_LENGTH = 50; // phải có ít nhất 50 ký tự, tránh đọc placeholder

    for (let i = 0; i < 60; i++) {
      // tăng max lên 60s
      await page.waitForTimeout(1000);

      const responses = await page.$$(this.config.responseSelector);
      if (!responses.length) {
        stableCount = 0;
        continue;
      }

      const last = responses[responses.length - 1];
      const text = await last.textContent();
      const length = text?.length || 0;

      if (length === lastLength && length >= MIN_LENGTH) {
        stableCount++;
        if (stableCount >= STABLE_REQUIRED) {
          return; // stable đủ lần → streaming xong thật
        }
      } else {
        stableCount = 0; // reset nếu vẫn đang thay đổi
        lastLength = length;
      }
    }
  }

  private async scrollLastResponse() {
    if (!this.page) return;

    await this.page.evaluate((selector) => {
      const el = document.querySelector(`${selector}:last-child`);
      if (el) {
        el.scrollIntoView({
          behavior: "auto",
          block: "end",
        });
      }
    }, this.config.responseSelector);

    await this.page.waitForTimeout(1000);
  }

  private async extractLastResponse(): Promise<string> {
    if (!this.page) {
      throw new Error("Page not available");
    }

    const responses = await this.page.$$(this.config.responseSelector);

    if (!responses.length) {
      throw new Error("Response not found");
    }

    const last = responses[responses.length - 1];
    return (await last.textContent()) ?? "";
  }

  private async extractLastResponseHtml(): Promise<string> {
    if (!this.page) {
      throw new Error("Page not available");
    }

    const responses = await this.page.$$(this.config.responseSelector);

    if (!responses.length) return "";

    const last = responses[responses.length - 1];

    // Evaluate inside the page context to get innerHTML
    return (await last.evaluate((el: Element) => el.innerHTML)) ?? "";
  }

  private cleanText(text: string): string {
    return text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s+/g, " ")
      .replace(/Copy code/g, "")
      .trim();
  }

  protected async randomDelay(min: number, max: number) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;

    await new Promise((r) => setTimeout(r, delay));
  }

  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
      }
    } catch {}
  }
}

export function getEngine(engineName: string): BaseEngine {
  const normalized = engineName.toLowerCase().replace(/[^a-z]/g, "");

  switch (normalized) {
    case "chatgpt":
    case "chat":
      return new BaseEngine("ChatGPT");

    case "gemini":
      return new BaseEngine("Gemini");

    case "claude":
      return new BaseEngine("Claude");

    default:
      throw new Error(`Unsupported engine: ${engineName}`);
  }
}
