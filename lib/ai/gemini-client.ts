import { AIModelProvider } from "./provider-interface";
import { aiLogger } from "./logger";
import { GoogleGenAI } from "@google/genai";

/**
 * Google Gemini Model Provider
 * 
 * SECURITY:
 * Runs STRICTLY on the server. Never import or use in Client Components.
 * Reads GEMINI_API_KEY from environment variables.
 */
export class GeminiProvider implements AIModelProvider {
  public readonly name = "Google Gemini 1.5 Flash";
  private client: GoogleGenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    // Only access environment variable on server side
    if (typeof window === "undefined") {
      this.apiKey = process.env.GEMINI_API_KEY || null;
      if (this.apiKey) {
        try {
          this.client = new GoogleGenAI({ apiKey: this.apiKey });
          aiLogger.info("GeminiProvider initialized successfully with API key");
        } catch (err) {
          aiLogger.error("Failed to initialize GoogleGenAI client", { error: err });
        }
      } else {
        aiLogger.warn(
          "GEMINI_API_KEY not found in environment variables. Falling back to semantic heuristic engine."
        );
      }
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.client;
  }

  /**
   * Generates structured JSON from Gemini with JSON mode
   */
  async generateStructuredJSON<T>(
    prompt: string,
    systemInstruction?: string,
    schemaHint?: string
  ): Promise<T> {
    return aiLogger.time(
      "GeminiProvider.generateStructuredJSON",
      async () => {
        if (!this.client || !this.apiKey) {
          throw new Error("GEMINI_NOT_CONFIGURED");
        }

        const fullPrompt = `${systemInstruction ? `System Instructions:\n${systemInstruction}\n\n` : ""}${schemaHint ? `Target JSON Schema:\n${schemaHint}\n\n` : ""}User Input:\n${prompt}\n\nRespond ONLY with valid JSON. Do not include markdown formatting or backticks.`;

        const response = await this.client.models.generateContent({
          model: "gemini-1.5-flash",
          contents: fullPrompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        const text = response.text || "{}";
        const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleaned) as T;
      },
      { provider: this.name }
    );
  }

  /**
   * Generates natural language text from Gemini
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    return aiLogger.time(
      "GeminiProvider.generateText",
      async () => {
        if (!this.client || !this.apiKey) {
          throw new Error("GEMINI_NOT_CONFIGURED");
        }

        const fullPrompt = `${systemInstruction ? `System Instructions:\n${systemInstruction}\n\n` : ""}User Request:\n${prompt}`;

        const response = await this.client.models.generateContent({
          model: "gemini-1.5-flash",
          contents: fullPrompt,
          config: {
            temperature: 0.3,
          },
        });

        return response.text || "";
      },
      { provider: this.name }
    );
  }
}

export const defaultGeminiProvider = new GeminiProvider();
