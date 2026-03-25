/**
 * Base engine class with common functionality for all AI chat engines
 * Optimized for GEO scoring - minimal footprint, fast execution
 */

import { Page, BrowserContext, ElementHandle } from "playwright";
import { IEngine, QueryResult, EngineConfig, EngineSelectors, EngineOptions } from "./IEngine.js";
import { browserPool } from "../browsers/browserPool.js";

export abstract class EngineBase implements IEngine {
  readonly name: string;
  readonly url: string;
  protected config: EngineConfig;
  protected selectors: EngineSelectors;
  protected options: EngineOptions;
  protected context?: BrowserContext;
  protected page?: Page;
  protected requestCount = 0;

  constructor(
    config: EngineConfig,
    selectors: EngineSelectors,
    options: EngineOptions = {}
  ) {
    this.name = config.name;
    this.url = config.url;
    this.config = config;
    this.selectors = selectors;
    this.options = {
      pageLoadWait: 2000,
      submitWait: 1000,
      maxResponseWait: 60000,
      useEnterToSubmit: true,
      useSubmitButton: false,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    this.context = await browserPool.getContext(this.name);
    this.page = await this.context.newPage();
    await this.page.setViewportSize({ width: 1280, height: 800 });
    await this.onInitialize();
  }

  protected async onInitialize(): Promise<void> {
    // Override in subclasses if needed
  }

  async query(prompt: string): Promise<QueryResult> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }

    this.requestCount++;

    if (!(await this.isLoggedIn())) {
      throw new Error(`Not logged in to ${this.name}. Please run login script first.`);
    }

    await this.navigateToChat();
    await this.waitForReady();

    const inputElement = await this.findInputField();
    if (!inputElement) {
      throw new Error(`Could not find input field for ${this.name}`);
    }

    await this.typePrompt(inputElement, prompt);
    await this.submitPrompt();
    await this.waitForResponse();

    // Extract response
    const text = await this.extractResponseText();
    const html = await this.extractResponseHtml();

