/**
 * Base engine class with common functionality for all AI chat engines
 */

import { Page, BrowserContext, ElementHandle, Locator } from "playwright";
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

    // Set viewport
    await this.page.setViewportSize({ width: 1280, height: 800 });

    // Engine-specific initialization
    await this.onInitialize();
  }

  /**
   * Hook for engine-specific initialization
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclasses if needed
  }

  async query(prompt: string): Promise<QueryResult> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }

    this.requestCount++;

    // Check login status
    if (!(await this.isLoggedIn())) {
      throw new Error(`Not logged in to ${this.name}. Please run login script first.`);
    }

    // Navigate to the chat page
    await this.navigateToChat();

    // Wait for page to be ready
    await this.waitForReady();

    // Find and focus input field
    const inputElement = await this.findInputField();
    if (!inputElement) {
      throw new Error(`Could not find input field for ${this.name}`);
    }

    // Clear and type the prompt
    await this.typePrompt(inputElement, prompt);

    // Submit the prompt
    await this.submitPrompt();

    // Wait for response
    await this.waitForResponse();

    // Extract response
    const text = await this.extractResponseText();
    const html = await this.extractResponseHtml();

    return {
      text: this.cleanText(text),
      html,
    };
  }

  /**
   * Navigate to the chat page
   */
  protected async navigateToChat(): Promise<void> {
    if (!this.page) return;

    // Check if already on the right page
    const currentUrl = this.page.url();
    const baseUrl = this.config.baseUrl || this.url;

    if (currentUrl.includes(baseUrl)) {
      // Already on page, optionally refresh
      await this.onAlreadyOnPage();
      return;
    }

    await this.page.goto(this.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await this.randomDelay(this.options.pageLoadWait!, this.options.pageLoadWait! + 1000);
  }

  /**
   * Hook called when already on the correct page
   */
  protected async onAlreadyOnPage(): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Find the input field using multiple selector strategies
   */
  protected async findInputField(): Promise<ElementHandle | null> {
    if (!this.page) return null;

    const selectors = Array.isArray(this.selectors.input)
      ? this.selectors.input
      : [this.selectors.input];

    for (const selector of selectors) {
      try {
        const element = await this.page.waitForSelector(selector, {
          state: "visible",
          timeout: 5000,
        });
        if (element) {
          console.log(`✅ Found input with selector: ${selector}`);
          return element;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Type the prompt into the input field
   */
  protected async typePrompt(input: ElementHandle, prompt: string): Promise<void> {
    if (!this.page) return;

    // Click to focus
    await input.click({ force: true });
    await this.randomDelay(200, 500);

    // Clear existing content
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.randomDelay(100, 300);

    // Check if it's a contenteditable element
    const isContentEditable = await input.evaluate((el: Element) => {
      return (
        el.getAttribute("contenteditable") === "true" ||
        el.tagName === "TEXTAREA" ||
        el instanceof HTMLTextAreaElement
      );
    });

    // Type the prompt
    if (isContentEditable) {
      await this.humanType(prompt);
    } else {
      await this.page.keyboard.type(prompt, { delay: this.randomInt(10, 50) });
    }

    await this.randomDelay(500, 1000);
  }

  /**
   * Submit the prompt (Enter key or button click)
   */
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
            console.log(`✅ Clicked submit button: ${selector}`);
            break;
          }
        } catch {
          continue;
        }
      }
    } else if (this.options.useEnterToSubmit) {
      console.log("📝 Pressing Enter to submit...");
      await this.page.keyboard.press("Enter");
    }

    await this.randomDelay(this.options.submitWait!, this.options.submitWait! + 500);
  }

  /**
   * Wait for the response to complete
   */
  protected async waitForResponse(): Promise<void> {
    if (!this.page) return;

    console.log("⏳ Waiting for response...");

    const selectors = Array.isArray(this.selectors.response)
      ? this.selectors.response
      : [this.selectors.response];

    // Wait for at least one response element to appear
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
      throw new Error("No response element found");
    }

    // Wait for streaming to finish
    await this.waitForStreamingFinish();
  }

  /**
   * Wait for streaming response to finish
   */
  protected async waitForStreamingFinish(): Promise<void> {
    if (!this.page) return;

    const selectors = Array.isArray(this.selectors.response)
      ? this.selectors.response
      : [this.selectors.response];

    let lastLength = 0;
    let stableCount = 0;
    const STABLE_REQUIRED = 3;
    const MIN_LENGTH = 50;

    for (let i = 0; i < 60; i++) {
      await this.page.waitForTimeout(1000);

      let foundResponse = false;
      let currentLength = 0;

      for (const selector of selectors) {
        try {
          const responses = await this.page.$$(selector);
          if (responses.length > 0) {
            const last = responses[responses.length - 1];
            const text = await last.textContent();
            currentLength = text?.length || 0;
            foundResponse = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!foundResponse) {
        stableCount = 0;
        continue;
      }

      if (currentLength === lastLength && currentLength >= MIN_LENGTH) {
        stableCount++;
        if (stableCount >= STABLE_REQUIRED) {
          return;
        }
      } else {
        stableCount = 0;
        lastLength = currentLength;
      }
    }
  }

  /**
   * Extract response text
   */
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

  /**
   * Extract response HTML
   */
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

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    // Check for login button - if visible, not logged in
    if (this.selectors.loginButton) {
      const loginSelectors = Array.isArray(this.selectors.loginButton)
        ? this.selectors.loginButton
        : [this.selectors.loginButton];

      for (const selector of loginSelectors) {
        try {
          const loginBtn = await this.page.$(selector);
          if (loginBtn && await loginBtn.isVisible()) {
            console.log(`⚠️ Login button found: ${selector}`);
            return false;
          }
        } catch {
          continue;
        }
      }
    }

    // Check for logged in indicator
    if (this.selectors.loggedInIndicator) {
      const indicatorSelectors = Array.isArray(this.selectors.loggedInIndicator)
        ? this.selectors.loggedInIndicator
        : [this.selectors.loggedInIndicator];

      for (const selector of indicatorSelectors) {
        try {
          const indicator = await this.page.$(selector);
          if (indicator && await indicator.isVisible()) {
            console.log(`✅ Logged in indicator found: ${selector}`);
            return true;
          }
        } catch {
          continue;
        }
      }
    }

    // Default to true if no indicators available
    return true;
  }

  /**
   * Wait for the page to be ready for input
   */
  async waitForReady(): Promise<void> {
    if (!this.page) return;

    // Wait for input field to be available with retries
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const input = await this.findInputField();
        if (input) {
          await this.randomDelay(500, 1000);
          return;
        }
      } catch (e) {
        console.log(`⚠️ Error finding input field: ${e}`);
      }

      attempts++;
      if (attempts < maxAttempts) {
        console.log(`⏳ Input field not ready, retrying... (${attempts}/${maxAttempts})`);
        await this.randomDelay(1000, 2000);
      }
    }

    // Log page state before throwing error
    try {
      const pageUrl = this.page.url();
      const pageTitle = await this.page.title();
      console.log(`❌ Input field not found after ${maxAttempts} attempts. URL: ${pageUrl}, Title: ${pageTitle}`);
    } catch (e) {
      console.log(`❌ Input field not found after ${maxAttempts} attempts`);
    }

    throw new Error("Input field not available after retries");
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = undefined;
    }
  }

  /**
   * Type text with human-like delays
   */
  protected async humanType(text: string): Promise<void> {
    if (!this.page) return;

    for (const char of text) {
      await this.page.keyboard.type(char, { delay: this.randomInt(10, 50) });

      // Occasional longer pauses
      if (Math.random() < 0.05) {
        await this.randomDelay(100, 300);
      }
    }
  }

  /**
   * Clean text response
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s+/g, " ")
      .replace(/Copy code/g, "")
      .trim();
  }

  /**
   * Random delay between min and max ms
   */
  protected async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Random integer between min and max (inclusive)
   */
  protected randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}