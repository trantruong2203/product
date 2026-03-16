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
    '.markdown.prose',
    '[data-testid="conversation-turn-3"]',
    '[data-testid="conversation-turn-5"]',
    // Legacy
    '.text-base',
    '.group\\/conversation-turn',
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
    await this.page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

    // Dismiss any welcome modals or cookie banners
    await this.dismissModals();
  }

}
