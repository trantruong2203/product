/**
 * Gemini API Engine - Uses Google Generative AI API instead of browser automation
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { IEngine, QueryResult } from "./IEngine.js";

export class GeminiAPIEngine implements IEngine {
  readonly name = "Gemini";
  private client: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is not set");
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async initialize(): Promise<void> {
    // API-based engines don't need initialization
    console.log("✅ Gemini API engine initialized");
  }

  async query(prompt: string): Promise<QueryResult> {
    try {
      const model = this.client.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      return {
        text,
        html: `<div>${text}</div>`,
      };
    } catch (error) {
      throw new Error(
        `Gemini API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for API-based engines
  }
}
