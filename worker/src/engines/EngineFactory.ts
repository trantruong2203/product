/**
 * Engine factory for creating AI chat engine instances
 */

import { IEngine } from "./IEngine.js";
import { ChatGPTEngine } from "./ChatGPTEngine.js";
import { GeminiEngine } from "./GeminiEngine.js";
import { ClaudeEngine } from "./ClaudeEngine.js";
import { BaseEngine } from "./baseEngine.js";

/**
 * Get an engine instance by name
 *
 * @param engineName - The name of the engine (case-insensitive)
 * @returns An engine instance
 * @throws Error if engine is not supported
 */
export function getEngine(engineName: string): IEngine {
  const normalized = engineName.toLowerCase().replace(/[^a-z]/g, "");

  switch (normalized) {
    case "chatgpt":
    case "chat":
    case "openai":
      return new ChatGPTEngine();

    case "gemini":
    case "google":
      return new GeminiEngine();

    case "claude":
    case "anthropic":
      return new ClaudeEngine();

    default:
      throw new Error(`Unsupported engine: ${engineName}. Supported engines: ChatGPT, Gemini, Claude`);
  }
}

/**
 * Legacy function for backward compatibility
 * Returns the old BaseEngine for existing code
 *
 * @deprecated Use getEngine() instead for new implementations
 */
export function getLegacyEngine(engineName: string): BaseEngine {
  return new BaseEngine(engineName);
}

/**
 * Get list of supported engine names
 */
export function getSupportedEngines(): string[] {
  return ["ChatGPT", "Gemini", "Claude"];
}