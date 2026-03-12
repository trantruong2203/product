/**
 * Core interface for AI chat engine implementations
 */

export interface QueryResult {
  /** Plain text response */
  text: string;
  /** Raw HTML response */
  html: string;
}

export interface EngineConfig {
  name: string;
  url: string;
  /** Base URL for navigation checks */
  baseUrl?: string;
}

export interface EngineSelectors {
  /** Input field selector(s) - tried in order */
  input: string | string[];
  /** Submit button selector(s) - tried in order, or use Enter key */
  submit?: string | string[];
  /** Response container selector(s) */
  response: string | string[];
  /** Login button selector - to check if not logged in */
  loginButton?: string | string[];
  /** Element that indicates user is logged in */
  loggedInIndicator?: string | string[];
}

export interface EngineOptions {
  /** Wait time after page load (ms) */
  pageLoadWait?: number;
  /** Wait time after submit (ms) */
  submitWait?: number;
  /** Maximum wait time for response (ms) */
  maxResponseWait?: number;
  /** Whether to use Enter key to submit (default: true) */
  useEnterToSubmit?: boolean;
  /** Whether to click submit button instead of Enter (default: false) */
  useSubmitButton?: boolean;
}

/**
 * Base interface that all AI engine implementations must follow
 */
export interface IEngine {
  /** Engine name */
  readonly name: string;

  /** Engine URL */
  readonly url: string;

  /**
   * Initialize the engine - called once per session
   */
  initialize(): Promise<void>;

  /**
   * Execute a query and return the response
   * @param prompt - The prompt/query to send
   * @returns The AI response
   */
  query(prompt: string): Promise<QueryResult>;

  /**
   * Check if user is logged in
   */
  isLoggedIn(): Promise<boolean>;

  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;

  /**
   * Wait for the page to be ready for input
   */
  waitForReady(): Promise<void>;
}