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
    "textarea#prompt-textarea",
    'textarea[aria-label*="Enter a prompt"]',
    'textarea[placeholder*="Enter a prompt"]',
    // Fallback: contenteditable divs
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][aria-label*="message"]',
    'div[contenteditable="true"][data-id*="prompt"]',
    // General textarea fallbacks
    "textarea:visible",
    "form textarea",
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
    "form button:last-child",
  ],
  // Response selectors - prioritized by reliability
  response: [
    // Primary: Response container with data attributes
    '[data-test-id*="conversation-turn-3"]',
    '[data-test-id*="response"]',
    ".model-response",
    // Fallback: Content containers
    ".markdown",
    ".response-content",
    '[role="presentation"]',
    // Legacy
    ".text-base",
    ".message-content",
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
    await this.page
      .waitForLoadState("networkidle", { timeout: 30000 })
      .catch(() => {});

    // Dismiss any welcome modals
    await this.dismissModals();
  }

  /**
   * Handle Gemini-specific modals and popups
   */
  private async dismissModals(): Promise<void> {
    if (!this.page) return;

    // Try to dismiss cookie banner
    try {
      const cookieButtons = [
        'button:has-text("Accept all")',
        'button:has-text("Accept")',
        'button:has-text("I agree")',
      ];

      for (const selector of cookieButtons) {
        const button = await this.page.$(selector);
        if (button) {
          await button.click();
          await this.randomDelay(500, 1000);
          break;
        }
      }
    } catch {
      // Ignore
    }

    // Try to dismiss welcome modal
    try {
      const closeButton = await this.page.$(
        'button[aria-label*="Close"], button:has-text("Got it")',
      );
      if (closeButton) {
        await closeButton.click();
        await this.randomDelay(500, 1000);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Handle when already on page
   */
  protected async onAlreadyOnPage(): Promise<void> {
    if (!this.page) return;

    // Scroll to bottom to ensure input is visible
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.randomDelay(500, 1000);
  }

  /**
   * Enhanced input finding for Gemini's dynamic UI
   */
  protected async findInputField(): Promise<
    import("playwright").ElementHandle | null
  > {
    if (!this.page) return null;

    // First try standard selectors
    const result = await super.findInputField();
    if (result) return result;

    // Fallback: Try to find by searching the DOM
    try {
      const input = await this.page.evaluateHandle(() => {
        // Gemini uses a textarea inside a form
        const forms = Array.from(document.querySelectorAll("form"));
        for (const form of forms) {
          const textarea = form.querySelector("textarea");
          if (textarea) {
            return textarea;
          }
          // Also check for contenteditable divs
          const editable = forms[i].querySelector('div[contenteditable="true"]');
          if (editable) {
            return editable;
          }
        }
        return null;
      });

      const el = input.asElement();
      if (el && (await el.isVisible())) {
        console.log("✅ Found input via DOM search");
        return el;
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * Enhanced typing for Gemini's textarea input
   */
  protected async typePrompt(
    input: import("playwright").ElementHandle,
    prompt: string,
  ): Promise<void> {
    if (!this.page) return;

    // Click to focus
    await input.click({ force: true });
    await this.randomDelay(200, 500);

    // Check input type
    const isTextarea = await input.evaluate((el: Element) => {
      return el.tagName === "TEXTAREA";
    });

    if (isTextarea) {
      // For textarea, we can use keyboard.type directly
      // First clear existing content
      const existingValue = await input.inputValue();
      if (existingValue.trim()) {
        await this.page.keyboard.press("Control+A");
        await this.page.keyboard.press("Backspace");
        await this.randomDelay(100, 300);
      }

      // Type the prompt
      await this.page.keyboard.type(prompt, { delay: this.randomInt(10, 50) });
    } else {
      // For contenteditable, clear and type character by character
      const existingText = await input.evaluate((el: Element) => {
        return el.textContent || "";
      });

      if (existingText.trim()) {
        await this.page.keyboard.press("Control+A");
        await this.page.keyboard.press("Backspace");
        await this.randomDelay(100, 300);
      }

      await this.humanType(prompt);
    }

    // Wait for the submit button to become enabled
    const submitSelectors = Array.isArray(this.selectors.submit)
      ? this.selectors.submit.filter((s): s is string => s !== undefined)
      : this.selectors.submit ? [this.selectors.submit] : [];
    await this.waitForButtonEnabled(submitSelectors);
  }

  /**
   * Wait for the submit button to become enabled
   */
  private async waitForSubmitButtonEnabled(): Promise<void> {
    if (!this.page) return;

    try {
      const submitSelectors = Array.isArray(this.selectors.submit)
        ? this.selectors.submit
        : [this.selectors.submit];

      for (const selector of submitSelectors) {
        if (!selector) continue;
        try {
          const button = await this.page.$(selector);
          if (button) {
            const isEnabled = await button.isEnabled();
            if (!isEnabled) {
              console.log("⏳ Waiting for submit button to be enabled...");
              await this.page
                .waitForFunction(
                  (btn) =>
                    btn instanceof HTMLButtonElement && btn.disabled === false,
                  await button,
                  { timeout: 5000 },
                )
                .catch(() => {});
            }
            break;
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Ignore
    }
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
        const responses = await this.page.$$(selector);
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
        const messageContainers = [
          '[data-test-id*="conversation-turn-3"]',
          ".model-response",
          ".markdown",
        ];

        for (const selector of messageContainers) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return elements[elements.length - 1].textContent || "";
          }
        }
        return "";
      });
      return text;
    } catch {
      return "";
    }
  }

  /**
   * Enhanced submit for Gemini
   */
  protected async submitPrompt(): Promise<void> {
    if (!this.page) return;

    console.log("📝 Submitting prompt...");

    const submitSelectors = Array.isArray(this.selectors.submit)
      ? this.selectors.submit
      : [this.selectors.submit];

    let submitted = false;

    for (const selector of submitSelectors) {
      if (!selector) continue;
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

    await this.randomDelay(
      this.options.submitWait!,
      this.options.submitWait! + 500,
    );
  }
<<<<<<< HEAD
=======

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
>>>>>>> 59e9582b1f32fc024ae566a8810b04a49d0cb015
}
