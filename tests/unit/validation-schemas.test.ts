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
import {
  createPortfolioProjectSchema,
  createCampaignSchema,
  updateCreatorProfileSchema,
  submitSkillTestSchema,
  claimSkillSchema,
} from "../../lib/validations";

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

  describe("createPortfolioProjectSchema", () => {
    it("should accept valid portfolio data with 3–200 title, 10–2500 description, and at least 1 tool", () => {
      const valid = {
        title: "Photorealistic AI Perfume Commercial",
        description: "Developed an ultra-detailed 4k product render showcasing bottle refractive optics.",
        content_type: "Video",
        tools_used: ["Midjourney v6", "ComfyUI"],
        media_url: "https://example.com/video.mp4",
      };
      const parsed = createPortfolioProjectSchema.parse(valid);
      assert.equal(parsed.title, valid.title);
      assert.equal(parsed.tools_used.length, 2);
    });

    it("should reject title shorter than 3 characters", () => {
      assert.throws(
        () =>
          createPortfolioProjectSchema.parse({
            title: "ab",
            description: "Valid description exceeding 10 characters",
            content_type: "Video",
            tools_used: ["Midjourney"],
            media_url: "https://example.com/video.mp4",
          }),
        /at least 3 characters/i
      );
    });

    it("should reject description shorter than 10 characters", () => {
      assert.throws(
        () =>
          createPortfolioProjectSchema.parse({
            title: "Valid Title",
            description: "Short",
            content_type: "Video",
            tools_used: ["Midjourney"],
            media_url: "https://example.com/video.mp4",
          }),
        /at least 10 characters/i
      );
    });

    it("should reject empty tools_used array without silent fallback", () => {
      assert.throws(
        () =>
          createPortfolioProjectSchema.parse({
            title: "Valid Title",
            description: "Valid description exceeding 10 characters",
            content_type: "Video",
            tools_used: [],
            media_url: "https://example.com/video.mp4",
          }),
        /Select at least 1 AI tool/i
      );
    });
  });

  describe("createCampaignSchema", () => {
    it("should accept valid campaign with title 5–200, description 20–4000, and max_budget >= min_budget", () => {
      const valid = {
        title: "Summer Skincare UGC Reel Campaign",
        description: "Seeking creator to produce 3 high-impact UGC short-form reels for summer moisturizer launch.",
        category: "Beauty & Skincare",
        budget_min: 15000,
        budget_max: 30000,
      };
      const parsed = createCampaignSchema.parse(valid);
      assert.equal(parsed.title, valid.title);
      assert.equal(parsed.budget_max >= parsed.budget_min, true);
    });

    it("should reject title under 5 characters", () => {
      assert.throws(
        () =>
          createCampaignSchema.parse({
            title: "Tiny",
            description: "Long enough description for the campaign to meet length requirement.",
            category: "Beauty & Skincare",
          }),
        /at least 5 characters/i
      );
    });

    it("should reject description under 20 characters", () => {
      assert.throws(
        () =>
          createCampaignSchema.parse({
            title: "Valid Title",
            description: "Too short desc",
            category: "Beauty & Skincare",
          }),
        /at least 20 characters/i
      );
    });

    it("should reject when budget_max is less than budget_min", () => {
      assert.throws(
        () =>
          createCampaignSchema.parse({
            title: "Valid Campaign Title",
            description: "Long enough description for the campaign to meet length requirement.",
            category: "Beauty & Skincare",
            budget_min: 50000,
            budget_max: 20000,
          }),
        /Maximum budget cannot be less than minimum budget/i
      );
    });
  });

  describe("updateCreatorProfileSchema", () => {
    it("should accept valid creator profile with name >= 2 and bio <= 1000", () => {
      const valid = {
        name: "Ananya Rao",
        bio: "AI UGC visual storyteller specializing in beauty and lifestyle commercials.",
        experience_years: 4,
        category: "Beauty & Skincare",
        min_budget: 10000,
        max_budget: 25000,
      };
      const parsed = updateCreatorProfileSchema.parse(valid);
      assert.equal(parsed.name, "Ananya Rao");
    });

    it("should reject name under 2 characters", () => {
      assert.throws(
        () =>
          updateCreatorProfileSchema.parse({
            name: "A",
            bio: "Valid bio",
          }),
        /at least 2 characters/i
      );
    });

    it("should reject bio exceeding 1000 characters", () => {
      assert.throws(
        () =>
          updateCreatorProfileSchema.parse({
            name: "Valid Name",
            bio: "x".repeat(1001),
          }),
        /cannot exceed 1000 characters/i
      );
    });
  });

  describe("submitSkillTestSchema & Catalog Slug Parity", () => {
    it("should accept valid UUID test_id", () => {
      const parsed = submitSkillTestSchema.parse({
        test_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        answers: { q1: 1 },
      });
      assert.equal(parsed.test_id, "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
    });

    it("should accept a recognized test catalog slug (prompt-engineering)", () => {
      const parsed = submitSkillTestSchema.parse({
        test_id: "prompt-engineering",
        answers: { q1: 1, q2: 2 },
      });
      assert.equal(parsed.test_id, "prompt-engineering");
    });

    it("should reject arbitrary or unknown test slugs without silent substitution", () => {
      assert.throws(
        () =>
          submitSkillTestSchema.parse({
            test_id: "completely-arbitrary-slug-that-does-not-exist",
            answers: {},
          }),
        /Invalid test ID or unknown catalog slug/i
      );
    });
  });

  describe("claimSkillSchema & Registration Workflow Parity", () => {
    it("should accept valid UUID skill_id", () => {
      const parsed = claimSkillSchema.parse({
        skill_id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
      });
      assert.equal(parsed.skill_id, "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");
    });

    it("should accept skill registration by skill_name", () => {
      const parsed = claimSkillSchema.parse({
        skill_name: "Midjourney Photorealism",
        category: "AI Creative Discipline",
      });
      assert.equal(parsed.skill_name, "Midjourney Photorealism");
      assert.equal(parsed.category, "AI Creative Discipline");
    });

    it("should reject skill_name shorter than 2 characters", () => {
      assert.throws(
        () =>
          claimSkillSchema.parse({
            skill_name: "A",
          }),
        /at least 2 characters/i
      );
    });

    it("should reject when neither skill_id nor skill_name is provided", () => {
      assert.throws(
        () =>
          claimSkillSchema.parse({
            category: "AI Creative Discipline",
          }),
        /Either skill_id or skill_name/i
      );
    });
  });
});
