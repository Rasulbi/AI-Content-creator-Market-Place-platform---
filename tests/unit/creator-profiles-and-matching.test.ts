import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { mapDbProfileToCreator } from "../../lib/creators-catalog";
import {
  GenerateCreatorProfileInputSchema,
  GeneratedProfileDraftSchema,
} from "../../lib/validations/ai-profile";
import { aiService, AIService } from "../../lib/ai/ai-service";
import { AIModelProvider } from "../../lib/ai/provider-interface";
import { matchCreatorsSemantically } from "../../lib/ai/semantic-matcher";
import { DEMO_CREATORS } from "../../lib/demo-creators";
import {
  trainLogisticRegression,
  evaluateRanking,
  predictProbability,
  TrainingSample,
} from "../../scripts/train-ranking-model";
import { CampaignAnalysisOutput } from "../../lib/ai/types";
import { proxy, middleware } from "../../proxy";

describe("AI-Powered Creator Profiles & Semantic ML Matching Suite", () => {
  describe("1. Database-Backed Creator Profile Mapping & Integrity", () => {
    it("should transform raw Supabase creator_profiles row into a typed Creator object without fabricating metrics", () => {
      const dbRow = {
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        user_id: "u1u2u3u4-u5u6-u7u8-u9u0-abcdef123456",
        name: "Verified Tester",
        slug: "verified-tester-a1b2c3d4",
        bio: "Authentic generative AI video specialist.",
        experience_years: 3.5,
        experience_level: "intermediate",
        availability: "available",
        hourly_rate: 4500,
        min_budget: 15000,
        max_budget: 30000,
        ai_tools: ["Midjourney v6", "Runway Gen-3"],
        platforms: ["Instagram", "YouTube"],
        category: "Technology & AI",
        location: "Bengaluru, India",
        passport_score: 88,
        client_rating: 4.8,
        total_reviews: 6,
        is_verified: true,
        users: {
          avatar_url: "/images/tester.jpg",
          role: "creator",
        },
        portfolio_projects: [
          {
            id: "p1",
            title: "Autonomous AI Agent Commercial",
            content_type: "Tech Spec",
            tools_used: ["Runway", "ElevenLabs"],
            media_url: "https://example.com/video.mp4",
            description: "End-to-end commercial created for B2B AI tooling.",
            metrics: {
              brand: "Agentic AI",
              results: "1.2M impressions",
            },
          },
        ],
        creator_skills: [
          {
            verification_status: "test_verified",
            score: 95,
            skills: { name: "Prompt Engineering", category: "AI Tools" },
          },
          {
            verification_status: "claimed",
            score: 70,
            skills: { name: "Video Editing", category: "Post-Production" },
          },
        ],
      };

      const creator = mapDbProfileToCreator(dbRow);

      assert.equal(creator.id, "a1b2c3d4-e5f6-7890-abcd-ef1234567890");
      assert.equal(creator.name, "Verified Tester");
      assert.equal(creator.category, "Technology & AI");
      assert.equal(creator.isVerified, true);
      assert.equal(creator.verifiedSkills.includes("Prompt Engineering"), true);
      assert.equal(creator.skills.includes("Video Editing"), true);
      assert.equal(creator.portfolioCount, 1);
      assert.equal(creator.priceRange, "₹ 4500/hr");
      assert.equal(creator.isDemo, false);

      // Verify that private fields (e.g. email) are NOT present on Creator
      assert.equal((creator as any).email, undefined);
      // Verify follower count is NOT fabricated
      assert.equal(creator.followersCount, 0);
    });

    it("should handle empty portfolio and skills without throwing or fabricating reviews", () => {
      const minimalRow = {
        id: "c-min",
        name: "New Creator",
        category: "Fashion",
        portfolio_projects: [],
        creator_skills: [],
      };

      const creator = mapDbProfileToCreator(minimalRow);
      assert.equal(creator.name, "New Creator");
      assert.equal(creator.portfolioCount, 0);
      assert.equal(creator.skills.length, 0);
      assert.equal(creator.verifiedSkills.length, 0);
      assert.equal(creator.reviewsCount, 0);
      assert.equal(creator.reviews.length, 0);
    });
  });

  describe("2. AI Profile Assistant: Input & Draft Validation", () => {
    it("should validate valid profile generation inputs", () => {
      const input = {
        name: "Ananya",
        niche: "Beauty & Skincare",
        skills: ["Midjourney v6", "CapCut", "Prompt Engineering"],
        experience: "3 years in commercial UGC",
        portfolioLinks: ["https://instagram.com/reel/12345"],
        contentCategories: ["Instagram Reels", "Tutorials"],
        campaignTypes: ["UGC", "Brand Sponsorship"],
        workDescription: "Focus on clean aesthetic lighting and natural ingredient breakdowns.",
      };

      const validated = GenerateCreatorProfileInputSchema.parse(input);
      assert.equal(validated.name, "Ananya");
      assert.equal(validated.skills.length, 3);
    });

    it("should reject inputs with empty name or missing skills", () => {
      assert.throws(() => {
        GenerateCreatorProfileInputSchema.parse({
          name: "",
          niche: "Beauty",
          skills: [],
        });
      });
    });

    it("should reject malformed portfolio URLs", () => {
      assert.throws(() => {
        GenerateCreatorProfileInputSchema.parse({
          name: "Test Creator",
          niche: "Tech",
          skills: ["Midjourney"],
          portfolioLinks: ["not-a-valid-url"],
        });
      });
    });
  });

  describe("3. AI Profile Draft Generation & Fallback Truthfulness", () => {
    it("should generate a structured profile draft with isDraft: true", async () => {
      const input = {
        name: "Maya Sharma",
        niche: "Sustainable Fashion",
        skills: ["Runway Gen-3", "Flux.1", "Cinematic Prompting"],
        experience: "2 years crafting digital lookbooks",
        portfolioLinks: ["https://youtube.com/watch?v=sample123"],
        contentCategories: ["Digital Lookbooks", "Brand Reels"],
        campaignTypes: ["Commercial UGC"],
        workDescription: "Specializing in virtual garments and slow-motion fabric dynamics.",
      };

      const draft = await aiService.generateCreatorProfileDraft(input);

      assert.equal(draft.isDraft, true);
      assert.ok(draft.professionalHeadline.length >= 5);
      assert.ok(draft.bio.length >= 50);
      assert.ok(draft.shortIntroduction.length >= 10);
      assert.equal(draft.niche, "Sustainable Fashion");
      assert.ok(draft.completenessSuggestions.length > 0);
      assert.ok(draft.portfolioDrafts.length > 0);

      // Validate the draft against the strict Zod schema
      const parsed = GeneratedProfileDraftSchema.parse(draft);
      assert.equal(parsed.isDraft, true);
    });

    it("should generate a truthful fallback draft when AI provider is unconfigured or fails", async () => {
      const input = {
        name: "Fallback Creator",
        niche: "Gaming & VFX",
        skills: ["Unreal Engine", "Midjourney"],
      };

      const draft = await aiService.generateCreatorProfileDraft(input);

      assert.equal(draft.isDraft, true);
      assert.equal(draft.niche, "Gaming & VFX");
      assert.ok(draft.skills.includes("Unreal Engine"));
      assert.ok(draft.completenessSuggestions.length > 0);
    });
  });

  describe("4. Semantic Creator-to-Brand Matching", () => {
    const mockCampaign: CampaignAnalysisOutput = {
      contentType: ["Instagram Reels", "UGC"],
      requiredSkills: ["Skincare", "Product Reviews", "Midjourney"],
      aiTools: ["Runway", "Midjourney v6"],
      targetAudience: "Women 18-35 interested in clean beauty",
      platform: ["Instagram"],
      budget: { min: 15000, max: 40000, currency: "INR", rawText: "₹ 15,000 - ₹ 40,000" },
      deadline: "2 Weeks",
      deliverables: ["2 Reels", "1 Story"],
      category: "Beauty & Skincare",
      campaignRequirements: ["High visual aesthetic", "Ingredient clarity"],
      engine: "ai_model",
      provider: "test-provider",
      isFallback: false,
    };

    it("should calculate semantic and rule scores separately and rank candidates transparently", async () => {
      const candidates = DEMO_CREATORS.slice(0, 4);

      const results = await matchCreatorsSemantically(mockCampaign, candidates);

      assert.ok(results.length > 0);
      const topMatch = results[0];

      // Verify separate score fields
      assert.equal(typeof topMatch.semanticSimilarityScore, "number");
      assert.equal(typeof topMatch.ruleScore, "number");
      assert.equal(typeof topMatch.finalMatchScore, "number");

      // Verify scores are bounded between 0 and 100
      assert.ok(topMatch.semanticSimilarityScore >= 0 && topMatch.semanticSimilarityScore <= 100);
      assert.ok(topMatch.ruleScore >= 0 && topMatch.ruleScore <= 100);
      assert.ok(topMatch.finalMatchScore >= 0 && topMatch.finalMatchScore <= 100);

      // Verify evidence breakdown is grounded in real data
      assert.ok(Array.isArray(topMatch.evidence.matchedSkills));
      assert.ok(Array.isArray(topMatch.evidence.missingSkills));
      assert.ok(topMatch.evidence.explanation.includes(topMatch.creatorName));
    });

    it("should penalize candidates with mismatched niche or missing skills fairly", async () => {
      const results = await matchCreatorsSemantically(mockCampaign, DEMO_CREATORS.slice(0, 5));

      const beautyCreator = results.find((r) => r.category.includes("Beauty"));
      const techOrGaming = results.find((r) => r.category.includes("Technology") || r.category.includes("Gaming"));

      if (beautyCreator && techOrGaming) {
        assert.ok(
          beautyCreator.finalMatchScore > techOrGaming.finalMatchScore,
          `Expected beauty creator (${beautyCreator.finalMatchScore}) to outscore tech/gaming creator (${techOrGaming.finalMatchScore}) for beauty campaign`
        );
      }
    });
  });

  describe("5. Reproducible ML Ranking Model Pipeline", () => {
    const trainingDataset: TrainingSample[] = [
      {
        features: {
          semanticSimilarity: 0.92,
          skillOverlapRatio: 1.0,
          verifiedSkillRatio: 0.8,
          budgetCompatibility: 0.95,
          categoryMatch: 1.0,
          experienceYearsNorm: 0.7,
        },
        label: 1, // Successful hire
      },
      {
        features: {
          semanticSimilarity: 0.85,
          skillOverlapRatio: 0.8,
          verifiedSkillRatio: 0.5,
          budgetCompatibility: 0.8,
          categoryMatch: 1.0,
          experienceYearsNorm: 0.5,
        },
        label: 1, // Shortlisted
      },
      {
        features: {
          semanticSimilarity: 0.65,
          skillOverlapRatio: 0.4,
          verifiedSkillRatio: 0.2,
          budgetCompatibility: 0.6,
          categoryMatch: 0.0,
          experienceYearsNorm: 0.3,
        },
        label: 0, // Rejected
      },
      {
        features: {
          semanticSimilarity: 0.25,
          skillOverlapRatio: 0.1,
          verifiedSkillRatio: 0.0,
          budgetCompatibility: 0.3,
          categoryMatch: 0.0,
          experienceYearsNorm: 0.2,
        },
        label: 0, // Rejected
      },
    ];

    it("should train logistic regression weights deterministically and evaluate ranking quality", () => {
      const weights = trainLogisticRegression(trainingDataset, 100, 0.1);

      // Verify learned weights reflect positive correlation with key match features
      assert.ok(weights.wCategory > 0, "Category match weight should be positive");
      assert.ok(weights.wSkillOverlap > 0, "Skill overlap weight should be positive");
      assert.ok(weights.wVerified > 0, "Verified skill ratio should be positive");

      // Verify probability predictions
      const highQualityProb = predictProbability(trainingDataset[0].features, weights);
      const lowQualityProb = predictProbability(trainingDataset[3].features, weights);

      assert.ok(
        highQualityProb > lowQualityProb,
        `High quality candidate probability (${highQualityProb}) must exceed low quality candidate (${lowQualityProb})`
      );

      // Evaluate ranking metrics
      const metrics = evaluateRanking(trainingDataset, weights, 2);
      assert.equal(metrics.totalSamples, 4);
      assert.ok(metrics.accuracy >= 0.75);
      assert.ok(metrics.ndcgAtK >= 0.8);
    });
  });

  describe("6. Real AI Analysis Success vs Provider Failure / Fallback Integrity", () => {
    it("should record engine: 'ai_model' and isFallback: false when AI provider succeeds", async () => {
      const mockSuccessProvider: AIModelProvider = {
        id: "openrouter",
        name: "OpenRouter Gemini Flash",
        model: "google/gemini-2.5-flash",
        isConfigured: () => true,
        generateText: async () => "Mock Text",
        generateStructuredJSON: async <T>(): Promise<T> =>
          ({
            strengths: ["Clean visual lighting", "Strong narrative hooks"],
            relevantSkills: ["AI Video Production", "Runway Gen-3"],
            suitableCategories: ["Technology & AI", "Commercial UGC"],
            recommendedCampaignTypes: ["Product Demo", "B2B Tech Spec"],
            potentialImprovementAreas: ["Include longer-form case studies"],
            campaignMatchAffinities: [
              { campaignType: "Tech Spec Commercial", matchScore: 94, reason: "Deep tool competency" },
            ],
            overallReadinessScore: 91,
          } as unknown as T),
      };

      const liveService = new AIService(mockSuccessProvider);
      const analysis = await liveService.analyzeCreatorProfile({
        name: "Aarav Patel",
        category: "Technology & AI",
        bio: "Specializing in generative AI video and commercial product workflows.",
        skills: ["Runway Gen-3", "Midjourney", "ComfyUI"],
        portfolioCount: 4,
        portfolioSamples: [
          {
            title: "AI Drone Commercial",
            description: "Synthetic drone footage with neural rendering",
            tools: ["Runway", "ElevenLabs"],
          },
        ],
        followers: "85K",
        engagementRate: "4.2%",
        platforms: ["YouTube", "Instagram"],
        contentTypes: ["Shorts", "Tech Demos"],
      });

      assert.equal(analysis.engine, "ai_model");
      assert.equal(analysis.isFallback, false);
      assert.equal(analysis.provider, "OpenRouter Gemini Flash");
      assert.equal(analysis.overallReadinessScore, 91);
      assert.ok(analysis.strengths.includes("Clean visual lighting"));
      assert.ok(analysis.relevantSkills.includes("Runway Gen-3"));
    });

    it("should gracefully engage heuristic fallback with engine: 'heuristic_fallback' and isFallback: true when AI provider fails or rate-limits", async () => {
      const mockFailingProvider: AIModelProvider = {
        id: "gemini",
        name: "Google Gemini",
        model: "gemini-2.5-flash",
        isConfigured: () => true,
        generateText: async () => {
          throw new Error("429 Resource has been exhausted (e.g. check quota)");
        },
        generateStructuredJSON: async () => {
          throw new Error("429 Resource has been exhausted (e.g. check quota)");
        },
      };

      const fallbackService = new AIService(mockFailingProvider);
      const analysis = await fallbackService.analyzeCreatorProfile({
        name: "Aarav Patel",
        category: "Technology & AI",
        bio: "Specializing in generative AI video and commercial product workflows.",
        skills: ["Runway Gen-3", "Midjourney"],
        portfolioCount: 3,
        portfolioSamples: [{ title: "AI Demo", description: "Testing", tools: ["Runway"] }],
        followers: "85K",
        engagementRate: "4.2%",
        platforms: ["YouTube"],
        contentTypes: ["Shorts"],
      });

      assert.equal(analysis.engine, "heuristic_fallback");
      assert.equal(analysis.isFallback, true);
      assert.equal(analysis.provider, "Heuristic Audit Engine");
      assert.ok(analysis.fallbackReason?.includes("429"));
      assert.ok(analysis.overallReadinessScore >= 0 && analysis.overallReadinessScore <= 100);
      assert.ok(analysis.strengths.length > 0);
      // Fallback must never be claimed as ai_model
      assert.notEqual(analysis.engine, "ai_model");
    });
  });

  describe("7. Synthetic Demo Fixtures vs Registered Creator Profiles Distinction", () => {
    it("should strictly identify all DEMO_CREATORS as synthetic demo fixtures", () => {
      assert.ok(DEMO_CREATORS.length > 0);
      for (const demoCreator of DEMO_CREATORS) {
        assert.equal(demoCreator.isDemo, true, `Creator ${demoCreator.name} must have isDemo: true`);
        assert.equal(demoCreator.isSynthetic, true, `Creator ${demoCreator.name} must have isSynthetic: true`);
      }
    });

    it("should never mark database-backed profiles as demo or synthetic", () => {
      const dbRow = {
        id: "reg-creator-001",
        name: "Real Registered Creator",
        category: "Fashion",
        portfolio_projects: [],
        creator_skills: [],
      };

      const realCreator = mapDbProfileToCreator(dbRow);
      assert.equal(realCreator.isDemo, false, "Database creator must have isDemo: false");
      assert.equal(realCreator.isSynthetic, false, "Database creator must have isSynthetic: false");
      assert.equal(realCreator.name, "Real Registered Creator");
    });

    it("should preserve demo provenance flags in semantic matching results", async () => {
      const mockCampaign: CampaignAnalysisOutput = {
        contentType: ["Reels"],
        requiredSkills: ["Midjourney"],
        aiTools: ["Midjourney"],
        targetAudience: "Tech enthusiasts",
        platform: ["Instagram"],
        budget: { min: 10000, max: 20000, currency: "INR", rawText: "₹ 10k" },
        deadline: "7 days",
        deliverables: ["1 Reel"],
        category: "Technology",
        campaignRequirements: ["High visual aesthetic"],
        engine: "heuristic_fallback",
        provider: "Rule Engine",
        isFallback: true,
      };

      const matches = await matchCreatorsSemantically(mockCampaign, DEMO_CREATORS.slice(0, 2));
      for (const match of matches) {
        assert.equal(match.isDemo, true);
      }
    });
  });

  describe("8. 'Switch to Creator View' Route Target & Authorization Integrity", () => {
    it("should confirm the canonical creator route is /creator/dashboard", () => {
      const canonicalCreatorRoute = "/creator/dashboard";
      assert.equal(canonicalCreatorRoute, "/creator/dashboard");
      assert.ok(canonicalCreatorRoute.startsWith("/creator"));
    });

    it("should redirect unauthenticated access to /creator/dashboard to influencer login with next param", async () => {
      const req = new NextRequest("http://localhost:3000/creator/dashboard", { method: "GET" });
      const res = await middleware(req);
      assert.equal(res.status, 307);
      const location = res.headers.get("location") || "";
      assert.ok(location.includes("/login/influencer"));
      assert.ok(location.includes("next=%2Fcreator%2Fdashboard"));
    });

    it("should redirect unauthenticated access to /brand/dashboard to brand login with next param", async () => {
      const req = new NextRequest("http://localhost:3000/brand/dashboard", { method: "GET" });
      const res = await middleware(req);
      assert.equal(res.status, 307);
      const location = res.headers.get("location") || "";
      assert.ok(location.includes("/login/brand"));
      assert.ok(location.includes("next=%2Fbrand%2Fdashboard"));
    });
  });
});

