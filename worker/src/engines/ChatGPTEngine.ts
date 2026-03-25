/**
 * ChatGPT engine implementation
 * Optimized selectors for GEO scoring
 */

import { EngineBase } from "./EngineBase.js";
import { EngineConfig, EngineSelectors, EngineOptions } from "./IEngine.js";

const CHATGPT_CONFIG: EngineConfig = {
  name: "ChatGPT",
  url: "https://chatgpt.com/",
  baseUrl: "chatgpt.com",
};

const CHATGPT_SELECTORS: EngineSelectors = {
  input: [
    'div[data-testid="prompt-textarea"]',
    'div[contenteditable="true"][role="textbox"]',
  ],
  response: [
    '[data-message-author-role="assistant"]',
    ".markdown.prose",
  ],
  loginButton: [
    'button:has-text("Log in")',
    'a[href*="/login"]',
  ],
  loggedInIndicator: [
    'nav a[href*="/chat"]',
    '[data-testid="profile-button"]',
  ],
  dismissButtons: [
    'button:has-text("Accept")',
    'button[aria-label*="Close"]',
    'button:has-text("Got it")',
  ],
};

const CHATGPT_OPTIONS: EngineOptions = {
  pageLoadWait: 2000,
  submitWait: 1000,
  maxResponseWait: 90000,
  useEnterToSubmit: true,
};

export class ChatGPTEngine extends EngineBase {
  constructor() {
    super(CHATGPT_CONFIG, CHATGPT_SELECTORS, CHATGPT_OPTIONS);
  }

  protected async onInitialize(): Promise<void> {
    if (!this.page) return;
    await this.page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await this.dismissModals();
  }

  protected async dismissModals(): Promise<void> {
    if (!this.page) return;

    const selectors = [
      'button:has-text("Accept")',
      'button[aria-label*="Close"]',
      'button:has-text("Got it")',
    ];

    for (const sel of selectors) {
      try {
        const btn = await this.page.$(sel);
        if (btn && await btn.isVisible()) {
          await btn.click();
          await this.randomDelay(300, 600);
          break;
        }
      } catch {
        // Ignore
      }
    }
  }

  protected async findInputField(): Promise<import("playwright").ElementHandle | null> {
    if (!this.page) return null;

    // Try standard selectors first
    const result = await super.findInputField();
    if (result) return result;

    // Fallback: search in forms
    try {
      const input = await this.page.evaluateHandle(() => {
        const forms = Array.from(document.querySelectorAll("form"));
        for (const form of forms) {
          const el = form.querySelector('textarea, div[contenteditable="true"]');
          if (el) return el;
        }
        return null;
      });

      const el = input.asElement();
      if (el && await el.isVisible()) {
        return el;
      }
    } catch {
      // Ignore
    }

    return null;
  }

  protected async typePrompt(
    input: import("playwright").ElementHandle,
    prompt: string,
  ): Promise<void> {
    if (!this.page) return;

    await input.click({ force: true });
    await this.randomDelay(150, 400);

    // Clear existing content
    const existingText = await input.evaluate((el: Element) => el.textContent || "");
    if (existingText.trim()) {
      await this.page.keyboard.press("Control+A");
      await this.page.keyboard.press("Backspace");
      await this.randomDelay(100, 200);
    }

    await this.humanType(prompt);
    await this.randomDelay(200, 500);
  }

  protected async extractResponseText(): Promise<string> {
    if (!this.page) return "";

    const selectors = ['[data-message-author-role="assistant"]', ".markdown.prose"];

    for (const selector of selectors) {
      try {
        const responses = await this.page.$$(selector);
        if (responses.length > 0) {
          const last = responses[responses.length - 1];
          const text = await last.textContent();
          if (text && text.length > 50) return text;
        }
      } catch {
        continue;
      }
    }

    // Fallback
    try {
      return await this.page.evaluate(() => {
        const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
        if (messages.length > 0) {
          return messages.item(messages.length - 1).textContent || "";
        }
        return "";
      });
    } catch {
      return "";
    }
  }
}
