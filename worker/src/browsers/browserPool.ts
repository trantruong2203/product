import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { config } from '../config/index.js';
import * as fs from 'fs';
import * as path from 'path';

export interface SessionData {
  cookies: any[];
  origin: string;
}

const sessionsDir = path.join(process.cwd(), 'sessions');

if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

export class BrowserPool {
  private browsers: Map<string, Browser> = new Map();
  private contexts: Map<string, BrowserContext> = new Map();

  async getBrowser(engine: string): Promise<Browser> {
    if (this.browsers.has(engine)) {
      return this.browsers.get(engine)!;
    }

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    this.browsers.set(engine, browser);
    return browser;
  }

  async getContext(engine: string): Promise<BrowserContext> {
    if (this.contexts.has(engine)) {
      return this.contexts.get(engine)!;
    }

    const browser = await this.getBrowser(engine);
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
    });

    await this.loadSession(context, engine);
    this.contexts.set(engine, context);

    return context;
  }

  async loadSession(context: BrowserContext, engine: string): Promise<void> {
    const sessionPath = path.join(sessionsDir, `${engine}.json`);
    if (fs.existsSync(sessionPath)) {
      try {
        const sessionData: SessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
        await context.addCookies(sessionData.cookies);
        console.log(`Loaded session for ${engine}`);
      } catch (error) {
        console.error(`Failed to load session for ${engine}:`, error);
      }
    }
  }

  async saveSession(context: BrowserContext, engine: string): Promise<void> {
    const cookies = await context.cookies();
    const sessionData: SessionData = {
      cookies,
      origin: engine,
    };
    const sessionPath = path.join(sessionsDir, `${engine}.json`);
    fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
    console.log(`Saved session for ${engine}`);
  }

  async closeContext(engine: string): Promise<void> {
    const context = this.contexts.get(engine);
    if (context) {
      await this.saveSession(context, engine);
      await context.close();
      this.contexts.delete(engine);
    }
  }

  async closeBrowser(engine: string): Promise<void> {
    await this.closeContext(engine);
    const browser = this.browsers.get(engine);
    if (browser) {
      await browser.close();
      this.browsers.delete(engine);
    }
  }

  async closeAll(): Promise<void> {
    for (const engine of this.browsers.keys()) {
      await this.closeBrowser(engine);
    }
  }
}

export const browserPool = new BrowserPool();
