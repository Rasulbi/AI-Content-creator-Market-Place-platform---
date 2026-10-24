import { AIModelProvider } from "./provider-interface";
import { aiLogger } from "./logger";
import { extractJSON } from "./json-parser";

/**
 * OpenAI Model Provider
 *
 * Official endpoint: https://api.openai.com/v1
 * Documentation: https://platform.openai.com/docs
 *
 * SECURITY:
 * Runs STRICTLY on the server. Never imported in Client Components.
 * Reads OPENAI_API_KEY from environment variables.
 * Never logs or exposes credentials.
 */
export class OpenAIProvider implements AIModelProvider {
  public readonly id = "openai" as const;
  public readonly name = "OpenAI";

  private readonly baseUrl = "https://api.openai.com/v1";

  /**
   * Resolves model dynamically from OPENAI_MODEL or AI_MODEL environment variables.
   * Defaults safely to "gpt-4o-mini".
   */
  get model(): string {
    const envModel =
      process.env.OPENAI_MODEL?.trim() ||
      process.env.AI_MODEL?.trim();
    if (envModel && !envModel.startsWith("REPLACE_WITH_") && !envModel.startsWith("paste-")) {
      // Remove provider prefix if passed from multi-provider configs (e.g. openai/gpt-4o-mini -> gpt-4o-mini)
      if (envModel.startsWith("openai/")) {
        return envModel.replace("openai/", "");
      }
      return envModel;
    }
    return "gpt-4o-mini";
  }

  private get apiKey(): string | null {
    if (typeof window !== "undefined") return null;
    return process.env.OPENAI_API_KEY?.trim() || null;
  }

  isConfigured(): boolean {
    const key = this.apiKey;
    if (!key) return false;
    if (
      key.startsWith("paste-") ||
      key.startsWith("your_") ||
      key.includes("your-") ||
      key.includes("REPLACE_WITH_") ||
      key.length < 15
    ) {
      return false;
    }
    return true;
  }

  /**
   * Generates a strongly typed structured JSON response via OpenAI Chat Completions API
   */
  async generateStructuredJSON<T>(
    prompt: string,
    systemInstruction?: string,
    schemaHint?: string
  ): Promise<T> {
    return aiLogger.time(
      "OpenAIProvider.generateStructuredJSON",
      async () => {
        if (!this.isConfigured()) {
          throw new Error(
            "OPENAI_NOT_CONFIGURED: OPENAI_API_KEY is missing or invalid. Please check your .env.local configuration."
          );
        }

        const fullSystem = `${
          systemInstruction ? `${systemInstruction}\n\n` : ""
        }${
          schemaHint ? `Target JSON Schema:\n${schemaHint}\n\n` : ""
        }CRITICAL: You must respond ONLY with a valid JSON object matching the requested schema. Do NOT wrap with markdown backticks or include any conversational filler.`;

        const bodyPayload = {
          model: this.model,
          messages: [
            { role: "system", content: fullSystem },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        };

        const responseText = await this.executeChatCompletion(bodyPayload);
        return extractJSON<T>(responseText);
      },
      { provider: this.name, model: this.model }
    );
  }

  /**
   * Generates natural language analysis or text explanation via OpenAI Chat Completions API
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    return aiLogger.time(
      "OpenAIProvider.generateText",
      async () => {
        if (!this.isConfigured()) {
          throw new Error(
            "OPENAI_NOT_CONFIGURED: OPENAI_API_KEY is missing or invalid. Please check your .env.local configuration."
          );
        }

        const messages: Array<{ role: "system" | "user"; content: string }> = [];
        if (systemInstruction) {
          messages.push({ role: "system", content: systemInstruction });
        }
        messages.push({ role: "user", content: prompt });

        const bodyPayload = {
          model: this.model,
          messages,
          temperature: 0.3,
        };

        return this.executeChatCompletion(bodyPayload);
      },
      { provider: this.name, model: this.model }
    );
  }

  /**
   * Low-level helper for OpenAI chat completions with error handling, timeouts, and safe error messages
   */
  private async executeChatCompletion(payload: Record<string, unknown>): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30-second timeout
      });
    } catch (networkErr) {
      const err = networkErr as Error;
      if (err.name === "TimeoutError") {
        throw new Error("OpenAI request timed out after 30 seconds.");
      }
      throw new Error(`OpenAI network connection error: ${err.message}`);
    }

    if (!response.ok) {
      let errorBody = "";
      try {
        const errorJson = await response.json();
        errorBody = errorJson.error?.message || JSON.stringify(errorJson);
      } catch {
        errorBody = await response.text().catch(() => "");
      }

      if (response.status === 401) {
        throw new Error(
          "OpenAI authentication failed (HTTP 401). Please verify your OPENAI_API_KEY."
        );
      }
      if (response.status === 429) {
        throw new Error(
          "OpenAI rate limit reached or quota exhausted (HTTP 429). Please wait before retrying."
        );
      }

      // If model does not support response_format: { type: "json_object" }, retry once without it
      if (
        response.status === 400 &&
        payload.response_format &&
        errorBody.toLowerCase().includes("response_format")
      ) {
        aiLogger.warn("OpenAI model does not support response_format json_object, retrying without it", {
          model: this.model,
        });
        const fallbackPayload = { ...payload };
        delete fallbackPayload.response_format;
        return this.executeChatCompletion(fallbackPayload);
      }

      throw new Error(
        `OpenAI API error (HTTP ${response.status}): ${errorBody || response.statusText}`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("OpenAI returned an empty or invalid response format.");
    }

    return content;
  }
}
