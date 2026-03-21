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
    // Default: scroll to bottom to ensure input is visible
    if (!this.page) return;
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.randomDelay(500, 1000);
  }

  /**
   * Dismiss modals and popups (cookie banners, welcome dialogs)
   */
  protected async dismissModals(): Promise<void> {
    if (!this.page) return;

    const dismissSelectors = this.selectors.dismissButtons || [
      'button:has-text("Accept")',
      'button:has-text("Accept all")',
      'button:has-text("I agree")',
      'button:has-text("Allow")',
      'button[aria-label*="Accept"]',
      'button[aria-label*="Decline"]',
      'button[aria-label*="Close"]',
      'button:has-text("Got it")',
      'button:has-text("OK")',
      'button:has-text("Dismiss")',
      '[role="dialog"] button',
      '.modal button',
    ];

    for (const selector of dismissSelectors) {
      try {
        const button = await this.page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          await this.randomDelay(500, 1000);
          console.log(`[Engine] Dismissed modal: ${selector}`);
          break;
        }
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Scroll page to bottom to ensure input is visible
   */
  protected async scrollToBottom(): Promise<void> {
    if (!this.page) return;
    
    await this.page.evaluate(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth"
      });
    });
    await this.randomDelay(500, 1000);
  }

  /**
   * Wait for a button to be enabled
   */
  protected async waitForButtonEnabled(selectors: string[]): Promise<void> {
    if (!this.page) return;

    for (const selector of selectors) {
      try {
        const button = await this.page.$(selector);
        if (button) {
          const isEnabled = await button.isEnabled();
          if (!isEnabled) {
            console.log("⏳ Waiting for button to be enabled...");
            await this.page
              .waitForFunction(
                (btn) => btn instanceof HTMLButtonElement && btn.disabled === false,
                await button,
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

  /**
   * Find the input field using multiple selector strategies with fallback
   */
  protected async findInputField(): Promise<ElementHandle | null> {
    if (!this.page) return null;

    // Get engine-specific selectors first
    const engineSelectors = Array.isArray(this.selectors.input)
      ? this.selectors.input
      : [this.selectors.input];

    // Build comprehensive selector list with priority ordering
    const allSelectors = [
      // Engine-specific selectors first
      ...engineSelectors,
      // Contenteditable elements (ChatGPT, Claude)
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="message"]',
      'div[contenteditable="true"][aria-label*="chat"]',
      'div[contenteditable="true"][aria-label*="input"]',
      'div[contenteditable="true"][data-id]',
      // Textarea elements (Gemini, Perplexity)
      'textarea[placeholder*="essage"]',       // "message" fuzzy match
      'textarea[placeholder*="rompt"]',         // "prompt" fuzzy match
      'textarea[aria-label*="message"]',
      'textarea[aria-label*="input"]',
      'textarea[aria-label*="rompt"]',
      'textarea[id*="prompt"]',
      'textarea[id*="input"]',
      'textarea[id*="chat"]',
      '#prompt-textarea',                      // Gemini specific
      'form textarea',
      // Generic fallback
      'textarea',
      '[contenteditable="true"]',
    ];

    // Try each selector with explicit wait
    for (const selector of allSelectors) {
      try {
        // Wait for selector to be visible (2 second timeout per selector)
        const element = await this.page.waitForSelector(selector, {
          state: "visible",
          timeout: 2000,
        });
        if (element) {
          console.log(`[Engine] Found input field with selector: ${selector}`);
          return element;
        }
      } catch {
        // Continue to next selector
        continue;
      }
    }

    // Last resort: look for any visible contenteditable or textarea
    try {
      const fallback = await this.page.$('textarea, [contenteditable="true"]');
      if (fallback && await fallback.isVisible()) {
        console.log(`[Engine] Found input with fallback selector`);
        return fallback;
      }
    } catch {}

    console.warn(`[Engine] Could not find input field for ${this.name}`);
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
   * Wait for the response to complete with improved detection
   */
  protected async waitForResponse(): Promise<void> {
    if (!this.page) return;

    console.log("[Engine] Waiting for response...");

    // First, dismiss any modals/popups that might block the response
    await this.dismissModals();

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
      throw new Error("No response element found after timeout");
    }

    console.log("[Engine] Response element detected, waiting for completion...");

    // Wait for streaming to finish
    await this.waitForStreamingFinish();
  }

  /**
   * Scroll input field into view to ensure it's visible
   */
  protected async scrollInputIntoView(inputElement: ElementHandle): Promise<void> {
    if (!this.page) return;
    
    try {
      await inputElement.evaluate((el: HTMLElement) => {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      await this.randomDelay(300, 500);
    } catch (e) {
      console.log(`[Engine] Could not scroll input into view: ${e}`);
    }
  }

  /**
   * Wait for streaming response to finish with improved detection
   */
  protected async waitForStreamingFinish(): Promise<void> {
    if (!this.page) return;

    const selectors = Array.isArray(this.selectors.response)
      ? this.selectors.response
      : [this.selectors.response];

    let lastLength = 0;
    let stableCount = 0;
    let isStillGenerating = true;
    const STABLE_REQUIRED = 3;
    const MIN_LENGTH = 50;
    const MAX_WAIT_SECONDS = 120;  // Extended from 60 to 120 for longer responses

    console.log(`[Engine] Waiting for response completion (max ${MAX_WAIT_SECONDS}s)...`);

    for (let i = 0; i < MAX_WAIT_SECONDS; i++) {
      await this.page.waitForTimeout(1000);

      let foundResponse = false;
      let currentLength = 0;

      // Check for loading indicators first
      const loadingSelectors = [
        '[class*="loading"]',
        '[class*="generating"]',
        '[class*="streaming"]',
        '[class*="typing"]',
        '[data-testid*="generating"]',
      ];

      for (const loadingSelector of loadingSelectors) {
        try {
          const loadingEl = await this.page.$(loadingSelector);
          if (loadingEl && await loadingEl.isVisible()) {
            isStillGenerating = true;
            break;
          }
        } catch {}
      }

      // Get current response length
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

      // Check if response is stable
      if (currentLength === lastLength && currentLength >= MIN_LENGTH) {
        stableCount++;
        if (stableCount >= STABLE_REQUIRED && !isStillGenerating) {
          console.log(`[Engine] Response stable after ${i + 1} iterations (${currentLength} chars)`);
          return;
        }
      } else {
        stableCount = 0;
        lastLength = currentLength;
        
        // If we detect growth, extend the wait
        if (currentLength > lastLength) {
          // Reset generating flag when we see updates
          isStillGenerating = false;
        }
      }
    }

    console.warn(`[Engine] Response wait timeout after ${MAX_WAIT_SECONDS}s, last length: ${lastLength}`);
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
   * Type text with enhanced human-like delays
   */
  protected async humanType(text: string): Promise<void> {
    if (!this.page) return;

    const chars = text.split("");
    let lastPause = Date.now();
    let totalChars = chars.length;

    for (let i = 0; i < totalChars; i++) {
      const char = chars[i];

      if (char === " ") {
        // Space: small delay
        await this.page.keyboard.press("Space");
        await this.randomDelay(30, 150);
      } else if (char === "\n") {
        // Newline: moderate delay
        await this.page.keyboard.press("Enter");
        await this.randomDelay(50, 200);
      } else {
        // Regular character with variable delay
        await this.page.keyboard.type(char, { delay: this.randomInt(10, 80) });

        // Occasional longer pauses (2% chance)
        if (Math.random() < 0.02 && Date.now() - lastPause > 1000) {
          await this.randomDelay(200, 500);
          lastPause = Date.now();
        }
      }

      // Simulate editing: occasionally delete and retype part of the text
      // This happens every 50 characters with 15% probability
      if (i > 0 && i % 50 === 0 && Math.random() < 0.15) {
        const deleteCount = this.randomInt(5, 20);
        const charsToDelete = Math.min(deleteCount, i);
        
        // Select and delete
        await this.page.keyboard.down("Shift");
        for (let j = 0; j < charsToDelete; j++) {
          await this.page.keyboard.press("ArrowLeft");
        }
        await this.page.keyboard.up("Shift");
        await this.page.keyboard.press("Backspace");
        
        // Retype a portion
        const startIdx = Math.max(0, i - charsToDelete);
        const partialText = text.substring(startIdx, i);
        await this.page.keyboard.type(partialText, { delay: this.randomInt(5, 30) });
        
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