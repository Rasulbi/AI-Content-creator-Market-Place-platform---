import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { OpenRouterProvider } from "../../lib/ai/openrouter-provider";
import { GrokProvider } from "../../lib/ai/grok-provider";
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

  describe("Provider Factory (getAIProvider)", () => {
    it("should return the configured provider correctly", () => {
      const provider = getAIProvider("openrouter");
      assert.equal(provider.id, "openrouter");

      const grokProvider = getAIProvider("grok");
      assert.equal(grokProvider.id, "grok");

      const groqProvider = getAIProvider("groq" as any);
      assert.equal(groqProvider.id, "grok");
    });

    it("should return configuration status object with provider metadata", () => {
      const status = getAIConfigurationStatus();
      assert.ok("provider" in status);
      assert.ok("model" in status);
      assert.ok("isConfigured" in status);
    });
  });
});
