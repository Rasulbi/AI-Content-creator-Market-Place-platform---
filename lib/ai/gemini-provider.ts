import { AIModelProvider } from "./provider-interface";
import { aiLogger } from "./logger";
import { extractJSON } from "./json-parser";

/**
 * Google Gemini AI Model Provider (Primary)
 *
 * Official endpoint: https://generativelanguage.googleapis.com/v1beta
 * Documentation: https://ai.google.dev/docs
 *
 * SECURITY:
 * Runs STRICTLY on the server. Never imported in Client Components.
 * Reads GEMINI_API_KEY (or GOOGLE_API_KEY) from environment variables.
 * Uses x-goog-api-key header to prevent key leakage in request URLs.
 */
export class GeminiProvider implements AIModelProvider {
  public readonly id = "gemini" as const;
  public readonly name = "Google Gemini AI";

  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  /**
   * Resolves model dynamically from GEMINI_MODEL or AI_MODEL environment variables.
   * Defaults to "gemini-flash-latest" (supported on Google v1beta).
   */
  get model(): string {
    const geminiModel = process.env.GEMINI_MODEL?.trim();
    if (geminiModel && !geminiModel.startsWith("REPLACE_WITH_") && !geminiModel.startsWith("paste-")) {
      return this.sanitizeModelName(geminiModel);
    }

    const envModel = process.env.AI_MODEL?.trim();
    if (
      envModel &&
      !envModel.startsWith("REPLACE_WITH_") &&
      !envModel.startsWith("paste-") &&
      !envModel.includes("openai/") &&
      !envModel.includes("gpt-") &&
      !envModel.includes("claude-") &&
      !envModel.includes("llama-")
    ) {
      return this.sanitizeModelName(envModel);
    }

    // Default fast, high-quality, multimodal production model on Google v1beta
    return "gemini-flash-latest";
  }

