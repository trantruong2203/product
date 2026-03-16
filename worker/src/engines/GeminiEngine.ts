/**
 * Gemini engine implementation
 * Uses robust selectors based on data attributes and stable DOM elements
 */

import { EngineBase } from "./EngineBase.js";
import { EngineConfig, EngineSelectors, EngineOptions } from "./IEngine.js";

const GEMINI_CONFIG: EngineConfig = {
  name: "Gemini",
  url: "https://gemini.google.com/app",
  baseUrl: "gemini.google.com",
};

const GEMINI_SELECTORS: EngineSelectors = {
  // Input selectors - prioritized by reliability
  input: [
    // Primary: textarea with known IDs
    'textarea#prompt-textarea',
    'textarea[aria-label*="Enter a prompt"]',
    'textarea[placeholder*="Enter a prompt"]',
    // Fallback: contenteditable divs
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][aria-label*="message"]',
    'div[contenteditable="true"][data-id*="prompt"]',
    // General textarea fallbacks
    'textarea:visible',
    'form textarea',
  ],
  // Submit selectors - Gemini uses a submit button
  submit: [
    // Primary: Submit button with known attributes
    'button[type="submit"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="Submit"]',
    'button:has(svg[data-test-id*="send"])',
    'button:has-text("Send")',
    // Fallback: Last button in the input form
    'form button:last-child',
  ],
  // Response selectors - prioritized by reliability
  response: [
    // Primary: Response container with data attributes
    '[data-test-id*="conversation-turn-3"]',
    '[data-test-id*="response"]',
    '.model-response',
    // Fallback: Content containers
    '.markdown',
    '.response-content',
    '[role="presentation"]',
    // Legacy
    '.text-base',
    '.message-content',
  ],
  // Login button selectors
  loginButton: [
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
    'a[href*="accounts.google.com"]',
    'a[href*="signin"]',
  ],
  // Logged in indicators
  loggedInIndicator: [
    'header a[href*="gemini"]',
    '[data-test-id="user-menu"]',
    'button[aria-label*="account"]',
    'nav:has(a[href*="gemini"])',
  ],
  // Dismiss button selectors for modals
  dismissButtons: [
    'button:has-text("Accept all")',
    'button:has-text("Accept")',
    'button:has-text("I agree")',
    'button[aria-label*="Close"]',
    'button:has-text("Got it")',
  ],
};

const GEMINI_OPTIONS: EngineOptions = {
  pageLoadWait: 3000,
  submitWait: 1500,
  maxResponseWait: 90000,
  useEnterToSubmit: false, // Gemini prefers button click
  useSubmitButton: true,
};

export class GeminiEngine extends EngineBase {
  constructor() {
    super(GEMINI_CONFIG, GEMINI_SELECTORS, GEMINI_OPTIONS);
  }

  /**
   * Gemini-specific initialization
   */
  protected async onInitialize(): Promise<void> {
    if (!this.page) return;

    // Wait for the page to fully load
    await this.page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

    // Dismiss any welcome modals
    await this.dismissModals();
  }


  /**
   * Enhanced submit for Gemini (uses button click instead of Enter)
   */
  protected async submitPrompt(): Promise<void> {
    if (!this.page) return;

    console.log("📝 Submitting prompt...");

    const submitSelectors = Array.isArray(this.selectors.submit)
      ? this.selectors.submit
      : [this.selectors.submit];

    let submitted = false;

    for (const selector of submitSelectors) {
      try {
        const button = await this.page.waitForSelector(selector as string, {
          state: "visible",
          timeout: 3000,
        });
        if (button) {
          // Check if button is enabled
          const isEnabled = await button.isEnabled();
          if (isEnabled) {
            await button.click();
            console.log(`✅ Clicked submit button: ${selector}`);
            submitted = true;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    // Fallback to Enter key if button click fails
    if (!submitted) {
      console.log("⚠️ Submit button not available, trying Enter key...");
      await this.page.keyboard.press("Enter");
    }

    await this.randomDelay(this.options.submitWait!, this.options.submitWait! + 500);
  }

  /**
   * Enhanced response extraction for Gemini
   */
  protected async extractResponseText(): Promise<string> {
    if (!this.page) return "";

    const selectors = Array.isArray(this.selectors.response)
      ? this.selectors.response
      : [this.selectors.response];

    for (const selector of selectors) {
      try {
        const responses = await this.page.$$(selector as string);
        if (responses.length > 0) {
          // Get the last response
          const last = responses[responses.length - 1];
          const text = await last.textContent();
          if (text && text.length > 50) {
            return text;
          }
        }
      } catch {
        continue;
      }
    }

    // Fallback: Try to get text from the most recent message
    try {
      const text = await this.page.evaluate(() => {
        // Try various message container patterns
        const messageContainers: string[] = [
          '[data-test-id*="conversation-turn-3"]',
          '.model-response',
          '.markdown',
        ];

        for (const selector of messageContainers) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            const last = elements.item(elements.length - 1);
            return (last?.textContent) || "";
          }
        }
        return "";
      });
      return text;
    } catch {
      return "";
    }
  }
}
