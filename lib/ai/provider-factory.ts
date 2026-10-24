import { AIModelProvider, AIProviderId } from "./provider-interface";
import { GeminiProvider } from "./gemini-provider";
import { OpenRouterProvider } from "./openrouter-provider";
import { GrokProvider } from "./grok-provider";
import { OpenAIProvider } from "./openai-provider";
import { aiLogger } from "./logger";

export type SupportedAIProvider = AIProviderId;

/**
 * AI Provider Factory
 * Resolves the configured provider dynamically using the AI_PROVIDER environment variable.
 * Defaults to "gemini" (Google Gemini) as primary provider.
 */
export function getAIProvider(explicitProvider?: string): AIModelProvider {
  const rawProvider = (
    explicitProvider ||
    (typeof process !== "undefined" ? process.env.AI_PROVIDER : "") ||
    "gemini"
  )
    .toLowerCase()
    .trim();

  if (rawProvider === "gemini" || rawProvider === "google") {
    return new GeminiProvider();
  }

  if (rawProvider === "openrouter") {
    return new OpenRouterProvider();
  }

  if (rawProvider === "groq" || rawProvider === "grok" || rawProvider === "xai") {
    return new GrokProvider();
  }

  if (rawProvider === "openai") {
    return new OpenAIProvider();
  }

  if (rawProvider !== "gemini" && rawProvider !== "") {
    aiLogger.warn(
      `Unrecognized AI_PROVIDER "${rawProvider}". Defaulting to "gemini". Supported options: gemini, openrouter, grok, openai`
    );
  }

  return new GeminiProvider();
}

/**
 * Helper to inspect the current active AI configuration status (useful for health checks, diagnostics)
 */
export function getAIConfigurationStatus(): {
  provider: AIProviderId;
  providerName: string;
  model: string;
  isConfigured: boolean;
  statusMessage: string;
} {
  const provider = getAIProvider();
  const isConfigured = provider.isConfigured();

  let statusMessage = "Configured and ready.";
  if (!isConfigured) {
    if (provider.id === "gemini") {
      statusMessage =
        "GEMINI_API_KEY is missing or invalid. Set GEMINI_API_KEY in .env.local or fallback engine will be used.";
    } else if (provider.id === "openrouter") {
      statusMessage =
        "OPENROUTER_API_KEY is missing or invalid. Set OPENROUTER_API_KEY in .env.local or fallback engine will be used.";
    } else if (provider.id === "openai") {
      statusMessage =
        "OPENAI_API_KEY is missing or invalid. Set OPENAI_API_KEY in .env.local or fallback engine will be used.";
    } else {
      statusMessage =
        "GROQ_API_KEY or XAI_API_KEY is missing or invalid. Set in .env.local or fallback engine will be used.";
    }
  }

  return {
    provider: provider.id,
    providerName: provider.name,
    model: provider.model,
    isConfigured,
    statusMessage,
  };
}