  private sanitizeModelName(modelName: string): string {
    const clean = modelName.replace(/^models\//, "").trim();
    // Dynamically upgrade retired/deprecated Google model names to currently supported models
    if (
      clean === "gemini-1.5-flash" ||
      clean === "gemini-1.5-flash-latest" ||
      clean === "gemini-2.0-flash" ||
      clean === "gemini-2.5-flash" ||
      clean === "gemini-pro"
    ) {
      return "gemini-flash-latest";
    }
    if (
      clean === "gemini-1.5-pro" ||
      clean === "gemini-2.0-pro" ||
      clean === "gemini-2.5-pro"
    ) {
      return "gemini-flash-latest";
    }
    return clean || "gemini-flash-latest";
  }

  private get apiKey(): string | null {
    if (typeof window !== "undefined") return null;
    return (
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.GOOGLE_AI_API_KEY?.trim() ||
      null
    );
  }

  isConfigured(): boolean {
    const key = this.apiKey;
    if (!key) return false;
    if (
      key.startsWith("paste-") ||
      key.includes("your-") ||
      key.includes("REPLACE_WITH_") ||
      key.length < 15
    ) {
      return false;
    }
    return true;
  }

  /**
   * Generates a strongly typed structured JSON response via Google Gemini API
   */
  async generateStructuredJSON<T>(
    prompt: string,
    systemInstruction?: string,
    schemaHint?: string
  ): Promise<T> {
    return aiLogger.time(
      "GeminiProvider.generateStructuredJSON",
      async () => {
        if (!this.isConfigured()) {
          throw new Error(
            "GEMINI_NOT_CONFIGURED: GEMINI_API_KEY is missing or invalid. Please check your .env.local configuration."
          );
        }

        const fullSystem = `${
          systemInstruction ? `${systemInstruction}\n\n` : ""
        }${
          schemaHint ? `Target JSON Schema:\n${schemaHint}\n\n` : ""
        }CRITICAL: You must respond ONLY with a valid JSON object matching the requested schema. Do NOT wrap with markdown backticks or include any conversational filler.`;

        const bodyPayload: Record<string, unknown> = {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          systemInstruction: {
            parts: [{ text: fullSystem }],
          },
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        };

        const responseText = await this.executeGenerateContent(bodyPayload, true);
        return extractJSON<T>(responseText);
      },
      { provider: this.name, model: this.model }
    );
  }

  /**
   * Generates natural language analysis or text explanation via Google Gemini API
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    return aiLogger.time(
      "GeminiProvider.generateText",
      async () => {
        if (!this.isConfigured()) {
          throw new Error(
            "GEMINI_NOT_CONFIGURED: GEMINI_API_KEY is missing or invalid. Please check your .env.local configuration."
          );
        }

        const bodyPayload: Record<string, unknown> = {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
          },
        };

        if (systemInstruction) {
          bodyPayload.systemInstruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        return this.executeGenerateContent(bodyPayload, false);
      },
      { provider: this.name, model: this.model }
    );
  }

  /**
   * Low-level helper for Gemini generateContent with error handling, timeouts, and fallback
   */
  private async executeGenerateContent(
    payload: Record<string, unknown>,
    isJsonMode: boolean,
    modelOverride?: string
  ): Promise<string> {
    const activeModel = modelOverride || this.model;
    const url = `${this.baseUrl}/models/${activeModel}:generateContent`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey || "",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30-second timeout
      });
    } catch (networkErr) {
      const err = networkErr as Error;
      if (err.name === "TimeoutError") {
        throw new Error("Google Gemini request timed out after 30 seconds.");
      }
      throw new Error(`Google Gemini network connection error: ${err.message}`);
    }

    if (!response.ok) {
      let errorBody = "";
      try {
        const errorJson = await response.json();
        errorBody = errorJson.error?.message || JSON.stringify(errorJson);
      } catch {
        errorBody = await response.text().catch(() => "");
      }

      // Resilient fallback on 404 (model retired) or 503 (high demand spike)
      if ((response.status === 404 || response.status === 503) && !modelOverride) {
        const fallbackModel = activeModel === "gemini-flash-lite-latest" ? "gemini-flash-latest" : "gemini-flash-lite-latest";
        aiLogger.warn(
          `Gemini model '${activeModel}' returned HTTP ${response.status}. Retrying with resilient fallback model '${fallbackModel}'.`
        );
        return this.executeGenerateContent(payload, isJsonMode, fallbackModel);
      }

      // Safe error messages without leaking secrets
      if (response.status === 400) {
        // If responseMimeType: "application/json" is rejected by this model, retry once without it
        if (
          isJsonMode &&
          payload.generationConfig &&
          (errorBody.toLowerCase().includes("responsemimetype") ||
            errorBody.toLowerCase().includes("generationconfig"))
        ) {
          aiLogger.warn("Gemini model rejected responseMimeType, retrying without it", {
            model: activeModel,
          });
          const fallbackPayload = {
            ...payload,
            generationConfig: {
              ...(payload.generationConfig as Record<string, unknown>),
              responseMimeType: undefined,
            },
          };
          return this.executeGenerateContent(fallbackPayload, false, activeModel);
        }

        throw new Error(`Google Gemini Bad Request (HTTP 400): ${errorBody}`);
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Google Gemini authentication failed (HTTP 401/403). Please verify your GEMINI_API_KEY and ensure Generative Language API is enabled."
        );
      }

      if (response.status === 429) {
        throw new Error(
          "Google Gemini rate limit reached or quota exhausted (HTTP 429). Please wait before retrying."
        );
      }

      throw new Error(
        `Google Gemini API error (HTTP ${response.status}): ${errorBody || response.statusText}`
      );
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    // Check for finish reason and safety blocks
    if (candidate?.finishReason === "SAFETY") {
      throw new Error("Google Gemini content generation was blocked by safety filters.");
    }

    const contentText = candidate?.content?.parts?.[0]?.text;

    if (typeof contentText !== "string" || !contentText.trim()) {
      throw new Error("Google Gemini returned an empty or invalid response format.");
    }

    return contentText;
  }
}
