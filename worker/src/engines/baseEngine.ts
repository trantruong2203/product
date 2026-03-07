import { Page, BrowserContext } from 'playwright';
import { browserPool } from '../browsers/browserPool.js';

export interface EngineConfig {
  name: string;
  url: string;
  loginUrl?: string;
  inputSelector: string;
  responseSelector: string;
  submitSelector?: string;
  waitAfterSubmit?: number;
}

export const ENGINE_CONFIGS: Record<string, EngineConfig> = {
  ChatGPT: {
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    inputSelector: '#prompt-textarea, textarea[data-testid="chat-input"]',
    responseSelector: '.markdown, [data-testid="conversation-turn"] .assistant-message',
    waitAfterSubmit: 5000,
  },
  Perplexity: {
    name: 'Perplexity',
    url: 'https://www.perplexity.ai',
    inputSelector: 'textarea',
    responseSelector: '.answer, .response-body',
    waitAfterSubmit: 5000,
  },
  Gemini: {
    name: 'Gemini',
    url: 'https://gemini.google.com',
    inputSelector: 'rich-textarea, textarea',
    responseSelector: '.response-content, .markdown',
    waitAfterSubmit: 5000,
  },
  Claude: {
    name: 'Claude',
    url: 'https://claude.ai',
    inputSelector: 'textarea',
    responseSelector: '.assistant-message, .markdown',
    waitAfterSubmit: 5000,
  },
};

export class BaseEngine {
  protected config: EngineConfig;
  protected context?: BrowserContext;
  protected page?: Page;

  constructor(engineName: string) {
    const config = ENGINE_CONFIGS[engineName];
    if (!config) {
      throw new Error(`Engine ${engineName} not supported`);
    }
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.context = await browserPool.getContext(this.config.name);
    this.page = await this.context.newPage();
    
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });
  }

  async query(prompt: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    await this.page.goto(this.config.url, { waitUntil: 'networkidle' });
    await this.randomDelay(2000, 4000);

    const input = await this.page.waitForSelector(this.config.inputSelector, { timeout: 10000 }).catch(() => null);
    if (!input) {
      throw new Error(`Input selector not found: ${this.config.inputSelector}`);
    }

    await input.fill(prompt);
    await this.randomDelay(500, 1500);
    await this.page.keyboard.press('Enter');

    await this.randomDelay(this.config.waitAfterSubmit || 3000, (this.config.waitAfterSubmit || 3000) + 3000);

    const responseElement = await this.page.waitForSelector(this.config.responseSelector, { timeout: 60000 }).catch(() => null);
    if (!responseElement) {
      throw new Error('Response not found');
    }

    const responseText = await responseElement.textContent() || '';
    return responseText;
  }

  protected randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
  }
}

export function getEngine(engineName: string): BaseEngine {
  const normalizedName = engineName.toLowerCase().replace(/[^a-z]/g, '');

  switch (normalizedName) {
    case 'chatgpt':
    case 'chat':
      return new BaseEngine('ChatGPT');
    case 'perplexity':
      return new BaseEngine('Perplexity');
    case 'gemini':
      return new BaseEngine('Gemini');
    case 'claude':
      return new BaseEngine('Claude');
    default:
      throw new Error(`Unsupported engine: ${engineName}`);
  }
}
