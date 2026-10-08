/**
 * Model Provider Abstraction Interface
 * Decouples the marketplace business logic from specific LLM vendors
 * Allows swapping Google Gemini with Anthropic Claude, OpenAI, or local models.
 */

export interface AIModelProvider {
  readonly name: string;
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
