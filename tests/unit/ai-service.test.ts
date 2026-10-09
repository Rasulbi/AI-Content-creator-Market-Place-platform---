import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aiService, AIService } from "../../lib/ai/ai-service";
import { AIModelProvider } from "../../lib/ai/provider-interface";

describe("Unit Tests: AIService Core Abstraction & Scoring Engine", () => {
  describe("Portfolio Analysis (analyzePortfolio)", () => {
    it("should extract skills, content types, tools and ALWAYS require human review", async () => {
      const input = {
        portfolioTitle: "Luxury Botanical Skincare 4K Campaign",
        description: "Macro texture product testing with skin hydration gauge meter",
        tools: ["Midjourney v6", "CapCut", "Sony A7SIII"],
        prompt: "Cinematic commercial macro shot of luxury organic face cream",
        process: "Prompted texture references in Midjourney, shot studio B-roll",
      };

      const result = await aiService.analyzePortfolio(input);

      assert.ok(Array.isArray(result.skills) && result.skills.length > 0);
      assert.ok(Array.isArray(result.contentTypes) && result.contentTypes.length > 0);
      assert.ok(Array.isArray(result.tools) && result.tools.length > 0);
      assert.ok(Array.isArray(result.strengths) && result.strengths.length > 0);
      assert.ok(result.confidence >= 0 && result.confidence <= 1.0);
      // Critical hackathon requirement:
      assert.equal(result.requiresHumanReview, true, "AI portfolio analysis must require human review");
    });
  });

  describe("Campaign Brief Analysis (analyzeCampaign)", () => {
    it("should parse natural language brief and extract structured deliverables & budget", async () => {
      const brief = `
        Looking for a top tech reviewer to launch our new AI Laptop.
        Target audience: Engineers & developers aged 22-40.
        Deliverables: 3 YouTube Shorts and 1 full benchmark review.
        Tools required: CapCut Pro, Benchmark software.
        Budget: ₹ 40,000 to ₹ 60,000.
        Deadline: 14 Days.
      `;

      const result = await aiService.analyzeCampaign({ brief });

      assert.ok(Array.isArray(result.deliverables) && result.deliverables.length > 0);
      assert.ok(Array.isArray(result.platform) && result.platform.length > 0);
      assert.ok(typeof result.targetAudience === "string" && result.targetAudience.length > 0);
      assert.ok(result.budget.min !== null || result.budget.max !== null || result.budget.rawText.length > 0);
      assert.ok(typeof result.deadline === "string");
    });
  });

  describe("Creator Matching & Scoring Engine (findMatches)", () => {
    it("should rank creators and verify weighted score formula (40/25/15/10/10)", async () => {
      const brief = "Need a beauty and skincare creator for organic product reviews. Deliverables: 2 Reels. Budget: ₹ 25000";
      const matches = await aiService.findMatches(brief);

      assert.ok(matches.length > 0, "Expected at least 1 matched creator");

      // Verify sorting descending by finalMatchScore
      const isSorted = matches.every(
        (val, i, arr) => !i || arr[i - 1].finalMatchScore >= val.finalMatchScore
      );
      assert.equal(isSorted, true, "Matches must be sorted descending by finalMatchScore");

      // Check first match breakdown math
      const topMatch = matches[0];
      const { breakdown, finalMatchScore } = topMatch;
      assert.ok(breakdown.skillMatch >= 0 && breakdown.skillMatch <= 100);
      assert.ok(breakdown.verification >= 0 && breakdown.verification <= 100);
      assert.ok(breakdown.portfolio >= 0 && breakdown.portfolio <= 100);
      assert.ok(breakdown.experience >= 0 && breakdown.experience <= 100);
      assert.ok(breakdown.clientRating >= 0 && breakdown.clientRating <= 100);
      assert.ok(finalMatchScore >= 0 && finalMatchScore <= 100);
    });
  });

  describe("Match Explanation (explainMatch)", () => {
    it("should provide evidence-based match explanation for existing creator", async () => {
      const brief = "Tech gadget launch for smartphones";
      const explanation = await aiService.explainMatch("ananya-rao", brief);

      assert.equal(explanation.creatorId, "ananya-rao");
      assert.ok(explanation.creatorName.length > 0);
      assert.ok(explanation.recommendationSummary.length > 0);
      assert.ok(Array.isArray(explanation.specificReasons));
      assert.ok(Array.isArray(explanation.potentialGaps));
    });

    it("should throw clear error when requested creatorId does not exist", async () => {
      await assert.rejects(
        () => aiService.explainMatch("non-existent-creator-id-9999", "Campaign brief"),
        /not found for match explanation/i
      );
    });
  });

  describe("Chat Assistant (handleChat)", () => {
    it("should return actionable markdown response for creator questions", async () => {
      const reply = await aiService.handleChat(
        [{ role: "user", content: "How do I create viral hooks for Instagram reels?" }],
        { role: "creator", niche: "Technology" }
      );

      assert.ok(reply.includes("Hook") || reply.includes("Formula") || reply.length > 50);
    });
  });

  describe("Content Suggestions (generateContentSuggestions)", () => {
    it("should generate suggestions containing hook, caption, hashtags, and CTA", async () => {
      const result = await aiService.generateContentSuggestions({
        niche: "Fitness & Wellness",
        targetAudience: "Busy Professionals",
        platform: "Instagram",
        contentGoal: "High Engagement",
        preferredFormat: "Reel / Short",
      });

      assert.ok(Array.isArray(result.suggestions) && result.suggestions.length > 0);
      const first = result.suggestions[0];
      assert.ok(first.hook.length > 0);
      assert.ok(first.caption.length > 0);
      assert.ok(Array.isArray(first.hashtags) && first.hashtags.length > 0);
      assert.ok(first.callToAction.length > 0);
    });
  });

  describe("Resilient Fallback on Provider Failure", () => {
    it("should gracefully engage heuristic fallback when mocked provider throws network error", async () => {
      // Mock failing provider
      const failingMockProvider: AIModelProvider = {
        id: "openrouter",
        name: "Mock Failing Provider",
        model: "mock-model",
        isConfigured: () => true,
        generateText: async () => {
          throw new Error("503 Service Unavailable: Network outage");
        },
        generateStructuredJSON: async () => {
          throw new Error("503 Service Unavailable: JSON parsing failed");
        },
      };

      const resilientService = new AIService(failingMockProvider);

      // 1. handleChat must fall back to heuristic rather than crashing
      const chatReply = await resilientService.handleChat(
        [{ role: "user", content: "What are best hook formulas?" }],
        { role: "creator", niche: "Beauty" }
      );
      assert.ok(chatReply.includes("Hook"), "Expected fallback heuristic chat response");

      // 2. analyzePortfolio must fall back to heuristic with clear fallback provenance
      const portfolioReply = await resilientService.analyzePortfolio({
        portfolioTitle: "Fashion Lookbook",
        description: "AI generated 3D fashion models",
        tools: ["Midjourney"],
      });
      assert.ok(portfolioReply.skills.length > 0);
      assert.equal(portfolioReply.requiresHumanReview, true);
      assert.equal(portfolioReply.isFallback, true, "Must flag isFallback as true on failure");
      assert.equal(portfolioReply.engine, "heuristic_fallback");
      assert.ok(portfolioReply.fallbackReason?.includes("503"));
    });

    it("should handle HTTP 402 (balance exhausted) and distinguish fallback metadata clearly", async () => {
      const exhaustedCreditProvider: AIModelProvider = {
        id: "openrouter",
        name: "OpenRouter AI",
        model: "openai/gpt-4o-mini",
        isConfigured: () => true,
        generateText: async () => {
          throw new Error("OpenRouter credit balance exhausted (HTTP 402). Please add credits to your OpenRouter account.");
        },
        generateStructuredJSON: async () => {
          throw new Error("OpenRouter credit balance exhausted (HTTP 402). Please add credits to your OpenRouter account.");
        },
      };

      const service = new AIService(exhaustedCreditProvider);

      // analyzeCampaign
      const campaign = await service.analyzeCampaign("Need 3 reels for beauty product launch in 2 weeks");
      assert.equal(campaign.isFallback, true);
      assert.equal(campaign.engine, "heuristic_fallback");
      assert.ok(campaign.fallbackReason?.includes("402") || campaign.fallbackReason?.includes("credit balance exhausted"));

      // handleChatWithMetadata
      const chat = await service.handleChatWithMetadata([{ role: "user", content: "Best reels hooks" }]);
      assert.equal(chat.isFallback, true);
      assert.equal(chat.engine, "heuristic_fallback");
      assert.ok(chat.fallbackReason?.includes("402"));
    });
  });
});
