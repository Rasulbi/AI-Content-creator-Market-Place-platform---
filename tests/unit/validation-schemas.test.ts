import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CampaignAnalysisInputSchema,
  PortfolioAnalysisInputSchema,
  ChatMessageSchema,
  ChatRequestSchema,
  AssistantContextSchema,
  ContentSuggestionsInputSchema,
} from "../../lib/ai/types";

describe("Unit Tests: Zod Validation Schemas", () => {
  describe("CampaignAnalysisInputSchema", () => {
    it("should accept a valid natural language brief string (>= 10 chars)", () => {
      const input = "Looking for a skincare creator for 3 Instagram Reels";
      const parsed = CampaignAnalysisInputSchema.parse(input);
      assert.equal(parsed.brief, input);
    });

    it("should accept a valid object containing brief", () => {
      const input = { brief: "Need tech reviewer for high-performance laptop launch campaign" };
      const parsed = CampaignAnalysisInputSchema.parse(input);
      assert.equal(parsed.brief, input.brief);
    });

    it("should reject a brief shorter than 10 characters", () => {
      assert.throws(
        () => CampaignAnalysisInputSchema.parse("Too short"),
        /at least 10 characters/i
      );
    });

    it("should reject an empty brief", () => {
      assert.throws(() => CampaignAnalysisInputSchema.parse(""));
    });
  });

  describe("PortfolioAnalysisInputSchema", () => {
    it("should parse valid portfolio inputs and apply defaults", () => {
      const input = {
        portfolioTitle: "Luxury Perfume 3D Commercial",
        description: "Created photorealistic 3D liquid simulations and scent breakdown",
        tools: ["Blender", "After Effects"],
        prompt: "Macro crystal bottle dewy mist",
        process: "Simulated fluids in Blender, color graded in Premiere",
      };
      const parsed = PortfolioAnalysisInputSchema.parse(input);
      assert.equal(parsed.portfolioTitle, input.portfolioTitle);
      assert.equal(parsed.description, input.description);
      assert.deepEqual(parsed.tools, input.tools);
    });

    it("should map alias fields (title -> portfolioTitle, toolsUsed -> tools)", () => {
      const input = {
        title: "Shorts Vlog",
        description: "Daily life aesthetic vlogs with ASMR voiceover",
        toolsUsed: ["CapCut"],
      };
      const parsed = PortfolioAnalysisInputSchema.parse(input);
      assert.equal(parsed.portfolioTitle, "Shorts Vlog");
      assert.deepEqual(parsed.tools, ["CapCut"]);
    });

    it("should reject a title shorter than 2 characters", () => {
      assert.throws(
        () =>
          PortfolioAnalysisInputSchema.parse({
            portfolioTitle: "A",
            description: "Valid description here",
          }),
        /Portfolio title is required/i
      );
    });

    it("should reject a description shorter than 5 characters", () => {
      assert.throws(
        () =>
          PortfolioAnalysisInputSchema.parse({
            portfolioTitle: "Valid Title",
            description: "Tiny",
          }),
        /Description is required/i
      );
    });
  });

  describe("ChatMessageSchema & ChatRequestSchema", () => {
    it("should accept valid chat messages with allowed roles", () => {
      const userMsg = ChatMessageSchema.parse({ role: "user", content: "Hello AI" });
      const assistantMsg = ChatMessageSchema.parse({ role: "assistant", content: "Hello Creator" });
      const systemMsg = ChatMessageSchema.parse({ role: "system", content: "You are an assistant" });

      assert.equal(userMsg.role, "user");
      assert.equal(assistantMsg.role, "assistant");
      assert.equal(systemMsg.role, "system");
    });

    it("should reject empty content in ChatMessageSchema", () => {
      assert.throws(
        () => ChatMessageSchema.parse({ role: "user", content: "" }),
        /Message content cannot be empty/i
      );
    });

    it("should reject messages exceeding maximum length (4000 chars)", () => {
      const oversized = "a".repeat(4001);
      assert.throws(
        () => ChatMessageSchema.parse({ role: "user", content: oversized }),
        /cannot exceed 4000 characters/i
      );
    });

    it("should reject invalid role in ChatMessageSchema", () => {
      assert.throws(() => ChatMessageSchema.parse({ role: "superadmin" as any, content: "Test" }));
    });

    it("should validate a full ChatRequest with multiple messages and optional context", () => {
      const request = {
        messages: [
          { role: "user" as const, content: "Suggest reel ideas" },
          { role: "assistant" as const, content: "Here are 3 ideas" },
        ],
        userContext: {
          role: "creator" as const,
          niche: "Fitness",
          platform: "Instagram",
          tone: "High-Energy & Bold",
        },
        sessionId: "sess_test_123",
      };

      const parsed = ChatRequestSchema.parse(request);
      assert.equal(parsed.messages.length, 2);
      assert.equal(parsed.userContext?.niche, "Fitness");
      assert.equal(parsed.sessionId, "sess_test_123");
    });

    it("should reject ChatRequest with empty messages array", () => {
      assert.throws(
        () => ChatRequestSchema.parse({ messages: [] }),
        /At least one message is required/i
      );
    });
  });

  describe("AssistantContextSchema", () => {
    it("should provide default role 'creator' when role is omitted", () => {
      const parsed = AssistantContextSchema.parse({});
      assert.equal(parsed.role, "creator");
    });

    it("should accept valid roles (brand, influencer, creator, admin)", () => {
      const brand = AssistantContextSchema.parse({ role: "brand" });
      const influencer = AssistantContextSchema.parse({ role: "influencer" });
      const creator = AssistantContextSchema.parse({ role: "creator" });
      const admin = AssistantContextSchema.parse({ role: "admin" });

      assert.equal(brand.role, "brand");
      assert.equal(influencer.role, "influencer");
      assert.equal(creator.role, "creator");
      assert.equal(admin.role, "admin");
    });
  });

  describe("ContentSuggestionsInputSchema", () => {
    it("should accept valid input parameters", () => {
      const input = {
        niche: "Tech Gadgets",
        targetAudience: "Early Adopters",
        platform: "YouTube",
        contentGoal: "Product Awareness",
        preferredFormat: "Long-form Review",
        keywords: "AI, M4 chip",
      };
      const parsed = ContentSuggestionsInputSchema.parse(input);
      assert.equal(parsed.niche, input.niche);
      assert.equal(parsed.platform, input.platform);
    });

    it("should reject missing required fields", () => {
      assert.throws(
        () =>
          ContentSuggestionsInputSchema.parse({
            niche: "Tech",
          }),
        /expected string, received undefined/i
      );
    });

    it("should reject too short fields in ContentSuggestionsInputSchema", () => {
      assert.throws(
        () =>
          ContentSuggestionsInputSchema.parse({
            niche: "T",
            targetAudience: "A",
            platform: "Y",
            contentGoal: "G",
            preferredFormat: "F",
          }),
        /Niche is required/i
      );
    });
  });
});
