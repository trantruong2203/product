/**
 * Claude API Engine - Uses Anthropic API instead of browser automation
 */

import Anthropic from "@anthropic-ai/sdk";
import { IEngine, QueryResult } from "./IEngine.js";

export class ClaudeAPIEngine implements IEngine {
  readonly name = "Claude";
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    this.client = new Anthropic({ apiKey });
  }

  async initialize(): Promise<void> {
    // API-based engines don't need initialization
    console.log("✅ Claude API engine initialized");
  }

  async query(prompt: string): Promise<QueryResult> {
    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const text =
        response.content[0]?.type === "text"
          ? response.content[0].text
          : "No response received";

      return {
        text,
        html: `<div>${text}</div>`,
      };
    } catch (error) {
      throw new Error(
        `Claude API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for API-based engines
  }
}
