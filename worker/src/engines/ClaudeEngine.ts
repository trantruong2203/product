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
  // Dismiss button selectors for modals
  dismissButtons: [
    'button:has-text("Accept")',
    'button:has-text("Accept all")',
    'button:has-text("I agree")',
    'button[aria-label*="Accept"]',
    'button[aria-label*="Close"]',
    'button:has-text("Got it")',
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
        for (let i = 0; i < forms.length; i++) {
          const textarea = forms[i].querySelector('textarea, div[contenteditable="true"]');
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

      const element = input.asElement();
      if (element && await element?.isVisible()) {
        console.log("✅ Found input via DOM search");
        return element;
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
    await this.waitForButtonEnabled(['button[aria-label*="Send"]', 'button[type="submit"]']);
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

        for (let i = 0; i < messageContainers.length; i++) {
          const selector = messageContainers[i];
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

        for (let i = 0; i < messageContainers.length; i++) {
          const selector = messageContainers[i];
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            const last = elements.item(elements.length - 1);
            return (last?.innerHTML) || "";
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
