import { Browser, BrowserContext } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as path from "path";
import * as fs from "fs";
import { GeoContextOptions, resolveGeoContextOptions } from "../utils/geo.js";

chromium.use(StealthPlugin());

const profileDir = path.join(process.cwd(), "chrome-profile");

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

function cleanupChromeLockFiles(engineProfilePath: string) {
  const lockFiles = [
    "SingletonLock",
    "SingletonSocket",
    "SingletonCookie"
  ];

  for (const lockFile of lockFiles) {
    const lockPath = path.join(engineProfilePath, lockFile);
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch {}
  }
}

export class BrowserPool {

  private browser?: Browser;
  private contexts: Map<string, BrowserContext> = new Map();

  private async ensureBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    console.log("Launching browser...");

    this.browser = await chromium.launch({
      channel: "chrome",
      executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      headless: false,

      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage"
      ]
    });

    this.browser.on("disconnected", () => {
      console.log("Browser disconnected");
      this.browser = undefined;
    });

    return this.browser;
  }

  async getContext(
    engine: string,
    geo?: GeoContextOptions
  ): Promise<BrowserContext> {

    engine = engine.toLowerCase();

    const resolvedGeo = resolveGeoContextOptions(geo);
    const contextKey = [
      engine,
      resolvedGeo.locale,
      resolvedGeo.timezoneId || "",
      resolvedGeo.geolocation ? `${resolvedGeo.geolocation.latitude},${resolvedGeo.geolocation.longitude}` : "",
    ].join("|");

    const existingContext = this.contexts.get(contextKey);
    if (existingContext) {
      const b = existingContext.browser();
      if (b && b.isConnected()) {
        return existingContext;
      }
      this.contexts.delete(contextKey);
    }

    console.log(`Creating context for ${engine} (${resolvedGeo.locale})`);

    const browser = await this.ensureBrowser();
    const engineProfilePath = path.join(profileDir, engine);
    cleanupChromeLockFiles(engineProfilePath);

    const context = await browser.newContext({
      // @ts-ignore - userDataDir is valid but not in types
      userDataDir: engineProfilePath,

      viewport: {
        width: 1280,
        height: 800
      },

      locale: resolvedGeo.locale,
      timezoneId: resolvedGeo.timezoneId,
      geolocation: resolvedGeo.geolocation,
      permissions: resolvedGeo.geolocation ? ["geolocation"] : [],

      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",

      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage"
      ]
    });

    this.contexts.set(contextKey, context);

    return context;
  }

  async closeContext(engine: string) {
    engine = engine.toLowerCase();

    const keysToClose = Array.from(this.contexts.keys()).filter(
      (k) => k === engine || k.startsWith(`${engine}|`),
    );

    if (!keysToClose.length) return;

    for (const key of keysToClose) {
      const ctx = this.contexts.get(key);
      if (!ctx) continue;
      await ctx.close();
      this.contexts.delete(key);
    }

    console.log(`Closed contexts for ${engine}`);
  }

  async closeAll() {

    const keys = Array.from(this.contexts.keys());
    for (const key of keys) {
      const ctx = this.contexts.get(key);
      if (!ctx) continue;
      await ctx.close();
      this.contexts.delete(key);
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }

  }

}

export const browserPool = new BrowserPool();
