import { BrowserContext } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as path from "path";
import * as fs from "fs";

chromium.use(StealthPlugin());

const profileDir = path.join(process.cwd(), "chrome-profile");

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

export class BrowserPool {

  private contexts: Map<string, BrowserContext> = new Map();

  async getContext(engine: string): Promise<BrowserContext> {

    engine = engine.toLowerCase();

    if (this.contexts.has(engine)) {
      return this.contexts.get(engine)!;
    }

    console.log(`Launching persistent browser for ${engine}`);

    const context = await chromium.launchPersistentContext(
      path.join(profileDir, engine),
      {
        channel: "chrome",
        headless: false,

        viewport: {
          width: 1280,
          height: 800
        },

        locale: "en-US",

        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",

        args: [
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-dev-shm-usage"
        ]
      }
    );

    this.contexts.set(engine, context);

    return context;
  }

  async closeContext(engine: string) {

    engine = engine.toLowerCase();

    const context = this.contexts.get(engine);

    if (!context) return;

    await context.close();

    this.contexts.delete(engine);

    console.log(`Closed browser for ${engine}`);
  }

  async closeAll() {

    for (const engine of this.contexts.keys()) {

      await this.closeContext(engine);

    }

  }

}

export const browserPool = new BrowserPool();