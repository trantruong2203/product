import { Page, BrowserContext } from "playwright";
import { browserPool } from "../browsers/browserPool.js";

export interface EngineConfig {
  name: string;
  url: string;
  inputSelector: string;
  responseSelector: string;
  waitAfterSubmit?: number;
}

export const ENGINE_CONFIGS: Record<string, EngineConfig> = {

  ChatGPT: {
    name: "ChatGPT",
    url: "https://chatgpt.com/?model=gpt-4o",
    inputSelector: 'div[contenteditable="true"]',
    responseSelector: 'div[data-message-author-role="assistant"]',
    waitAfterSubmit: 5000,
  },

  Perplexity: {
    name: "Perplexity",
    url: "https://www.perplexity.ai",
    inputSelector: "textarea",
    responseSelector: 'div[data-testid="answer"]',
    waitAfterSubmit: 4000,
  },

  Gemini: {
    name: "Gemini",
    url: "https://gemini.google.com",
    inputSelector: "textarea",
    responseSelector: ".response-content, .markdown",
    waitAfterSubmit: 5000,
  },

  Claude: {
    name: "Claude",
    url: "https://claude.ai",
    inputSelector: "textarea",
    responseSelector: ".assistant-message",
    waitAfterSubmit: 5000,
  },
};

export class BaseEngine {

  protected config: EngineConfig;
  protected context?: BrowserContext;
  protected page?: Page;

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

    await this.page.setViewportSize({
      width: 1280,
      height: 800
    });

    await this.page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9"
    });

  }

  async query(prompt: string): Promise<string> {

    if (!this.page) {
      throw new Error("Browser not initialized.");
    }

    const page = this.page;

    await page.goto(this.config.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await this.randomDelay(2000, 4000);

    const input = await page.waitForSelector(
      this.config.inputSelector,
      { timeout: 30000 }
    );

    await input.click();

    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");

    await page.keyboard.type(prompt, { delay: 20 });

    await this.randomDelay(300, 1000);

    await page.keyboard.press("Enter");

    await page.waitForSelector(
      this.config.responseSelector,
      { timeout: 60000 }
    );

    await this.waitForStreamingFinish();

    await this.scrollLastResponse();

    const text = await this.extractLastResponse();

    return this.cleanText(text);

  }

  private async waitForStreamingFinish() {

    if (!this.page) return;

    const page = this.page;

    let lastLength = 0;

    for (let i = 0; i < 30; i++) {

      await page.waitForTimeout(1000);

      const responses = await page.$$(this.config.responseSelector);

      if (!responses.length) continue;

      const last = responses[responses.length - 1];

      const text = await last.textContent();

      const length = text?.length || 0;

      if (length === lastLength) {
        return;
      }

      lastLength = length;

    }

  }

  private async scrollLastResponse() {

    if (!this.page) return;

    await this.page.evaluate(() => {

      const el = document.querySelector(
        'div[data-message-author-role="assistant"]:last-child'
      );

      if (el) {
        el.scrollIntoView({
          behavior: "auto",
          block: "end"
        });
      }

    });

    await this.page.waitForTimeout(1000);

  }

  private async extractLastResponse(): Promise<string> {

    if (!this.page) {
      throw new Error("Page not available");
    }

    const responses = await this.page.$$(
      this.config.responseSelector
    );

    if (!responses.length) {
      throw new Error("Response not found");
    }

    const last = responses[responses.length - 1];

    const text = await last.textContent();

    return text || "";

  }

  private cleanText(text: string): string {

    return text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s+/g, " ")
      .replace(/Copy code/g, "")
      .trim();

  }

  protected async randomDelay(min: number, max: number) {

    const delay =
      Math.floor(Math.random() * (max - min + 1)) + min;

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

  const normalized = engineName
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  switch (normalized) {

    case "chatgpt":
    case "chat":
      return new BaseEngine("ChatGPT");

    case "perplexity":
      return new BaseEngine("Perplexity");

    case "gemini":
      return new BaseEngine("Gemini");

    case "claude":
      return new BaseEngine("Claude");

    default:
      throw new Error(`Unsupported engine: ${engineName}`);

  }

}