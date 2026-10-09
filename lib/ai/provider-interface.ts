/**
 * Model Provider Abstraction Interface
 * Decouples the marketplace business logic from specific LLM vendors.
 * Supports OpenRouter API (primary) and xAI Grok API (alternative).
 */

export type AIProviderId = "openrouter" | "grok";

export interface AIModelProvider {
  readonly id: AIProviderId;
  readonly name: string;
  readonly model: string;

  /**
   * Returns true if API key and required configuration are present and valid
   */
  isConfigured(): boolean;

  /**
   * Generates a strongly typed structured JSON response based on prompt and schema
   */
  generateStructuredJSON<T>(
    prompt: string,
    systemInstruction?: string,
    schemaHint?: string
  ): Promise<T>;

  /**
   * Generates natural language analysis or text explanation
   */
  generateText(prompt: string, systemInstruction?: string): Promise<string>;
}
