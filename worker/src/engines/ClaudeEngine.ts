/**
 * Claude engine implementation
 * Uses robust selectors based on data-testid and stable DOM elements
 */

import { EngineBase } from "./EngineBase.js";
import { EngineConfig, EngineSelectors, EngineOptions } from "./IEngine.js";

const CLAUDE_CONFIG: EngineConfig = {
  name: "Claude",
  url: "https://claude.ai/",
  baseUrl: "claude.ai",
};

const CLAUDE_SELECTORS: EngineSelectors = {
  // Input selectors - prioritized by reliability
  input: [
    // Primary: data-testid is most stable
    'div[data-testid="chat-input-textarea"]',
    'div[data-testid="input-textarea"]',
    'div[data-testid="message-input"]',
    // Fallback: contenteditable with role
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][aria-label*="chat"]',
    'div[contenteditable="true"][aria-label*="message"]',
    // Legacy selectors
    'div[contenteditable="true"][data-id*="input"]',
    'form div[contenteditable="true"]',
  ],
  // Response selectors - prioritized by reliability
  response: [
    // Primary: data-testid for assistant messages
    '[data-testid="message-content"]',
    '[data-testid="message"][data-message-role="assistant"]',
    '[data-message-author-role="assistant"]',
    // Fallback: assistant message class
    '.font-claude-message',
    '.prose',
    '[data-testid*="conversation-turn"]',
    // Legacy
    '.message-content',
    '.markdown',
    '.text-base',
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
    '[data-testid="sidebar"]',
  ],
};

const CLAUDE_OPTIONS: EngineOptions = {
  pageLoadWait: 3000,
  submitWait: 1000,
  maxResponseWait: 90000,
  useEnterToSubmit: true,
};

export class ClaudeEngine extends EngineBase {
  constructor() {
    super(CLAUDE_CONFIG, CLAUDE_SELECTORS, CLAUDE_OPTIONS);
  }

  /**
   * Claude-specific initialization
   */
  protected async onInitialize(): Promise<void> {
    if (!this.page) return;

    // Wait for the page to fully load
    await this.page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

    // Dismiss any welcome modals or cookie banners
    await this.dismissModals();
  }

  /**
   * Handle Claude-specific modals and popups
   */
  private async dismissModals(): Promise<void> {
    if (!this.page) return;

    // Try to dismiss cookie banner
    try {
      const cookieButtons = [
        'button:has-text("Accept")',
        'button:has-text("Accept all")',
        'button:has-text("I agree")',
        'button[aria-label*="Accept"]',
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
      const closeButton = await this.page.$('button[aria-label*="Close"], button:has-text("Got it")');
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

    // Check if we need to start a new chat
    const currentUrl = this.page.url();
    if (currentUrl.includes('/c/')) {
      console.log("📝 Continuing with existing chat");
    }

    // Scroll to bottom to ensure input is visible
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.randomDelay(500, 1000);
  }

  /**
   * Enhanced input finding for Claude's dynamic UI
   */
  protected async findInputField(): Promise<import("playwright").ElementHandle | null> {
    if (!this.page) return null;

    // First try standard selectors
    const result = await super.findInputField();
    if (result) return result;

    // Fallback: Try to find by searching the DOM
    try {
      const input = await this.page.evaluateHandle(() => {
        // Find the main input container
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
          const textarea = form.querySelector('textarea, div[contenteditable="true"]');
          if (textarea) {
            return textarea;
          }
        }

        // Also check main content area
        const main = document.querySelector('main');
        if (main) {
          const editable = main.querySelector('div[contenteditable="true"]');
          if (editable) {
            return editable;
          }
        }

        return null;
      });

      if (input && await input.isVisible()) {
        console.log("✅ Found input via DOM search");
        return input.asElement();
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * Enhanced typing for Claude's contenteditable input
   */
  protected async typePrompt(
    input: import("playwright").ElementHandle,
    prompt: string
  ): Promise<void> {
    if (!this.page) return;

    // Click to focus
    await input.click({ force: true });
    await this.randomDelay(200, 500);

    // For Claude, we need to check if there's existing text
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
      const sendButton = await this.page.$('button[aria-label*="Send"], button[type="submit"]');
      if (sendButton) {
        // Check if it's enabled
        const isEnabled = await sendButton.isEnabled();
        if (!isEnabled) {
          console.log("⏳ Waiting for send button to be enabled...");
          await this.page.waitForFunction(
            (btn) => btn instanceof HTMLButtonElement && btn.disabled === false,
            await sendButton,
            { timeout: 5000 }
          ).catch(() => {});
        }
      }
    } catch {
      // Ignore - button might not exist or we can proceed anyway
    }
  }

  /**
   * Enhanced response extraction for Claude
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
          '[data-testid="message-content"]',
          '[data-message-author-role="assistant"]',
          '.font-claude-message',
          '.prose',
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
   * Enhanced response HTML extraction for Claude
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
          // Get the last response
          const last = responses[responses.length - 1];
          const html = await last.evaluate((el: Element) => el.innerHTML);
          if (html && html.length > 50) {
            return html;
          }
        }
      } catch {
        continue;
      }
    }

    // Fallback: Try to get HTML from the most recent message
    try {
      const html = await this.page.evaluate(() => {
        // Try various message container patterns
        const messageContainers = [
          '[data-testid="message-content"]',
          '[data-message-author-role="assistant"]',
          '.font-claude-message',
          '.prose',
        ];

        for (const selector of messageContainers) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return elements[elements.length - 1].innerHTML || "";
          }
        }
        return "";
      });
      return html;
    } catch {
      return "";
    }
  }
}