    return {
      text: this.cleanText(text),
      html,
    };
  }

  protected async navigateToChat(): Promise<void> {
    if (!this.page) return;

    const currentUrl = this.page.url();
    const baseUrl = this.config.baseUrl || this.url;

    if (currentUrl.includes(baseUrl)) {
      await this.onAlreadyOnPage();
      return;
    }

    await this.page.goto(this.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await this.randomDelay(this.options.pageLoadWait!, this.options.pageLoadWait! + 1000);
  }

  protected async onAlreadyOnPage(): Promise<void> {
    if (!this.page) return;
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.randomDelay(500, 1000);
  }

  protected async dismissModals(): Promise<void> {
    if (!this.page) return;

    const dismissSelectors = [
      'button:has-text("Accept")',
      'button:has-text("Accept all")',
      'button[aria-label*="Close"]',
      'button:has-text("Got it")',
    ];

    for (const selector of dismissSelectors) {
      try {
        const button = await this.page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          await this.randomDelay(300, 600);
          break;
        }
      } catch {
        // Ignore
      }
    }
  }

  protected async scrollToBottom(): Promise<void> {
    if (!this.page) return;
    await this.page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });
    });
    await this.randomDelay(300, 600);
  }

  protected async waitForButtonEnabled(selectors: string[]): Promise<void> {
    if (!this.page) return;

    for (const selector of selectors) {
      try {
        const button = await this.page.$(selector);
        if (button) {
          const isEnabled = await button.isEnabled();
          if (!isEnabled) {
            await this.page
              .waitForFunction(
                (btn) => btn instanceof HTMLButtonElement && btn.disabled === false,
                button,
                { timeout: 5000 }
              )
              .catch(() => {});
          }
          break;
        }
      } catch {
        continue;
      }
    }
  }

  protected async findInputField(): Promise<ElementHandle | null> {
    if (!this.page) return null;

    const engineSelectors = Array.isArray(this.selectors.input)
      ? this.selectors.input
      : [this.selectors.input];

    const allSelectors = [
      ...engineSelectors,
      'div[contenteditable="true"][role="textbox"]',
      'textarea[placeholder*="essage"]',
      'textarea[placeholder*="rompt"]',
      'textarea[aria-label*="message"]',
      '#prompt-textarea',
      'form textarea',
      'textarea',
    ];

    for (const selector of allSelectors) {
      try {
        const element = await this.page.waitForSelector(selector, {
          state: "visible",
          timeout: 2000,
        });
        if (element) {
          return element;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  protected async typePrompt(input: ElementHandle, prompt: string): Promise<void> {
    if (!this.page) return;

    await input.click({ force: true });
    await this.randomDelay(150, 400);

    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.randomDelay(100, 200);

    const isContentEditable = await input.evaluate((el: Element) => {
      return el.getAttribute("contenteditable") === "true" || el instanceof HTMLTextAreaElement;
    });

    if (isContentEditable) {
      await this.humanType(prompt);
    } else {
      await this.page.keyboard.type(prompt, { delay: this.randomInt(10, 50) });
    }

    await this.randomDelay(300, 800);
  }

  protected async submitPrompt(): Promise<void> {
    if (!this.page) return;

    if (this.options.useSubmitButton && this.selectors.submit) {
      const submitSelectors = Array.isArray(this.selectors.submit)
        ? this.selectors.submit
        : [this.selectors.submit];

      for (const selector of submitSelectors) {
        try {
          const button = await this.page.waitForSelector(selector, {
            state: "visible",
            timeout: 3000,
          });
          if (button) {
            await button.click();
            break;
          }
        } catch {
          continue;
        }
      }
    } else if (this.options.useEnterToSubmit) {
      await this.page.keyboard.press("Enter");
    }

    await this.randomDelay(this.options.submitWait!, this.options.submitWait! + 500);
  }

  protected async waitForResponse(): Promise<void> {
    if (!this.page) return;

    await this.dismissModals();

    const selectors = Array.isArray(this.selectors.response)
      ? this.selectors.response
      : [this.selectors.response];

    let responseElement: ElementHandle | null = null;
    for (const selector of selectors) {
      try {
        responseElement = await this.page.waitForSelector(selector, {
          state: "attached",
          timeout: this.options.maxResponseWait,
        });
        if (responseElement) break;
      } catch {
        continue;
      }
    }

    if (!responseElement) {
      throw new Error("No response element found after timeout");
    }

    await this.waitForStreamingFinish();
  }

  protected async scrollInputIntoView(inputElement: ElementHandle): Promise<void> {
    if (!this.page) return;
    try {
      await inputElement.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: "auto", block: "center" });
      });
      await this.randomDelay(200, 400);
    } catch {
      // Ignore
    }
  }

  protected async waitForStreamingFinish(): Promise<void> {
    if (!this.page) return;

    const selectors = Array.isArray(this.selectors.response)
      ? this.selectors.response
      : [this.selectors.response];

    let lastLength = 0;
    let stableCount = 0;
    const STABLE_REQUIRED = 3;
    const MIN_LENGTH = 50;
    const MAX_WAIT_SECONDS = 120;

    for (let i = 0; i < MAX_WAIT_SECONDS; i++) {
      await this.page.waitForTimeout(1000);

      let currentLength = 0;
      for (const selector of selectors) {
        try {
          const responses = await this.page.$$(selector);
          if (responses.length > 0) {
            const last = responses[responses.length - 1];
            const text = await last.textContent();
            currentLength = text?.length || 0;
            break;
          }
        } catch {
          continue;
        }
      }

      if (currentLength === 0) continue;

      if (currentLength === lastLength && currentLength >= MIN_LENGTH) {
        stableCount++;
        if (stableCount >= STABLE_REQUIRED) return;
      } else {
        stableCount = 0;
        lastLength = currentLength;
      }
    }
  }

  protected async extractResponseText(): Promise<string> {
    if (!this.page) return "";

    const selectors = Array.isArray(this.selectors.response)
      ? this.selectors.response
      : [this.selectors.response];

    for (const selector of selectors) {
      try {
        const responses = await this.page.$$(selector);
        if (responses.length > 0) {
          const last = responses[responses.length - 1];
          const text = await last.textContent();
          if (text) return text;
        }
      } catch {
        continue;
      }
    }

    return "";
  }

  protected async extractResponseHtml(): Promise<string> {
    if (!this.page) return "";

    const selectors = Array.isArray(this.selectors.response)
      ? this.selectors.response
      : [this.selectors.response];

    for (const selector of selectors) {
      try {
        const responses = await this.page.$$(selector);
        if (responses.length > 0) {
          const last = responses[responses.length - 1];
          const html = await last.evaluate((el: Element) => el.innerHTML);
          if (html) return html;
        }
      } catch {
        continue;
      }
    }

    return "";
  }

  async isLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    if (this.selectors.loginButton) {
      const loginSelectors = Array.isArray(this.selectors.loginButton)
        ? this.selectors.loginButton
        : [this.selectors.loginButton];

      for (const selector of loginSelectors) {
        try {
          const loginBtn = await this.page.$(selector);
          if (loginBtn && await loginBtn.isVisible()) {
            return false;
          }
        } catch {
          continue;
        }
      }
    }

    if (this.selectors.loggedInIndicator) {
      const indicatorSelectors = Array.isArray(this.selectors.loggedInIndicator)
        ? this.selectors.loggedInIndicator
        : [this.selectors.loggedInIndicator];

      for (const selector of indicatorSelectors) {
        try {
          const indicator = await this.page.$(selector);
          if (indicator && await indicator.isVisible()) {
            return true;
          }
        } catch {
          continue;
        }
      }
    }

    return true;
  }

  async waitForReady(): Promise<void> {
    if (!this.page) return;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const input = await this.findInputField();
        if (input) {
          await this.randomDelay(500, 1000);
          return;
        }
      } catch {
        // Ignore
      }

      attempts++;
      if (attempts < maxAttempts) {
        await this.randomDelay(1000, 2000);
      }
    }

    throw new Error("Input field not available after retries");
  }

  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = undefined;
    }
  }

  async takeScreenshot(): Promise<string | null> {
    if (!this.page) return null;

    try {
      const screenshot = await this.page.screenshot({ type: "png", fullPage: true });
      const base64Screenshot = Buffer.isBuffer(screenshot)
        ? screenshot.toString('base64')
        : Buffer.from(screenshot as ArrayBuffer).toString('base64');
      return base64Screenshot;
    } catch {
      return null;
    }
  }

  /**
   * Clear old messages from DOM to reduce memory usage
   */
  protected async clearPageCache(): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.evaluate(() => {
        const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
        userMessages.forEach(el => el.remove());
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Simple human-like typing with variable delays
   */
  protected async humanType(text: string): Promise<void> {
    if (!this.page) return;

    const chars = text.split("");
    for (const char of chars) {
      if (char === " ") {
        await this.page.keyboard.press("Space");
        await this.randomDelay(20, 100);
      } else if (char === "\n") {
        await this.page.keyboard.press("Enter");
        await this.randomDelay(30, 150);
      } else {
        await this.page.keyboard.type(char, { delay: this.randomInt(10, 60) });
        // Occasional pause (3% chance)
        if (Math.random() < 0.03) {
          await this.randomDelay(100, 300);
        }
      }
    }
  }

  protected cleanText(text: string): string {
    return text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s+/g, " ")
      .replace(/Copy code/g, "")
      .trim();
  }

  protected async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  protected randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
