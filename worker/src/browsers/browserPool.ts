import { BrowserContext, Browser } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import anonymizeUA from "puppeteer-extra-plugin-anonymize-ua";
import recaptcha from "puppeteer-extra-plugin-recaptcha";
import * as path from "path";
import * as fs from "fs";

// Enable stealth plugins
chromium.use(stealth());
chromium.use(anonymizeUA());

// Enable reCAPTCHA solver (requires API key for auto-solve)
// For manual solve, it will show the captcha for user to solve
chromium.use(
  recaptcha({
    provider: {
      id: "2captcha",
      token: process.env.RECAPTCHA_API_KEY || "", // Set your 2Captcha API key in .env
    },
    visualFeedback: true,
  })
);

const profileDir = path.join(process.cwd(), "chrome-profile");

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

// Random user agent pool
const userAgentPool: string[] = [
  // Chrome on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  // Chrome on Mac
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  // Chrome on Linux
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  // Edge on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
];

function getRandomUserAgent(): string {
  return userAgentPool[Math.floor(Math.random() * userAgentPool.length)];
}

function getRandomViewport(): { width: number; height: number } {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1200 },
    { width: 2560, height: 1440 },
  ];
  return viewports[Math.floor(Math.random() * viewports.length)];
}

function getRandomTimezone(): string {
  const timezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "America/Vancouver",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Asia/Hong_Kong",
    "Australia/Sydney",
  ];
  return timezones[Math.floor(Math.random() * timezones.length)];
}

function getRandomLocale(): string {
  const locales = [
    "en-US,en;q=0.9",
    "en-US,en;q=0.9,vi;q=0.8",
    "en-GB,en;q=0.9",
    "en-CA,en;q=0.9",
    "en-AU,en;q=0.9",
    "en-US,en;q=0.9,ja;q=0.8",
    "en-US,en;q=0.9,zh-CN;q=0.8",
    "en-US,en;q=0.9,ko;q=0.8",
  ];
  return locales[Math.floor(Math.random() * locales.length)];
}

export class BrowserPool {
  private contexts: Map<string, BrowserContext> = new Map();
  private browser?: Browser;

  async getContext(engine: string): Promise<BrowserContext> {
    engine = engine.toLowerCase();

    // Reuse existing context if available
    if (this.contexts.has(engine)) {
      const existingContext = this.contexts.get(engine)!;

      // Check if context is still valid (not closed)
      if (existingContext.pages().length > 0 || existingContext.browser()) {
        return existingContext;
      }

      // Context was closed, remove from pool
      this.contexts.delete(engine);
    }

    console.log(`🚀 Launching browser for ${engine} with stealth + recaptcha mode...`);

    const userDataDir = path.join(profileDir, engine);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    // Random configs để tránh bị detect
    const viewport = getRandomViewport();
    const userAgent = getRandomUserAgent();
    const timezone = getRandomTimezone();
    const locale = getRandomLocale();

    console.log(`   📐 Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`   🌍 Timezone: ${timezone}`);
    console.log(`   🌐 Locale: ${locale}`);

    // Enhanced stealth launch options
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chrome",
      headless: false, // Set true on server with xvfb
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--no-first-run",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-client-side-phishing-detection",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-features=TranslateUI",
        "--disable-hang-monitor",
        "--disable-ipc-flooding-protection",
        "--disable-popup-blocking",
        "--disable-prompt-on-repost",
        "--disable-renderer-backgrounding",
        "--disable-sync",
        "--disable-translate",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--safebrowsing-disable-auto-update",
        "--ignore-gpu-blocklist",
        "--enable-features=VaapiVideoDecoder",
        "--disable-webgl",
        "--disable-webgl2",
        `--window-position=${Math.floor(Math.random() * 1000)},${Math.floor(Math.random() * 500)}`,
      ],
      ignoreDefaultArgs: [
        "--enable-automation",
        "--enable-logging",
      ],
      viewport,
      userAgent,
      locale,
      timezoneId: timezone,
      permissions: ["geolocation"],
      extraHTTPHeaders: {
        "Accept-Language": locale,
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    // Inject additional stealth scripts
    await this.injectStealthScripts(context);

    this.contexts.set(engine, context);

    // Listen for context close
    context.on("close", () => {
      console.log(`⚠️ Context for ${engine} was closed`);
      this.contexts.delete(engine);
    });

    return context;
  }

  private async injectStealthScripts(context: BrowserContext): Promise<void> {
    const page = await context.newPage();

    // Override webdriver property
    await page.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
        configurable: true,
      });

      // Override plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => [
          { name: "Chrome PDF Plugin", description: "Portable Document Format", filename: "internal-pdf-viewer" },
          { name: "Chrome PDF Viewer", description: "", filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai" },
          { name: "Native Client", description: "", filename: "internal-nacl-plugin" },
        ],
        configurable: true,
      });

      // Override languages
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
        configurable: true,
      });

      // Add chrome runtime
      (window as any).chrome = {
        runtime: {
          lastError: null,
          connect: () => ({ onDisconnect: {}, onMessage: {} }),
          sendMessage: () => {},
        },
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);

      // Override Notification
      window.Notification = {
        permission: "default",
        requestPermission: () => Promise.resolve("default"),
      } as any;

      // Randomize chrome runtime
      Object.defineProperty(navigator, "chrome", {
        get: () => ({
          runtime: {
            lastError: null,
            id: "fakeextensionid" + Math.random().toString(36).substring(7),
          },
        }),
        configurable: true,
      });

      // Add fake performance entries
      const originalNow = performance.now;
      Object.defineProperty(performance, "now", {
        get: () => originalNow() + Math.random() * 100,
        configurable: true,
      });

      // Randomize screen properties
      Object.defineProperty(screen, "colorDepth", {
        get: () => 24,
        configurable: true,
      });

      Object.defineProperty(screen, "pixelDepth", {
        get: () => 24,
        configurable: true,
      });

      // Override platform
      Object.defineProperty(navigator, "platform", {
        get: () => "Win32",
        configurable: true,
      });

      // Override hardware concurrency
      Object.defineProperty(navigator, "hardwareConcurrency", {
        get: () => Math.floor(Math.random() * 4) + 4, // 4-8 cores
        configurable: true,
      });

      // Override device memory
      Object.defineProperty(navigator, "deviceMemory", {
        get: () => 8,
        configurable: true,
      });

      // Override maxTouchPoints
      Object.defineProperty(navigator, "maxTouchPoints", {
        get: () => 0,
        configurable: true,
      });

      // Remove automation detection
      (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array = window.Array;
      (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Object = window.Object;
      (window as any).cdc_adoQpoasnfa76pfcZLmcfl_String = window.String;
      (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Number = window.Number;
    });

    await page.close();
  }

  async closeContext(engine: string) {
    engine = engine.toLowerCase();

    const context = this.contexts.get(engine);
    if (!context) return;

    try {
      await context.close();
    } catch (e) {
      console.error(`Error closing context for ${engine}:`, e);
    }

    this.contexts.delete(engine);
    console.log(`✅ Closed browser for ${engine}`);
  }

  async closeAll() {
    for (const engine of this.contexts.keys()) {
      await this.closeContext(engine);
    }

    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {}
    }

    console.log("✅ All browsers closed");
  }
}

export const browserPool = new BrowserPool();
