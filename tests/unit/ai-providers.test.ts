import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { GeminiProvider } from "../../lib/ai/gemini-provider";
import { OpenRouterProvider } from "../../lib/ai/openrouter-provider";
import { GrokProvider } from "../../lib/ai/grok-provider";
import { OpenAIProvider } from "../../lib/ai/openai-provider";
import { getAIProvider, getAIConfigurationStatus } from "../../lib/ai/provider-factory";

describe("Unit Tests: AI Providers & Factory (Mocked)", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  describe("OpenRouterProvider configuration & credential validation", () => {
    it("should report unconfigured when key is empty, undefined, or placeholder", () => {
      process.env.OPENROUTER_API_KEY = "";
      const provider1 = new OpenRouterProvider();
      assert.equal(provider1.isConfigured(), false);

      process.env.OPENROUTER_API_KEY = "sk-or-v1-your-key-here";
      const provider2 = new OpenRouterProvider();
      assert.equal(provider2.isConfigured(), false);

      process.env.OPENROUTER_API_KEY = "paste-your-key";
      const provider3 = new OpenRouterProvider();
      assert.equal(provider3.isConfigured(), false);
    });

    it("should report configured when a valid key format is provided", () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-mock-valid-format-key-abcdef1234567890";
      const provider = new OpenRouterProvider();
      assert.equal(provider.isConfigured(), true);
      assert.equal(provider.id, "openrouter");
      assert.equal(provider.name, "OpenRouter AI");
    });

    it("should throw a clean error when generateText is called without valid configuration", async () => {
      process.env.OPENROUTER_API_KEY = "";
      const unconfigured = new OpenRouterProvider();
      await assert.rejects(
        () => unconfigured.generateText("Hello"),
        /OPENROUTER_NOT_CONFIGURED/i
      );
    });

    it("should handle successful chat completions with mocked fetch", async () => {
      const mockKey = "sk-or-v1-mock-valid-key-1234567890";
      process.env.OPENROUTER_API_KEY = mockKey;
      const provider = new OpenRouterProvider();

      global.fetch = async (url: any, options: any) => {
        assert.ok(String(url).includes("openrouter.ai/api/v1/chat/completions"));
        assert.equal(options.headers.Authorization, `Bearer ${mockKey}`);

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "### Viral Content Strategy\nHere are 3 tips for tech creators.",
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const reply = await provider.generateText("Give me content tips");
      assert.ok(reply.includes("Viral Content Strategy"));
    });

    it("should extract structured JSON correctly from mocked response", async () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-mock-valid-key-1234567890";
      const provider = new OpenRouterProvider();

      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: '```json\n{"deliverables": ["3 Reels"], "budget": 20000}\n```',
                },
              },
            ],
          }),
          { status: 200 }
        );
      };

      const result = await provider.generateStructuredJSON<{ deliverables: string[]; budget: number }>(
        "Extract deliverables"
      );
      assert.deepEqual(result.deliverables, ["3 Reels"]);
      assert.equal(result.budget, 20000);
    });

    it("should handle HTTP 401 Unauthorized safely without leaking API key in error message", async () => {
      const secretKey = "sk-or-v1-super-secret-key-that-must-never-leak";
      process.env.OPENROUTER_API_KEY = secretKey;
      const provider = new OpenRouterProvider();

      global.fetch = async () => {
        return new Response(
          JSON.stringify({ error: { message: "Invalid API key provided." } }),
          { status: 401, statusText: "Unauthorized" }
        );
      };

      try {
        await provider.generateText("Test prompt");
        assert.fail("Expected provider to throw on HTTP 401");
      } catch (err: any) {
        assert.ok(err.message.includes("401") || err.message.includes("Unauthorized") || err.message.includes("Invalid API key"));
        assert.equal(err.message.includes(secretKey), false, "API key was leaked in error message!");
      }
    });

    it("should handle HTTP 429 Rate Limit error gracefully", async () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-mock-valid-key-1234567890";
      const provider = new OpenRouterProvider();

      global.fetch = async () => {
        return new Response(
          JSON.stringify({ error: { message: "Rate limit exceeded. Please wait 10s." } }),
          { status: 429 }
        );
      };

      await assert.rejects(
        () => provider.generateText("Test"),
        /429|Rate limit/i
      );
    });

    it("should handle network timeout / AbortSignal error safely", async () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-mock-valid-key-1234567890";
      const provider = new OpenRouterProvider();

      global.fetch = async () => {
        const timeoutErr = new Error("The operation was aborted due to timeout");
        timeoutErr.name = "TimeoutError";
        throw timeoutErr;
      };

      await assert.rejects(
        () => provider.generateText("Test timeout"),
        /timed out/i
      );
    });

    it("should handle HTTP 402 Payment Required (insufficient credits) safely without leaking secrets", async () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-mock-valid-key-1234567890";
      const provider = new OpenRouterProvider();

      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: "User has insufficient credits to complete this request",
              code: 402,
            },
          }),
          { status: 402 }
        );
      };

      await assert.rejects(
        () => provider.generateText("Test insufficient credits"),
        (err: Error) => {
          assert.ok(err.message.includes("402") || err.message.includes("credit balance exhausted"));
          assert.ok(!err.message.includes("sk-or-v1-mock-valid-key-1234567890"), "Must not leak API key");
          return true;
        }
      );
    });
  });

  describe("GrokProvider configuration & mock execution", () => {
    it("should detect Groq Cloud and xAI Grok configuration status", () => {
      delete process.env.GROQ_API_KEY;
      delete process.env.XAI_API_KEY;
      const unconfigured = new GrokProvider();
      assert.equal(unconfigured.isConfigured(), false);

      process.env.GROQ_API_KEY = "gsk_valid-mock-groq-key-1234567890";
      const groqCloud = new GrokProvider();
      assert.equal(groqCloud.isConfigured(), true);
      assert.ok((groqCloud as any).baseUrl.includes("groq.com"));

      delete process.env.GROQ_API_KEY;
      process.env.XAI_API_KEY = "xai-valid-mock-grok-key-1234567890";
      const xaiGrok = new GrokProvider();
      assert.equal(xaiGrok.isConfigured(), true);
      assert.ok((xaiGrok as any).baseUrl.includes("x.ai"));
    });

    it("should handle mocked chat completion with Groq Cloud", async () => {
      process.env.GROQ_API_KEY = "gsk_mock-groq-key-1234567890";
      const provider = new GrokProvider();

      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "Groq response: Fast inference completed." } }],
          }),
          { status: 200 }
        );
      };

      const reply = await provider.generateText("Hello Groq");
      assert.ok(reply.includes("Fast inference completed"));
    });
  });

  describe("GeminiProvider configuration & mock execution", () => {
    it("should report unconfigured when key is empty, undefined, or placeholder", () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      const unconfigured = new GeminiProvider();
      assert.equal(unconfigured.isConfigured(), false);

      process.env.GEMINI_API_KEY = "paste-your-key";
      const unconfigured2 = new GeminiProvider();
      assert.equal(unconfigured2.isConfigured(), false);

      process.env.GEMINI_API_KEY = "your-gemini-key";
      const unconfigured3 = new GeminiProvider();
      assert.equal(unconfigured3.isConfigured(), false);
    });

    it("should report configured when a valid key format is provided", () => {
      process.env.GEMINI_API_KEY = "AIzaSyMockValidGeminiKey1234567890abcdef";
      const provider = new GeminiProvider();
      assert.equal(provider.isConfigured(), true);
      assert.equal(provider.id, "gemini");
      assert.equal(provider.name, "Google Gemini AI");
    });

    it("should sanitize models/ prefix in model name", () => {
      process.env.GEMINI_MODEL = "models/gemini-flash-latest";
      const provider = new GeminiProvider();
      assert.equal(provider.model, "gemini-flash-latest");
    });

    it("should map retired model names to supported models", () => {
      process.env.GEMINI_MODEL = "models/gemini-1.5-pro";
      const provider = new GeminiProvider();
      assert.equal(provider.model, "gemini-flash-latest");
    });

    it("should throw GEMINI_NOT_CONFIGURED error when generateText is called without valid key", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      const unconfigured = new GeminiProvider();
      await assert.rejects(
        () => unconfigured.generateText("Hello"),
        /GEMINI_NOT_CONFIGURED/i
      );
    });

    it("should handle successful chat text generation with mocked fetch", async () => {
      const mockKey = "AIzaSyMockValidGeminiKey1234567890abcdef";
      process.env.GEMINI_API_KEY = mockKey;
      const provider = new GeminiProvider();

      global.fetch = async (url: any, options: any) => {
        assert.ok(String(url).includes("generativelanguage.googleapis.com"));
        assert.equal(options.headers["x-goog-api-key"], mockKey);

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: "### Gemini Strategy\nHere are 3 video hooks for creators." }],
                  role: "model",
                },
                finishReason: "STOP",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const reply = await provider.generateText("Give me video hooks");
      assert.ok(reply.includes("Gemini Strategy"));
    });

    it("should extract structured JSON correctly from Gemini response", async () => {
      process.env.GEMINI_API_KEY = "AIzaSyMockValidGeminiKey1234567890abcdef";
      const provider = new GeminiProvider();

      global.fetch = async (url: any, options: any) => {
        const body = JSON.parse(options.body);
        assert.equal(body.generationConfig.responseMimeType, "application/json");

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"deliverables": ["3 Instagram Reels"], "budget": 35000}' }],
                  role: "model",
                },
                finishReason: "STOP",
              },
            ],
          }),
          { status: 200 }
        );
      };

      const result = await provider.generateStructuredJSON<{ deliverables: string[]; budget: number }>(
        "Extract deliverables"
      );
      assert.deepEqual(result.deliverables, ["3 Instagram Reels"]);
      assert.equal(result.budget, 35000);
    });

    it("should handle HTTP 401/403 without leaking API key in error message", async () => {
      const secretKey = "AIzaSySuperSecretKeyThatMustNeverLeak12345";
      process.env.GEMINI_API_KEY = secretKey;
      const provider = new GeminiProvider();

      global.fetch = async () => {
        return new Response(
          JSON.stringify({ error: { message: "API key not valid." } }),
          { status: 401, statusText: "Unauthorized" }
        );
      };

      try {
        await provider.generateText("Test prompt");
        assert.fail("Expected provider to throw on HTTP 401");
      } catch (err: any) {
        assert.ok(err.message.includes("401") || err.message.includes("authentication failed"));
        assert.equal(err.message.includes(secretKey), false, "API key was leaked in error message!");
      }
    });

    it("should handle HTTP 429 rate limit / quota exhausted gracefully", async () => {
      process.env.GEMINI_API_KEY = "AIzaSyMockValidGeminiKey1234567890abcdef";
      const provider = new GeminiProvider();

      global.fetch = async () => {
        return new Response(
          JSON.stringify({ error: { message: "Resource has been exhausted (e.g. check quota)." } }),
          { status: 429 }
        );
      };

      await assert.rejects(
        () => provider.generateText("Test"),
        /429|rate limit|quota/i
      );
    });

    it("should throw error when Gemini content generation is blocked by safety filters", async () => {
      process.env.GEMINI_API_KEY = "AIzaSyMockValidGeminiKey1234567890abcdef";
      const provider = new GeminiProvider();

      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "SAFETY",
              },
            ],
          }),
          { status: 200 }
        );
      };

      await assert.rejects(
        () => provider.generateText("Unsafe prompt"),
        /safety filters/i
      );
    });
  });

  describe("GrokProvider & Groq Cloud configuration & error messages", () => {
    it("should attribute Groq Cloud and reference GROQ_API_KEY when GROQ_API_KEY is configured", async () => {
      process.env.GROQ_API_KEY = "gsk_mock_valid_key_1234567890123456";
      delete process.env.XAI_API_KEY;
      const provider = new GrokProvider();

      assert.equal(provider.name, "Groq AI");
      assert.equal(provider.model, "llama-3.3-70b-versatile");
      assert.equal(provider.isConfigured(), true);

      global.fetch = async () => {
        return new Response(JSON.stringify({ error: { message: "Invalid API Key" } }), {
          status: 401,
        });
      };

      await assert.rejects(
        () => provider.generateText("Test"),
        (err: Error) => {
          assert.ok(err.message.includes("Groq AI authentication failed"));
          assert.ok(err.message.includes("GROQ_API_KEY"));
          assert.ok(!err.message.includes("gsk_mock_valid_key_1234567890123456"), "Secret key must not leak");
          return true;
        }
      );
    });

    it("should attribute xAI Grok and reference XAI_API_KEY when XAI_API_KEY is configured", async () => {
      delete process.env.GROQ_API_KEY;
      delete process.env.AI_PROVIDER;
      process.env.XAI_API_KEY = "xai_mock_valid_key_1234567890123456";
      const provider = new GrokProvider();

      assert.equal(provider.name, "xAI Grok");
      assert.equal(provider.model, "grok-2-latest");
      assert.equal(provider.isConfigured(), true);

      global.fetch = async () => {
        return new Response(JSON.stringify({ error: { message: "Invalid API Key" } }), {
          status: 401,
        });
      };

      await assert.rejects(
        () => provider.generateText("Test"),
        (err: Error) => {
          assert.ok(err.message.includes("xAI Grok authentication failed"));
          assert.ok(err.message.includes("XAI_API_KEY"));
          assert.ok(!err.message.includes("xai_mock_valid_key_1234567890123456"), "Secret key must not leak");
          return true;
        }
      );
    });

    it("should throw GROQ_NOT_CONFIGURED when AI_PROVIDER=groq and key is missing", async () => {
      delete process.env.GROQ_API_KEY;
      delete process.env.XAI_API_KEY;
      process.env.AI_PROVIDER = "groq";
      const provider = new GrokProvider();

      await assert.rejects(
        () => provider.generateText("Test"),
        /GROQ_NOT_CONFIGURED: GROQ_API_KEY is missing or invalid/i
      );
    });

    it("should throw GROK_NOT_CONFIGURED when AI_PROVIDER=grok and key is missing", async () => {
      delete process.env.GROQ_API_KEY;
      delete process.env.XAI_API_KEY;
      process.env.AI_PROVIDER = "grok";
      const provider = new GrokProvider();

      await assert.rejects(
        () => provider.generateText("Test"),
        /GROK_NOT_CONFIGURED: XAI_API_KEY is missing or invalid/i
      );
    });
  });

  describe("OpenAIProvider configuration & chat completions", () => {
    it("should report unconfigured when OPENAI_API_KEY is missing or placeholder", () => {
      delete process.env.OPENAI_API_KEY;
      const provider1 = new OpenAIProvider();
      assert.equal(provider1.isConfigured(), false);

      process.env.OPENAI_API_KEY = "your_openai_key_here";
      const provider2 = new OpenAIProvider();
      assert.equal(provider2.isConfigured(), false);
    });

    it("should report configured and default to gpt-4o-mini", () => {
      process.env.OPENAI_API_KEY = "sk-mock-valid-openai-key-1234567890123";
      const provider = new OpenAIProvider();
      assert.equal(provider.isConfigured(), true);
      assert.equal(provider.id, "openai");
      assert.equal(provider.name, "OpenAI");
      assert.equal(provider.model, "gpt-4o-mini");
    });

    it("should normalize provider prefixes in OPENAI_MODEL", () => {
      process.env.OPENAI_MODEL = "openai/gpt-4o";
      const provider = new OpenAIProvider();
      assert.equal(provider.model, "gpt-4o");
    });

    it("should throw OPENAI_NOT_CONFIGURED when called without valid key", async () => {
      delete process.env.OPENAI_API_KEY;
      const unconfigured = new OpenAIProvider();
      await assert.rejects(
        () => unconfigured.generateText("Hello"),
        /OPENAI_NOT_CONFIGURED: OPENAI_API_KEY is missing or invalid/i
      );
    });

    it("should generate text correctly with mocked fetch", async () => {
      const mockKey = "sk-mock-valid-openai-key-1234567890123";
      process.env.OPENAI_API_KEY = mockKey;
      const provider = new OpenAIProvider();

      global.fetch = async (url: any, options: any) => {
        assert.ok(String(url).includes("api.openai.com/v1/chat/completions"));
        assert.equal(options.headers.Authorization, `Bearer ${mockKey}`);

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "### Viral Content Plan\nHere are 3 tips from OpenAI.",
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const reply = await provider.generateText("Give me a content plan");
      assert.ok(reply.includes("Viral Content Plan"));
    });

    it("should extract structured JSON correctly from OpenAI response", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-valid-openai-key-1234567890123";
      const provider = new OpenAIProvider();

      global.fetch = async (url: any, options: any) => {
        const body = JSON.parse(options.body);
        assert.deepEqual(body.response_format, { type: "json_object" });

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: '{"deliverables": ["3 TikTok Videos"], "budget": 25000}',
                },
              },
            ],
          }),
          { status: 200 }
        );
      };

      const result = await provider.generateStructuredJSON<{ deliverables: string[]; budget: number }>(
        "Extract deliverables"
      );
      assert.deepEqual(result.deliverables, ["3 TikTok Videos"]);
      assert.equal(result.budget, 25000);
    });

    it("should handle HTTP 401 without leaking OPENAI_API_KEY in error message", async () => {
      const secretKey = "sk-super-secret-openai-key-never-leak-99999";
      process.env.OPENAI_API_KEY = secretKey;
      const provider = new OpenAIProvider();

      global.fetch = async () => {
        return new Response(
          JSON.stringify({ error: { message: "Incorrect API key provided" } }),
          { status: 401 }
        );
      };

      try {
        await provider.generateText("Test prompt");
        assert.fail("Expected provider to throw on HTTP 401");
      } catch (err: any) {
        assert.ok(err.message.includes("401") || err.message.includes("authentication failed"));
        assert.equal(err.message.includes(secretKey), false, "API key was leaked in error message!");
      }
    });

    it("should handle HTTP 429 rate limit safely", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-valid-openai-key-1234567890123";
      const provider = new OpenAIProvider();

      global.fetch = async () => {
        return new Response(
          JSON.stringify({ error: { message: "Rate limit reached for requests" } }),
          { status: 429 }
        );
      };

      await assert.rejects(
        () => provider.generateText("Test"),
        /429|rate limit|quota/i
      );
    });
  });

  describe("Provider Factory (getAIProvider)", () => {
    it("should return the configured provider correctly", () => {
      const geminiProvider = getAIProvider("gemini");
      assert.equal(geminiProvider.id, "gemini");

      const googleProvider = getAIProvider("google");
      assert.equal(googleProvider.id, "gemini");

      const openRouterProvider = getAIProvider("openrouter");
      assert.equal(openRouterProvider.id, "openrouter");

      const grokProvider = getAIProvider("grok");
      assert.equal(grokProvider.id, "grok");

      const groqProvider = getAIProvider("groq" as any);
      assert.equal(groqProvider.id, "grok");

      const openAiProvider = getAIProvider("openai");
      assert.equal(openAiProvider.id, "openai");
      assert.equal(openAiProvider.name, "OpenAI");
    });

    it("should resolve OpenAI when AI_PROVIDER=openai", () => {
      process.env.AI_PROVIDER = "openai";
      const provider = getAIProvider();
      assert.equal(provider.id, "openai");
    });

    it("should default to Gemini when AI_PROVIDER is unset", () => {
      delete process.env.AI_PROVIDER;
      const defaultProvider = getAIProvider();
      assert.equal(defaultProvider.id, "gemini");
    });

    it("should return configuration status object with provider metadata", () => {
      const status = getAIConfigurationStatus();
      assert.ok("provider" in status);
      assert.ok("model" in status);
      assert.ok("isConfigured" in status);
    });

    it("should return correct configuration status message for OpenAI", () => {
      process.env.AI_PROVIDER = "openai";
      delete process.env.OPENAI_API_KEY;
      const status = getAIConfigurationStatus();
      assert.equal(status.provider, "openai");
      assert.equal(status.isConfigured, false);
      assert.ok(status.statusMessage.includes("OPENAI_API_KEY"));
    });
  });
});
