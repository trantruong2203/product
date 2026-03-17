/**
 * ChatGPT engine implementation
 * Uses robust selectors based on data-testid and stable DOM elements
 */

import { EngineBase } from "./EngineBase.js";
import { EngineConfig, EngineSelectors, EngineOptions } from "./IEngine.js";

const CHATGPT_CONFIG: EngineConfig = {
  name: "ChatGPT",
  url: "https://chatgpt.com/",
  baseUrl: "chatgpt.com",
};

const CHATGPT_SELECTORS: EngineSelectors = {
  // Input selectors - prioritized by reliability
  input: [
    // Primary: data-testid is most stable
    'div[data-testid="prompt-textarea"]',
    'div[data-testid="send-button-textarea"]',
    // Fallback: contenteditable with role
    'div[contenteditable="true"][role="textbox"]',
    // Legacy selectors
    'div[contenteditable="true"][data-id="root"]',
    'div[contenteditable="true"][aria-label*="chat"]',
  ],
  // Response selectors - prioritized by reliability
  response: [
    // Primary: data-testid for assistant messages
    '[data-message-author-role="assistant"]',
    // Fallback: assistant message class
    ".markdown.prose",
    '[data-testid="conversation-turn-3"]',
    '[data-testid="conversation-turn-5"]',
    // Legacy
    ".text-base",
    ".group\\/conversation-turn",
  ],
  // Login button selectors
  loginButton: [
    'button:has-text("Log in")',
    'button:has-text("Sign up")',
    'a[href*="/login"]',
    'a[href*="/auth"]',
  ],
  // Logged in indicators
  loggedInIndicator: [
    'nav a[href*="/chat"]',
    'nav a[href*="/c"]',
    '[data-testid="profile-button"]',
    'button[aria-label*="User menu"]',
  ],
  // Dismiss button selectors for modals
  dismissButtons: [
    'button:has-text("Accept")',
    'button[aria-label*="Close"]',
    'button:has-text("Got it")',
  ],
};

const CHATGPT_OPTIONS: EngineOptions = {
  pageLoadWait: 3000,
  submitWait: 1000,
  maxResponseWait: 90000,
  useEnterToSubmit: true,
};

export class ChatGPTEngine extends EngineBase {
  constructor() {
    super(CHATGPT_CONFIG, CHATGPT_SELECTORS, CHATGPT_OPTIONS);
  }

  /**
   * ChatGPT-specific initialization
   */
  protected async onInitialize(): Promise<void> {
    if (!this.page) return;

    // Wait for the page to fully load
    await this.page
      .waitForLoadState("networkidle", { timeout: 30000 })
      .catch(() => {});

    // Dismiss any welcome modals or cookie banners
    await this.dismissModals();
  }

  /**
   * Handle ChatGPT-specific modals and popups
   */
  private async dismissModals(): Promise<void> {
    if (!this.page) return;

    // Try to dismiss cookie banner
    try {
      const cookieButton = await this.page.$('button:has-text("Accept")');
      if (cookieButton) {
        await cookieButton.click();
        await this.randomDelay(500, 1000);
      }
    } catch {
      // Ignore
    }

    // Try to dismiss welcome modal
    try {
      const closeButton = await this.page.$('button[aria-label*="Close"]');
      if (closeButton) {
        await closeButton.click();
        await this.randomDelay(500, 1000);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Check if we need to start a new chat
   */
  protected async onAlreadyOnPage(): Promise<void> {
    if (!this.page) return;

    // Check if we're on a chat page with existing conversation
    const currentUrl = this.page.url();
    if (currentUrl.includes("/c/")) {
      // We're in an existing chat - optionally start new chat
      // For now, we'll just continue with the current chat
      console.log("📝 Continuing with existing chat");
    }

    // Scroll to bottom to ensure input is visible
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.randomDelay(500, 1000);
  }

  /**
   * Enhanced input finding for ChatGPT's dynamic UI
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
        // Find the main input container
        const forms = Array.from(document.querySelectorAll("form"));
        for (const form of forms) {
          const textarea = form.querySelector(
            'textarea, div[contenteditable="true"]',
          );
          if (textarea) {
            return textarea;
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
   * Enhanced typing for ChatGPT's contenteditable input
   */
  protected async typePrompt(
    input: import("playwright").ElementHandle,
    prompt: string,
  ): Promise<void> {
    if (!this.page) return;

    // Click to focus
    await input.click({ force: true });
    await this.randomDelay(200, 500);

    // For ChatGPT, we need to check if there's existing text
    const existingText = await input.evaluate((el: Element) => {
      return el.textContent || "";
    });

    if (existingText.trim()) {
      // Clear existing content
      await this.page.keyboard.press("Control+A");
      await this.page.keyboard.press("Backspace");
      await this.randomDelay(100, 300);
    }

    // Type the prompt character by character for contenteditable
    await this.humanType(prompt);

    // Wait for the send button to become enabled
    await this.waitForSendButtonEnabled();
  }

  /**
   * Wait for the send button to become enabled
   */
  private async waitForSendButtonEnabled(): Promise<void> {
    if (!this.page) return;

    try {
      const sendButton = await this.page.waitForSelector(
        'button[data-testid="send-button"], button[aria-label*="Send"]',
        {
          state: "visible",
          timeout: 5000,
        },
      );

      if (sendButton) {
        // Check if it's enabled
        const isEnabled = await sendButton.isEnabled();
        if (!isEnabled) {
          console.log("⏳ Waiting for send button to be enabled...");
          await this.page
            .waitForFunction(
              (btn) =>
                btn instanceof HTMLButtonElement && btn.disabled === false,
              await sendButton,
              { timeout: 5000 },
            )
            .catch(() => {});
        }
      }
    } catch {
      // Ignore - button might not exist or we can proceed anyway
    }
  }

  /**
   * Enhanced response extraction for ChatGPT
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
        const messages = document.querySelectorAll(
          '[data-message-author-role="assistant"]',
        );
        if (messages.length > 0) {
          const last = messages.item(messages.length - 1);
          return (last?.textContent) || "";
        }
        return "";
      });
      return text;
    } catch {
      return "";
    }
  }
}
