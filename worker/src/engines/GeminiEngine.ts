/**
 * Gemini engine implementation
 * Optimized selectors for GEO scoring
 */

import { EngineBase } from "./EngineBase.js";
import { EngineConfig, EngineSelectors, EngineOptions } from "./IEngine.js";

const GEMINI_CONFIG: EngineConfig = {
  name: "Gemini",
  url: "https://gemini.google.com/app",
  baseUrl: "gemini.google.com",
};

const GEMINI_SELECTORS: EngineSelectors = {
  input: [
    "textarea#prompt-textarea",
    'textarea[aria-label*="Enter a prompt"]',
    'div[contenteditable="true"][role="textbox"]',
  ],
  submit: [
    'button[type="submit"]',
    'button[aria-label*="Send"]',
    'button:has-text("Send")',
  ],
  response: [
    '[data-test-id*="response"]',
    ".model-response",
    ".markdown",
    '[role="presentation"]',
  ],
  loginButton: [
    'button:has-text("Sign in")',
    'a[href*="accounts.google.com"]',
  ],
  loggedInIndicator: [
    'header a[href*="gemini"]',
    '[data-test-id="user-menu"]',
  ],
  dismissButtons: [
    'button:has-text("Accept all")',
    'button:has-text("Accept")',
    'button[aria-label*="Close"]',
    'button:has-text("Got it")',
  ],
};

const GEMINI_OPTIONS: EngineOptions = {
  pageLoadWait: 2000,
  submitWait: 1500,
  maxResponseWait: 90000,
  useEnterToSubmit: false,
  useSubmitButton: true,
};

export class GeminiEngine extends EngineBase {
  constructor() {
    super(GEMINI_CONFIG, GEMINI_SELECTORS, GEMINI_OPTIONS);
  }

  protected async onInitialize(): Promise<void> {
    if (!this.page) return;
    await this.page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await this.dismissModals();
  }

  protected async dismissModals(): Promise<void> {
    if (!this.page) return;

    const selectors = [
      'button:has-text("Accept all")',
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

  protected async typePrompt(
    input: import("playwright").ElementHandle,
    prompt: string,
  ): Promise<void> {
    if (!this.page) return;

    await input.click({ force: true });
    await this.randomDelay(150, 400);

    const isTextarea = await input.evaluate((el: Element) => el.tagName === "TEXTAREA");

    if (isTextarea) {
      const existingValue = await input.inputValue();
      if (existingValue.trim()) {
        await this.page.keyboard.press("Control+A");
        await this.page.keyboard.press("Backspace");
        await this.randomDelay(100, 200);
      }
      await this.page.keyboard.type(prompt, { delay: this.randomInt(10, 50) });
    } else {
      await this.humanType(prompt);
    }

    await this.randomDelay(200, 500);
  }

  protected async submitPrompt(): Promise<void> {
    if (!this.page) return;

    const submitSelectors = [
      'button[type="submit"]',
      'button[aria-label*="Send"]',
      'button:has-text("Send")',
    ];

    for (const sel of submitSelectors) {
      try {
        const button = await this.page.waitForSelector(sel, { state: "visible", timeout: 3000 });
        if (button) {
          await button.click();
          break;
        }
      } catch {
        continue;
      }
    }

    await this.randomDelay(this.options.submitWait!, this.options.submitWait! + 500);
  }

  protected async extractResponseText(): Promise<string> {
    if (!this.page) return "";

    const selectors = ['[data-test-id*="response"]', ".model-response", ".markdown"];

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

    return "";
  }
}
