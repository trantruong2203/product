import { BrowserContext, Browser } from "playwright";
import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

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

function removeChromiumSingletonLocks(userDataDir: string): void {
  const lockFiles = ["SingletonLock", "SingletonCookie", "SingletonSocket"];
  for (const file of lockFiles) {
    const filePath = path.join(userDataDir, file);
    try {
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { force: true });
      }
    } catch {
      // Ignore lock cleanup errors; launch retry may still work.
    }
  }
}

function resetEngineProfile(userDataDir: string): void {
  try {
    if (fs.existsSync(userDataDir)) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
    fs.mkdirSync(userDataDir, { recursive: true });
  } catch (error) {
    console.warn("⚠️ Failed to reset engine profile directory:", error);
  }
}

export class BrowserPool {
  private contexts: Map<string, BrowserContext> = new Map();
  private browser?: Browser;
  
  // Memory limit: maximum number of browser contexts to keep open
  // Adjust based on available RAM (each context ~150-300MB)
  private readonly maxContexts = parseInt(process.env.MAX_BROWSER_CONTEXTS || "2", 10);

  async getContext(engine: string): Promise<BrowserContext> {
    engine = engine.toLowerCase();

    // Check and enforce max context limit
    if (this.contexts.size >= this.maxContexts) {
      const oldestEngine = this.contexts.keys().next().value;
      if (oldestEngine && oldestEngine !== engine) {
        console.log(`[BrowserPool] Max contexts (${this.maxContexts}) reached, closing oldest: ${oldestEngine}`);
        await this.closeContext(oldestEngine);
      }
    }

    // Reuse existing context if available and valid
    if (this.contexts.has(engine)) {
      const existingContext = this.contexts.get(engine)!;

      // Check if context is still valid (not closed)
      if (await this.isContextValid(existingContext)) {
        return existingContext;
      }

      // Context was closed or invalid, remove from pool
      console.log(`[BrowserPool] Context for ${engine} is invalid, recreating`);
      this.contexts.delete(engine);
    }

    console.log(
      `[BrowserPool] Launching browser for ${engine} with stealth mode...`,
    );

    const userDataDir = path.join(profileDir, engine);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    // Random configs để tránh bị detect
    const viewport = getRandomViewport();
    const userAgent = getRandomUserAgent();
    const timezone = getRandomTimezone();
    const locale = getRandomLocale();

    console.log(`[BrowserPool] Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`[BrowserPool] Timezone: ${timezone}`);
    console.log(`[BrowserPool] Locale: ${locale}`);

    // Enhanced stealth launch options with memory optimizations
    const launchOptions = {
      headless: true,
      args: [
        // Memory optimization flags for VPS
        "--disable-dev-shm-usage",           // Use tmpfs instead of /dev/shm
        "--disable-gpu",                      // Disable GPU (no GPU on VPS)
        "--disable-software-rasterizer",
        "--disable-gpu-compositing",
        "--disable-gpu-rasterization",
        "--disable-gpu-sandbox",
        "--no-zygote",                       // Disable zygote process
        "--single-process",                  // Single process mode (reduces memory)
        
        // Standard sandbox/security
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        
        // Disable unnecessary features
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
        
        // WebGL/Canvas anti-detection (but disabled for memory)
        "--disable-webgl",
        "--disable-webgl2",
        "--disable-accelerated-2d-canvas",
        
        // Disable unnecessary logging
        "--disable-logging",
        "--log-level=0",
        "--v=0",
        
        // Random window position
        `--window-position=${Math.floor(Math.random() * 1000)},${Math.floor(Math.random() * 500)}`,
      ],
      ignoreDefaultArgs: ["--enable-automation", "--enable-logging"],
      viewport,
      userAgent,
      locale,
      timezoneId: timezone,
      permissions: ["geolocation"],
      extraHTTPHeaders: {
        "Accept-Language": locale,
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      // Reduce memory pressure
      recordHar: undefined,
    };

    let context: BrowserContext;
    try {
      context = await chromium.launchPersistentContext(userDataDir, launchOptions);
    } catch (error) {
      console.warn(
        `[BrowserPool] First launch failed for ${engine}, retrying with cleaned lock files...`,
      );
      removeChromiumSingletonLocks(userDataDir);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        context = await chromium.launchPersistentContext(userDataDir, launchOptions);
      } catch (retryError) {
        console.warn(
          `[BrowserPool] Second launch failed for ${engine}, resetting profile and retrying...`,
        );
        // Profile may be corrupted on local Windows runs. Reset only this engine profile.
        resetEngineProfile(userDataDir);
        await new Promise((resolve) => setTimeout(resolve, 500));
        context = await chromium.launchPersistentContext(
          userDataDir,
          launchOptions,
        );
      }
    }

    // Inject additional stealth scripts
    await this.injectStealthScripts(context);

    this.contexts.set(engine, context);

    // Listen for context close
    context.on("close", () => {
      console.log(`[BrowserPool] Context for ${engine} was closed`);
      this.contexts.delete(engine);
    });

    console.log(`[BrowserPool] Browser launched successfully for ${engine} (active contexts: ${this.contexts.size}/${this.maxContexts})`);
    return context;
  }

  /**
   * Check if a browser context is still valid and usable
   */
  private async isContextValid(context: BrowserContext): Promise<boolean> {
    try {
      const pages = context.pages();
      if (pages.length === 0) return false;
      
      // Try to ping the main page
      await pages[0].evaluate(() => document.readyState);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current number of active contexts
   */
  getContextCount(): number {
    return this.contexts.size;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): { contexts: number; maxContexts: number; heapUsedMB: number } {
    const memoryUsage = process.memoryUsage();
    return {
      contexts: this.contexts.size,
      maxContexts: this.maxContexts,
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    };
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
          {
            name: "Chrome PDF Plugin",
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
          },
          {
            name: "Chrome PDF Viewer",
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
          },
          {
            name: "Native Client",
            description: "",
            filename: "internal-nacl-plugin",
          },
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
          ? Promise.resolve({
              state: Notification.permission,
            } as PermissionStatus)
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
      console.error(`[BrowserPool] Error closing context for ${engine}:`, e);
    }

    this.contexts.delete(engine);
    console.log(`[BrowserPool] Closed browser for ${engine} (active contexts: ${this.contexts.size}/${this.maxContexts})`);
  }

  async closeAll() {
    const contextCount = this.contexts.size;
    for (const engine of this.contexts.keys()) {
      await this.closeContext(engine);
    }

    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {
        console.error(`[BrowserPool] Error closing browser:`, e);
      }
    }

    console.log(`[BrowserPool] All browsers closed (${contextCount} contexts)`);
  }
}

export const browserPool = new BrowserPool();
