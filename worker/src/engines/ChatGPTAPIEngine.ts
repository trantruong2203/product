/**
 * ChatGPT API Engine - Uses OpenAI API instead of browser automation
 */

import OpenAI from "openai";
import { IEngine, QueryResult } from "./IEngine.js";

export class ChatGPTAPIEngine implements IEngine {
  readonly name = "ChatGPT";
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    this.client = new OpenAI({ apiKey });
  }

  async initialize(): Promise<void> {
    // API-based engines don't need initialization
    console.log("✅ ChatGPT API engine initialized");
  }

  async query(prompt: string): Promise<QueryResult> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const text =
        response.choices[0]?.message?.content || "No response received";

      return {
        text,
        html: `<div>${text}</div>`,
      };
    } catch (error) {
      throw new Error(
        `ChatGPT API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for API-based engines
  }
}
