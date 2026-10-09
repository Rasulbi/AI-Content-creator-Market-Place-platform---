import { AIModelProvider, AIProviderId } from "./provider-interface";
import { OpenRouterProvider } from "./openrouter-provider";
import { GrokProvider } from "./grok-provider";
import { aiLogger } from "./logger";

export type SupportedAIProvider = AIProviderId;

/**
 * AI Provider Factory
 * Resolves the configured provider dynamically using the AI_PROVIDER environment variable.
 * Defaults to "openrouter" as primary provider.
 */
export function getAIProvider(explicitProvider?: string): AIModelProvider {
  const rawProvider = (
    explicitProvider ||
    (typeof process !== "undefined" ? process.env.AI_PROVIDER : "") ||
    "openrouter"
  )
    .toLowerCase()
    .trim();

  if (rawProvider === "groq" || rawProvider === "grok" || rawProvider === "xai") {
    return new GrokProvider();
  }

  if (rawProvider !== "openrouter" && rawProvider !== "") {
    aiLogger.warn(
      `Unrecognized AI_PROVIDER "${rawProvider}". Defaulting to "openrouter". Supported options: openrouter, grok`
    );
  }

  return new OpenRouterProvider();
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
    if (provider.id === "openrouter") {
      statusMessage =
        "OPENROUTER_API_KEY is missing or invalid. Set OPENROUTER_API_KEY in .env.local or fallback engine will be used.";
    } else {
      statusMessage =
        "XAI_API_KEY is missing or invalid. Set XAI_API_KEY in .env.local or fallback engine will be used.";
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
