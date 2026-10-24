import {
  PortfolioAnalysisInput,
  PortfolioAnalysisInputSchema,
  PortfolioAnalysisOutput,
  PortfolioAnalysisOutputSchema,
  CampaignAnalysisInput,
  CampaignAnalysisInputSchema,
  CampaignAnalysisOutput,
  CampaignAnalysisOutputSchema,
  CreatorMatchProfile,
  MatchExplanation,
  CreatorProfileAnalysisInput,
  CreatorProfileAnalysisInputSchema,
  CreatorProfileAnalysisOutput,
  CreatorProfileAnalysisOutputSchema,
  ContentSuggestionsInput,
  ContentSuggestionsInputSchema,
  ContentSuggestionsOutput,
  ContentSuggestionsOutputSchema,
  ChatMessage,
  AssistantContext,
} from "./types";
import {
  GenerateCreatorProfileInput,
  GenerateCreatorProfileInputSchema,
  GeneratedProfileDraft,
  GeneratedProfileDraftSchema,
} from "../validations/ai-profile";
import { AIModelProvider } from "./provider-interface";
import { getAIProvider } from "./provider-factory";
import { calculateWeightedScores, generateMatchExplanation } from "./scoring-engine";
import { aiLogger } from "./logger";
import { CREATORS_DATA } from "../creators-data";
import { buildEnhancedSystemPrompt, generateSmartHeuristicResponse } from "./chatbot-engine";
import { detectLanguage, getLanguageMetadata, SupportedLanguageCode } from "./multilingual";

export class AIService {
  private explicitProvider?: AIModelProvider;

  constructor(provider?: AIModelProvider) {
    if (provider) {
      this.explicitProvider = provider;
    }
  }

  get provider(): AIModelProvider {
    return this.explicitProvider || getAIProvider();
  }

  /**
   * 1. PORTFOLIO ANALYSIS
   * Analyzes creative portfolio submissions, prompts, workflows, and tools.
   * 
   * CRITICAL REQUIREMENT:
   * AI analysis provides structured EVIDENCE for platform reviewers and MUST NOT
   * automatically grant verified status.
   */
  async analyzePortfolio(input: PortfolioAnalysisInput): Promise<PortfolioAnalysisOutput> {
    return aiLogger.time("AIService.analyzePortfolio", async () => {
      // 1. Validate input with Zod
      const validatedInput = PortfolioAnalysisInputSchema.parse(input);

      // 2. If model provider is configured (OpenRouter or Grok), call it
      if (this.provider.isConfigured()) {
        try {
          const prompt = `Analyze this creative portfolio project submission:
Title: ${validatedInput.portfolioTitle}
Description: ${validatedInput.description}
Stated Tools: ${validatedInput.tools.join(", ") || "Not specified"}
Generative Prompt: ${validatedInput.prompt || "Not provided"}
Creation Process: ${validatedInput.process || "Not provided"}
Media Context: ${validatedInput.availableMediaContext || "Not provided"}

Extract skills demonstrated, content types, tools used, key strengths, and an evidence summary.`;

          const systemInstruction = `You are a Senior AI Content Audit Engine for a creator marketplace.
Evaluate whether the submission demonstrates authentic creative mastery.
Do not verify skills automatically; produce evidence for human audit.
Return a structured JSON with keys: skills (string[]), contentTypes (string[]), tools (string[]), strengths (string[]), confidence (number 0.0-1.0), evidenceSummary (string).`;

          const rawResult = await this.provider.generateStructuredJSON<Record<string, unknown>>(
            prompt,
            systemInstruction,
            JSON.stringify(PortfolioAnalysisOutputSchema.shape)
          );

          return PortfolioAnalysisOutputSchema.parse({
            ...rawResult,
            requiresHumanReview: true,
            engine: "ai_model",
            provider: this.provider.name,
            isFallback: false,
          });
        } catch (err) {
          const fallbackReason = err instanceof Error ? err.message : String(err);
          aiLogger.warn(`${this.provider.name} call failed or timed out. Falling back to heuristic analyzer`, {
            error: err,
          });
          return this.heuristicPortfolioAnalysis(validatedInput, fallbackReason);
        }
      }

      // 3. Resilient Fallback Heuristic Engine (zero downtime for tests & demos)
      return this.heuristicPortfolioAnalysis(
        validatedInput,
        !this.provider.isConfigured() ? "AI provider credentials not configured" : undefined
      );
    });
  }

  /**
   * 2. CAMPAIGN BRIEF ANALYSIS
   * Parses unstructured natural language briefs and extracts key campaign requirements.
   */
  async analyzeCampaign(
    input: CampaignAnalysisInput | string
  ): Promise<CampaignAnalysisOutput> {
    return aiLogger.time("AIService.analyzeCampaign", async () => {
      // 1. Validate input with Zod
      const validatedInput = CampaignAnalysisInputSchema.parse(input);

      // 2. If model provider is configured (OpenRouter or Grok), call it
      if (this.provider.isConfigured()) {
        try {
          const prompt = `Parse this campaign brief into structured requirements:
Brief: "${validatedInput.brief}"

Extract:
- contentType (e.g. Instagram Reels, UGC Review)
- requiredSkills (e.g. Skincare, Product Reviews)
- aiTools (e.g. Runway, Midjourney)
- targetAudience (e.g. Women aged 18-35)
- platform (e.g. Instagram, YouTube)
- budget (min, max, currency, rawText)
- deadline (e.g. 2 Weeks)
- deliverables (e.g. 5 Instagram Reels)
- campaignRequirements (list of key criteria)`;

          const systemInstruction = `You are an AI Brand Campaign Architect. Parse briefs accurately into strict JSON.`;

          const rawResult = await this.provider.generateStructuredJSON<Record<string, unknown>>(
            prompt,
            systemInstruction,
            JSON.stringify(CampaignAnalysisOutputSchema.shape)
          );

          return CampaignAnalysisOutputSchema.parse({
            ...rawResult,
            engine: "ai_model",
            provider: this.provider.name,
            isFallback: false,
          });
        } catch (err) {
          const fallbackReason = err instanceof Error ? err.message : String(err);
          aiLogger.warn(`${this.provider.name} call failed. Falling back to heuristic brief parser`, {
            error: err,
          });
          return this.heuristicCampaignAnalysis(validatedInput.brief, fallbackReason);
        }
      }

      // 3. Fallback Heuristic Brief Extraction
      return this.heuristicCampaignAnalysis(
        validatedInput.brief,
        !this.provider.isConfigured() ? "AI provider credentials not configured" : undefined
      );
    });
  }

  /**
   * 3. CREATOR MATCHING (findMatches)
   * Scores and ranks candidates using the MVP weighted model:
   * - Skill Match = 40%
   * - Verification = 25%
   * - Portfolio = 15%
   * - Experience = 10%
   * - Client Rating = 10%
   */
  async findMatches(
    campaign: CampaignAnalysisOutput | CampaignAnalysisInput | string,
    customCreators?: CreatorMatchProfile[]
  ): Promise<MatchExplanation[]> {
    return aiLogger.time("AIService.findMatches", async () => {
      // Normalize campaign input: if raw string or brief object, analyze it first
      const resolvedCampaign: CampaignAnalysisOutput =
        typeof campaign === "string" || ("brief" in campaign && !("requiredSkills" in campaign))
          ? await this.analyzeCampaign(campaign)
          : (campaign as CampaignAnalysisOutput);

      // Use provided creators or transform market dataset
      const candidates: CreatorMatchProfile[] =
        customCreators ||
        CREATORS_DATA.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category,
          skills: c.skills,
          verifiedSkills: c.verifiedSkills,
          portfolioCount: c.portfolioCount,
          experienceYears: 4,
          engagementRate: c.engagementNum,
          clientRating: c.clientRating,
          previousBrandCollabs: c.previousBrandCollabs,
          priceRange: {
            min: parseInt(c.priceRange.replace(/[^0-9]/g, "").slice(0, 5) || "20000"),
            max: parseInt(c.priceRange.replace(/[^0-9]/g, "").slice(5) || "35000"),
          },
          platforms: c.platforms,
          contentTypes: c.contentTypes,
        }));

      // Calculate weighted score and explanations for each creator
      const results: MatchExplanation[] = candidates.map((creator) => {
        const { totalScore, breakdown } = calculateWeightedScores(creator, resolvedCampaign);
        return generateMatchExplanation(creator, resolvedCampaign, breakdown, totalScore);
      });

      // Sort from highest match score to lowest
      results.sort((a, b) => b.finalMatchScore - a.finalMatchScore);
      return results;
    });
  }

  /**
   * 4. EXPLAINABLE MATCHING (explainMatch)
   * Deep analysis for a specific creator with evidence-based reasons:
   * - AI Video: 91/100
   * - Product Advertising: 94/100
   * - 14 verified projects
   * - Similar campaign experience
   * - Within budget
   */
  async explainMatch(
    creatorId: string,
    campaign: CampaignAnalysisOutput | CampaignAnalysisInput | string,
    customCreators?: CreatorMatchProfile[]
  ): Promise<MatchExplanation> {
    return aiLogger.time(
      "AIService.explainMatch",
      async () => {
        const matches = await this.findMatches(campaign, customCreators);
        const match = matches.find((m) => m.creatorId === creatorId);
        if (!match) {
          throw new Error(`Creator with id '${creatorId}' not found for match explanation`);
        }
        return match;
      },
      { creatorId }
    );
  }

  // ==========================================
  // HEURISTIC ENGINES (DETERMINISTIC FALLBACKS)
  // ==========================================

  private heuristicPortfolioAnalysis(input: PortfolioAnalysisInput, fallbackReason?: string): PortfolioAnalysisOutput {
    const combined = `${input.portfolioTitle} ${input.description} ${input.prompt || ""} ${input.process || ""}`.toLowerCase();
    const skills: string[] = [];
    const contentTypes: string[] = [];
    const tools: string[] = [...(input.tools || [])];
    const strengths: string[] = [];

    // Detect skills
    if (combined.includes("skin") || combined.includes("beauty")) skills.push("Skincare", "Beauty Storytelling");
    if (combined.includes("review") || combined.includes("test")) skills.push("Product Reviews");
    if (combined.includes("reel") || combined.includes("short")) skills.push("Short-form Video");
    if (combined.includes("ugc") || combined.includes("customer")) skills.push("UGC Creation");
    if (combined.includes("tech") || combined.includes("gadget")) skills.push("Tech Reviews", "Benchmark Testing");
    if (combined.includes("fashion") || combined.includes("wear")) skills.push("Fashion Styling", "Lookbook Production");
    if (combined.includes("food") || combined.includes("recipe")) skills.push("Culinary Production", "Food Styling");
    if (combined.includes("travel") || combined.includes("hotel")) skills.push("Travel Cinematography", "Experiential Vlogging");
    if (combined.includes("ai") || combined.includes("prompt")) skills.push("AI Prompt Engineering");

    // Detect tools
    if (combined.includes("midjourney")) tools.push("Midjourney");
    if (combined.includes("runway")) tools.push("Runway Gen-2");
    if (combined.includes("capcut")) tools.push("CapCut");
    if (combined.includes("premiere")) tools.push("Adobe Premiere Pro");

    // Detect content types
    if (combined.includes("reel")) contentTypes.push("Instagram Reels");
    if (combined.includes("ugc")) contentTypes.push("UGC Video");
    if (combined.includes("review")) contentTypes.push("Product Breakdown");
    if (contentTypes.length === 0) contentTypes.push("Commercial Digital Content");

    strengths.push("High visual fidelity and prompt consistency");
    strengths.push("Clear commercial focus tailored for digital audiences");

    return {
      skills: Array.from(new Set(skills.length > 0 ? skills : ["Content Creation", "Visual Design"])),
      contentTypes: Array.from(new Set(contentTypes)),
      tools: Array.from(new Set(tools.length > 0 ? tools : ["Generative AI", "Video Editor"])),
      strengths,
      confidence: 0.94,
      evidenceSummary: `Verified ${skills.length} core competencies from description and workflow logs. Ready for human moderator sign-off.`,
      requiresHumanReview: true,
      engine: "heuristic_fallback",
      provider: this.provider.name,
      isFallback: true,
      fallbackReason: fallbackReason || (!this.provider.isConfigured() ? "AI provider credentials not configured" : "Fallback engaged"),
    };
  }

  private heuristicCampaignAnalysis(brief: string, fallbackReason?: string): CampaignAnalysisOutput {
    const text = brief.toLowerCase();

    // Extract content types
    const contentType: string[] = [];
    if (text.includes("reel")) contentType.push("Instagram Reels");
    if (text.includes("review")) contentType.push("Product Review");
    if (text.includes("ugc")) contentType.push("UGC Video");
    if (text.includes("youtube") || text.includes("longform")) contentType.push("YouTube Longform");
    if (contentType.length === 0) contentType.push("Instagram Reels", "UGC");

    // Extract skills
    const requiredSkills: string[] = [];
    if (text.includes("skincare") || text.includes("skin") || text.includes("cream")) {
      requiredSkills.push("Skincare", "Product Reviews");
    }
    if (text.includes("tech") || text.includes("software") || text.includes("gadget")) {
      requiredSkills.push("Tech Unboxing", "Product Reviews", "AI Software Benchmarks");
    }
    if (text.includes("fashion") || text.includes("clothing") || text.includes("style")) {
      requiredSkills.push("Fashion Styling", "Lookbook Production");
    }
    if (text.includes("fitness") || text.includes("workout") || text.includes("wellness")) {
      requiredSkills.push("Mobility Training", "Clean Nutrition");
    }
    if (text.includes("food") || text.includes("cooking") || text.includes("culinary")) {
      requiredSkills.push("Gourmet Recipe Dev", "Culinary ASMR");
    }
    if (text.includes("travel") || text.includes("resort") || text.includes("hotel")) {
      requiredSkills.push("Travel Vlogging", "Hotel Reviews");
    }

    // Target audience
    let targetAudience = "General digital consumer audience (18–35)";
    if (text.includes("women") || text.includes("female")) {
      targetAudience = "Women, 18–35, beauty & wellness enthusiasts";
    } else if (text.includes("tech") || text.includes("developer")) {
      targetAudience = "Tech enthusiasts & early adopters (20–40)";
    }

    // Platforms
    const platform: string[] = [];
    if (text.includes("instagram")) platform.push("Instagram");
    if (text.includes("youtube")) platform.push("YouTube");
    if (text.includes("tiktok")) platform.push("TikTok");
    if (platform.length === 0) platform.push("Instagram");

    // Budget extraction
    let minBudget: number | null = 20000;
    let maxBudget: number | null = 35000;
    const matchBudget = brief.match(/₹?\s?(\d[\d,]*)\s?[-–to]+\s?₹?\s?(\d[\d,]*)/i);
    if (matchBudget) {
      minBudget = parseInt(matchBudget[1].replace(/,/g, ""));
      maxBudget = parseInt(matchBudget[2].replace(/,/g, ""));
    }

    // Deliverables
    const deliverables: string[] = [];
    const reelsMatch = brief.match(/(\d+)\s+(?:instagram\s+)?reels?/i);
    if (reelsMatch) {
      deliverables.push(`${reelsMatch[1]} Instagram Reels`);
    } else {
      deliverables.push("3 Instagram Reels");
    }

    return {
      contentType,
      requiredSkills: Array.from(new Set(requiredSkills.length > 0 ? requiredSkills : ["Product Reviews", "Content Creation"])),
      aiTools: ["Runway Gen-2", "CapCut", "Midjourney"],
      targetAudience,
      platform,
      budget: {
        min: minBudget,
        max: maxBudget,
        currency: "INR",
        rawText: brief.includes("₹") ? "Stated in brief" : "₹ 20,000 - ₹ 35,000",
      },
      deadline: text.includes("week") ? "2 Weeks" : "1 Month",
      deliverables,
      campaignRequirements: [
        "Verified experience in category",
        "High engagement rate (>6%)",
        "Commercial usage rights included",
      ],
      engine: "heuristic_fallback",
      provider: this.provider.name,
      isFallback: true,
      fallbackReason: fallbackReason || (!this.provider.isConfigured() ? "AI provider credentials not configured" : "Fallback engaged"),
    };
  }

  /**
   * 5. CREATOR PROFILE AI ANALYSIS (analyzeCreatorProfile)
   * Deeply analyzes creator's skills, portfolio, categories, and engagement.
   */
  async analyzeCreatorProfile(
    input: CreatorProfileAnalysisInput
  ): Promise<CreatorProfileAnalysisOutput> {
    return aiLogger.time("AIService.analyzeCreatorProfile", async () => {
      const validated = CreatorProfileAnalysisInputSchema.parse(input);

      if (this.provider.isConfigured()) {
        try {
          const prompt = `Analyze this content creator profile:
Name: ${validated.name}
Category: ${validated.category}
Bio: ${validated.bio || "None provided"}
Skills: ${validated.skills.join(", ")}
Portfolio Count: ${validated.portfolioCount}
Portfolio Highlights: ${validated.portfolioSamples.map((p: { title: string; description: string }) => `${p.title} (${p.description})`).join(" | ") || "No highlights"}
Followers: ${validated.followers || "Not disclosed"}
Engagement Rate: ${validated.engagementRate || "Not disclosed"}
Platforms: ${validated.platforms.join(", ") || "Instagram"}
Content Types: ${validated.contentTypes.join(", ") || "Reels, UGC"}
Availability: ${validated.availability || "Available"}

Generate structured analysis: strengths (string[]), relevantSkills (string[]), suitableCategories (string[]), recommendedCampaignTypes (string[]), potentialImprovementAreas (string[]), campaignMatchAffinities (array of {campaignType: string, matchScore: number, reason: string}), overallReadinessScore (number 0-100).`;

          const systemInstruction = `You are a Senior Creator Talent & Performance Auditor for top brand sponsorships. Evaluate the creator objectively based on verified evidence.`;

          const rawResult = await this.provider.generateStructuredJSON<Record<string, unknown>>(
            prompt,
            systemInstruction,
            JSON.stringify(CreatorProfileAnalysisOutputSchema.shape)
          );

          return CreatorProfileAnalysisOutputSchema.parse({
            ...rawResult,
            requiresHumanReview: true,
            engine: "ai_model",
            provider: this.provider.name,
            isFallback: false,
          });
        } catch (err) {
          const fallbackReason = err instanceof Error ? err.message : String(err);
          aiLogger.warn(`${this.provider.name} call failed for creator profile analysis, using heuristic engine`, {
            error: err,
          });
          return this.heuristicCreatorProfileAnalysis(validated, fallbackReason);
        }
      }

      // Fallback Heuristic Creator Analysis
      return this.heuristicCreatorProfileAnalysis(
        validated,
        !this.provider.isConfigured() ? "AI provider credentials not configured. Using rule-based audit engine." : undefined
      );
    });
  }

  private heuristicCreatorProfileAnalysis(
    input: CreatorProfileAnalysisInput,
    fallbackReason?: string
  ): CreatorProfileAnalysisOutput {
    const skills = input.skills;
    const count = input.portfolioCount;
    const cat = input.category;

    const strengths: string[] = [];
    if (skills.length >= 4) {
      strengths.push(`Diverse verified skill stack with ${skills.length} core proficiencies`);
    } else {
      strengths.push(`Focused domain expertise in ${skills[0] || cat}`);
    }

    if (count >= 10) {
      strengths.push(`High commercial production volume with ${count}+ completed catalog assets`);
    } else if (count > 0) {
      strengths.push(`Curated portfolio demonstrator with ${count} case study projects`);
    } else {
      strengths.push(`Early-stage portfolio foundation in ${cat}`);
    }

    if (input.engagementRate) {
      strengths.push(`Audience interaction benchmarked at ${input.engagementRate} active engagement`);
    } else {
      strengths.push("Consistent multi-platform audience retention");
    }

    const recommendedCampaignTypes = [
      `${cat} Product Discovery & UGC Reviews`,
      `Multi-platform 30s Sponsored Video Series`,
      `High-intent Conversion & Discount Code Campaigns`,
    ];

    const potentialImprovementAreas: string[] = [];
    if (count < 5) {
      potentialImprovementAreas.push(
        "Upload at least 5 structured portfolio items with clear before-and-after conversion metrics."
      );
    }
    if (!skills.some((s: string) => s.toLowerCase().includes("ai") || s.toLowerCase().includes("workflow"))) {
      potentialImprovementAreas.push(
        "Highlight AI generation & workflow tools (e.g. Midjourney, Runway, CapCut AI) to increase brand match scores."
      );
    }
    if (!input.platforms.includes("YouTube")) {
      potentialImprovementAreas.push(
        "Expand into long-form YouTube tutorials or dedicated unboxing videos to capture enterprise clients."
      );
    }
    if (potentialImprovementAreas.length === 0) {
      potentialImprovementAreas.push(
        "Continuously benchmark quarterly CPM pricing against marketplace category averages."
      );
    }

    let readiness = 65;
    if (skills.length >= 3) readiness += 15;
    if (count >= 5) readiness += 10;
    if (input.engagementRate) readiness += 5;
    if (readiness > 96) readiness = 96;

    return {
      strengths,
      relevantSkills: skills,
      suitableCategories: [cat, "Digital Creator Marketing", "Brand Partnerships"],
      recommendedCampaignTypes,
      potentialImprovementAreas,
      campaignMatchAffinities: [
        {
          campaignType: `${cat} Awareness Launch`,
          matchScore: Math.min(readiness + 2, 98),
          reason: `Strong category alignment in ${cat} with verified deliverables.`,
        },
        {
          campaignType: "Organic UGC Review Series",
          matchScore: Math.min(readiness - 3, 94),
          reason: "Authentic camera presence and natural storytelling voice.",
        },
        {
          campaignType: "Viral Shorts / Reels Challenge",
          matchScore: Math.min(readiness - 7, 89),
          reason: "High pacing capability matching short-form algorithm requirements.",
        },
      ],
      overallReadinessScore: readiness,
      requiresHumanReview: true,
      engine: "heuristic_fallback",
      provider: "Heuristic Audit Engine",
      isFallback: true,
      fallbackReason: fallbackReason || (!this.provider.isConfigured() ? "AI provider credentials not configured. Using rule-based audit engine." : "Fallback engaged"),
    };
  }

  /**
   * 6. AI CONTENT SUGGESTIONS (generateContentSuggestions)
   * Generates actionable concepts, hooks, captions, hashtags, and script outlines.
   */
  async generateContentSuggestions(
    input: ContentSuggestionsInput
  ): Promise<ContentSuggestionsOutput> {
    return aiLogger.time("AIService.generateContentSuggestions", async () => {
      const validated = ContentSuggestionsInputSchema.parse(input);

      if (this.provider.isConfigured()) {
        try {
          const prompt = `Generate 3 high-impact content suggestions for a creator:
Niche: ${validated.niche}
Target Audience: ${validated.targetAudience}
Platform: ${validated.platform}
Goal: ${validated.contentGoal}
Format: ${validated.preferredFormat}
Keywords: ${validated.keywords || "None"}

Return JSON with "suggestions": array of items. Each item must have:
id: string
title: string
concept: string
hook: string
caption: string
hashtags: string[]
callToAction: string
videoScriptOutline: array of {scene: string, visual: string, audioOrVoiceover: string}`;

          const systemInstruction = `You are a Viral Social Media Strategist & Creative Director. Output ONLY valid JSON matching the schema.`;

          const rawResult = await this.provider.generateStructuredJSON<Record<string, unknown>>(
            prompt,
            systemInstruction,
            JSON.stringify(ContentSuggestionsOutputSchema.shape)
          );

          return ContentSuggestionsOutputSchema.parse({
            ...rawResult,
            engine: "ai_model",
            provider: this.provider.name,
            isFallback: false,
          });
        } catch (err) {
          const fallbackReason = err instanceof Error ? err.message : String(err);
          aiLogger.warn(`${this.provider.name} call failed for content suggestions, using heuristic engine`, {
            error: err,
          });
          return this.heuristicContentSuggestions(validated, fallbackReason);
        }
      }

      // Fallback Heuristic Content Suggestions Engine
      return this.heuristicContentSuggestions(
        validated,
        !this.provider.isConfigured() ? "AI provider credentials not configured" : undefined
      );
    });
  }

  private heuristicContentSuggestions(
    input: ContentSuggestionsInput,
    fallbackReason?: string
  ): ContentSuggestionsOutput {
    const { niche, platform, targetAudience, contentGoal, preferredFormat } = input;
    const cleanNiche = niche || "Content Creation";

    return {
      suggestions: [
        {
          id: `sug-1-${Date.now()}`,
          title: `The 3-Step ${cleanNiche} Formula Nobody Tells You About`,
          concept: `A high-curiosity educational breakdown designed to generate saves and shares among ${targetAudience}.`,
          hook: `Stop doing this in ${cleanNiche} if you actually want results in 2026...`,
          caption: `Most people overcomplicate ${cleanNiche.toLowerCase()}. Here are the exact 3 steps I use to stay ahead, drive authentic results, and work with top brands. Save this post for your next campaign! 👇`,
          hashtags: [
            `#${cleanNiche.replace(/\s+/g, "")}`,
            `#${platform.replace(/\s+/g, "")}Tips`,
            "#CreatorEconomy",
            "#ContentStrategy",
            "#TrendingContent",
          ],
          callToAction: `Drop a '🔥' in the comments if you want the free checklist, or tap the link in bio!`,
          videoScriptOutline: [
            {
              scene: "Scene 1 (0-3s)",
              visual: "Quick cut: Looking directly at camera with hand gesture stopping the scroll.",
              audioOrVoiceover: "Stop scrolling if you've been struggling to grow in this niche...",
            },
            {
              scene: "Scene 2 (3-18s)",
              visual: "B-roll split screen demonstrating the outdated method vs the new AI-powered workflow.",
              audioOrVoiceover: "Here is step 1 and step 2 that 90% of creators ignore...",
            },
            {
              scene: "Scene 3 (18-30s)",
              visual: "Creator pointing to on-screen text summary with brand logo overlay.",
              audioOrVoiceover: "Save this for your next video and follow for daily strategies!",
            },
          ],
        },
        {
          id: `sug-2-${Date.now()}`,
          title: `Real Life Test: Does This ${cleanNiche} Trend Actually Work?`,
          concept: `A transparent myth-buster / review format tailored for ${contentGoal} on ${platform}.`,
          hook: `I tested the most viral ${cleanNiche.toLowerCase()} trend so you don't waste your money.`,
          caption: `Honest review time! Everyone is talking about this product/workflow, but is it worth the hype? Here is my raw, unedited opinion after 14 days of testing. Tag a friend who needs to see this!`,
          hashtags: [
            `#${cleanNiche.replace(/\s+/g, "")}Review`,
            "#HonestReview",
            `#${preferredFormat.replace(/\s+/g, "")}`,
            "#TestedAndApproved",
          ],
          callToAction: `Have you tried this yet? Let me know your thoughts in the comments!`,
          videoScriptOutline: [
            {
              scene: "Scene 1 (0-4s)",
              visual: "Extreme close-up macro shot of product / workflow in action.",
              audioOrVoiceover: "Everyone told me this wouldn't work. Well, here is the proof.",
            },
            {
              scene: "Scene 2 (4-22s)",
              visual: "Before-and-after comparison with timeline overlay.",
              audioOrVoiceover: "Notice the difference in texture and performance right here.",
            },
            {
              scene: "Scene 3 (22-30s)",
              visual: "Holding product with final rating score card graphic.",
              audioOrVoiceover: "Final verdict: 9 out of 10. Check the link in bio for the brand discount!",
            },
          ],
        },
        {
          id: `sug-3-${Date.now()}`,
          title: `Behind The Scenes: How I Produce 5x More Content In Half The Time`,
          concept: `A workflow and tool demonstration showcasing modern AI creator efficiency.`,
          hook: `How I plan an entire month of ${cleanNiche.toLowerCase()} content in just 2 hours.`,
          caption: `Efficiency is the real superpower of modern creators. In this breakdown, I walk you through the exact tools and creative prompts I use to produce high-converting assets. Bookmark this!`,
          hashtags: [
            "#BehindTheScenes",
            `#${cleanNiche.replace(/\s+/g, "")}`,
            "#WorkflowHacks",
            "#DigitalCreation",
          ],
          callToAction: `Comment 'TOOLKIT' and I'll send over my exact prompt templates!`,
          videoScriptOutline: [
            {
              scene: "Scene 1 (0-3s)",
              visual: "Time-lapse of workspace setup and monitor lighting turning on.",
              audioOrVoiceover: "This one system changed my entire content business...",
            },
            {
              scene: "Scene 2 (3-20s)",
              visual: "Screen recording showing script generation and video timeline editing.",
              audioOrVoiceover: "I batch my ideation on Monday, film in two hours, and let smart tools do the heavy lifting.",
            },
            {
              scene: "Scene 3 (20-30s)",
              visual: "Smiling at camera holding phone showing engagement analytics.",
              audioOrVoiceover: "Work smarter, not harder. Follow for more creator systems!",
            },
          ],
        },
      ],
      engine: "heuristic_fallback",
      provider: "Heuristic Fallback Engine",
      isFallback: true,
      fallbackReason: fallbackReason || (!this.provider.isConfigured() ? "AI provider credentials not configured" : "Fallback engaged"),
    };
  }

  /**
   * 7. AI CHATBOT (handleChat / handleChatWithMetadata)
   * Contextual chatbot assistant for creators and brands with execution provenance and multilingual support.
   */
  async handleChatWithMetadata(
    messages: ChatMessage[],
    userContext?: AssistantContext
  ): Promise<{
    reply: string;
    engine: "ai_model" | "heuristic_fallback";
    provider?: string;
    isFallback: boolean;
    fallbackReason?: string;
    detectedLanguage?: SupportedLanguageCode;
    effectiveLanguage?: SupportedLanguageCode;
    dir?: "ltr" | "rtl";
  }> {
    return aiLogger.time("AIService.handleChatWithMetadata", async () => {
      const role = userContext?.role || "creator";
      const niche = userContext?.niche || "Content Creation";
      const normalizedRole = role === "brand" ? "brand" : "creator";

      const preferredLanguage = userContext?.preferredLanguage || "auto";
      const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
      const detection = detectLanguage(lastUserMessage, preferredLanguage);
      const isExplicit = Boolean(preferredLanguage && preferredLanguage !== "auto");
      const effectiveLanguage = (isExplicit ? preferredLanguage : detection.detectedLanguage) as SupportedLanguageCode;
      const langMeta = getLanguageMetadata(effectiveLanguage);

      if (this.provider.isConfigured()) {
        try {
          const systemInstruction = buildEnhancedSystemPrompt({
            role: normalizedRole,
            userName: "Marketplace User",
            userNiche: niche,
            platform: userContext?.platform || "Instagram",
            targetAudience: userContext?.targetAudience || "Target Audience",
            brandOrProduct: userContext?.brandOrProduct,
            tone: userContext?.tone || "Conversational",
            goal: userContext?.contentGoal || "Engagement & Growth",
            preferredLanguage,
            detectedLanguage: detection.detectedLanguage,
            isCodeSwitching: detection.isCodeSwitching,
            dialect: detection.dialect,
          });

          const languageReminder = effectiveLanguage !== "en" && effectiveLanguage !== "auto"
            ? `\n\n[MANDATORY SYSTEM DIRECTIVE: The user's active response language is ${langMeta.name} (${langMeta.nativeName}). You MUST generate the entire user-facing response, explanation, hooks, and creative scripts in fluent, natural ${langMeta.name} (${langMeta.nativeName}). DO NOT default to English. Keep product names (e.g. "GlowUp"), URLs, timestamps (e.g. "(0:00 - 0:03)"), and hashtags unchanged.]`
            : "";
          const conversationPrompt = messages
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
            .join("\n\n") + languageReminder;

          const reply = await this.provider.generateText(conversationPrompt, systemInstruction);
          return {
            reply,
            engine: "ai_model",
            provider: this.provider.name,
            isFallback: false,
            detectedLanguage: detection.detectedLanguage,
            effectiveLanguage,
            dir: langMeta.dir,
          };
        } catch (err) {
          const fallbackReason = err instanceof Error ? err.message : String(err);
          aiLogger.warn(`${this.provider.name} call failed for chatbot, using heuristic assistant`, { error: err });
          const reply = this.heuristicChatResponse(messages, role, niche, userContext, effectiveLanguage);
          return {
            reply,
            engine: "heuristic_fallback",
            provider: this.provider.name,
            isFallback: true,
            fallbackReason,
            detectedLanguage: detection.detectedLanguage,
            effectiveLanguage,
            dir: langMeta.dir,
          };
        }
      }

      // Fallback Assistant Engine
      const reply = this.heuristicChatResponse(messages, role, niche, userContext, effectiveLanguage);
      return {
        reply,
        engine: "heuristic_fallback",
        provider: this.provider.name,
        isFallback: true,
        fallbackReason: !this.provider.isConfigured() ? "AI provider credentials not configured" : undefined,
        detectedLanguage: detection.detectedLanguage,
        effectiveLanguage,
        dir: langMeta.dir,
      };
    });
  }

  async handleChat(
    messages: ChatMessage[],
    userContext?: AssistantContext
  ): Promise<string> {
    const res = await this.handleChatWithMetadata(messages, userContext);
    return res.reply;
  }

  private heuristicChatResponse(
    messages: ChatMessage[],
    role: "brand" | "influencer" | "creator" | "admin",
    niche: string,
    userContext?: AssistantContext,
    preferredLanguage: SupportedLanguageCode = "auto"
  ): string {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const normalizedRole = role === "brand" ? "brand" : "creator";
    const res = generateSmartHeuristicResponse({
      userMessage: lastUserMessage,
      role: normalizedRole,
      niche,
      name: "Creator",
      platform: userContext?.platform || "Instagram",
      audience: userContext?.targetAudience || "Target Demographic",
      brandOrProduct: userContext?.brandOrProduct,
      tone: userContext?.tone || "Conversational",
      goal: userContext?.contentGoal || "Engagement",
      preferredLanguage,
    });
    return res.reply;
  }

  /**
   * AI-Assisted Creator Profile Draft Generation (Phase 3)
   * Produces a structured profile draft based strictly on creator-supplied inputs.
   * Never overwrites database profile without explicit user approval.
   */
  async generateCreatorProfileDraft(
    input: GenerateCreatorProfileInput
  ): Promise<GeneratedProfileDraft> {
    return aiLogger.time("AIService.generateCreatorProfileDraft", async () => {
      const validatedInput = GenerateCreatorProfileInputSchema.parse(input);

      if (this.provider.isConfigured()) {
        try {
          const prompt = `Generate an authentic, high-converting professional creator profile draft:
Creator Name: ${validatedInput.name}
Niche: ${validatedInput.niche}
Provided Skills: ${validatedInput.skills.join(", ")}
Experience: ${validatedInput.experience || "GenAI visual storyteller"}
Content Categories: ${validatedInput.contentCategories?.join(", ") || "Commercial Media & UGC"}
Preferred Campaign Types: ${validatedInput.campaignTypes?.join(", ") || "UGC & Visual Commercials"}
Short Description of Work: ${validatedInput.workDescription || "None provided"}
Portfolio Links: ${validatedInput.portfolioLinks?.join(", ") || "None"}

CRITICAL RULES:
1. Ground all claims strictly in the creator's stated skills, tools, and experience.
2. DO NOT fabricate client names, awards, follower counts, ratings, or fake reviews.
3. Suggest a clear, compelling professional headline.
4. Craft an engaging 2-3 paragraph biography highlighting creative workflow and technical execution.
5. Provide actionable completeness suggestions to help the creator achieve verification.
6. Draft portfolio project descriptions only if links or descriptions are provided.`;

          const systemInstruction = `You are a Senior Creator Talent Architect for VeriCreator.
Produce a professional, structured creator profile draft in strict JSON format.
Keys:
- professionalHeadline (string: 5-120 chars)
- shortIntroduction (string: 10-300 chars)
- bio (string: 50-2000 chars)
- niche (string)
- contentCategories (string[])
- skills (string[])
- suggestedTools (string[])
- portfolioDrafts (array of { title, description, suggestedContentType, suggestedTools })
- completenessSuggestions (string[])`;

          const rawResult = await this.provider.generateStructuredJSON<Record<string, unknown>>(
            prompt,
            systemInstruction,
            JSON.stringify(GeneratedProfileDraftSchema.shape)
          );

          return GeneratedProfileDraftSchema.parse({
            ...rawResult,
            isDraft: true,
            generatedAt: new Date().toISOString(),
            provider: this.provider.name,
            isFallback: false,
          });
        } catch (err) {
          const fallbackReason = err instanceof Error ? err.message : String(err);
          aiLogger.warn(`${this.provider.name} call failed. Falling back to heuristic profile draft`, {
            error: err,
          });
          return this.heuristicProfileDraft(validatedInput, fallbackReason);
        }
      }

      return this.heuristicProfileDraft(
        validatedInput,
        !this.provider.isConfigured() ? "AI provider credentials not configured" : undefined
      );
    });
  }

  private heuristicProfileDraft(
    input: GenerateCreatorProfileInput,
    fallbackReason?: string
  ): GeneratedProfileDraft {
    const primarySkill = input.skills[0] || "Generative AI";
    const headline = `AI ${input.niche} Specialist & ${primarySkill} Creator`;
    const intro = `${input.name} is a specialized creator in ${input.niche}, leveraging ${input.skills.slice(0, 3).join(", ")} to craft high-impact commercial media.`;

    const bioParagraphs = [
      `${intro} Focused on elevating brand presence through precision promptcraft and aesthetic generative storytelling.`,
      input.workDescription
        ? `Creative approach: ${input.workDescription}. Workflows prioritize authentic brand voice, rapid asset iteration, and commercial conversion.`
        : `Experienced in developing multi-platform visual assets, combining ${input.skills.join(", ")} with meticulous post-production standards.`,
      `Available for collaborations across ${input.campaignTypes && input.campaignTypes.length > 0 ? input.campaignTypes.join(", ") : "commercial UGC, product demos, and campaign content"}. Open to direct brand engagements through VeriCreator.`,
    ];

    const portfolioDrafts = (input.portfolioLinks && input.portfolioLinks.length > 0
      ? input.portfolioLinks.map((link, idx) => ({
          title: `${input.niche} Commercial Showcase #${idx + 1}`,
          description: `Generative production sample utilizing ${input.skills.slice(0, 2).join(" & ")}. Evidence accessible at ${link}.`,
          suggestedContentType: input.contentCategories?.[0] || "Generative UGC",
          suggestedTools: input.skills.slice(0, 3),
        }))
      : input.workDescription
      ? [
          {
            title: `${input.niche} Flagship Project`,
            description: input.workDescription,
            suggestedContentType: "Commercial Concept Reel",
            suggestedTools: input.skills.slice(0, 2),
          },
        ]
      : []
    );

    const completenessSuggestions: string[] = [];
    if (!input.experience) completenessSuggestions.push("Add years of experience and notable career highlights to improve brand trust.");
    if (!input.portfolioLinks || input.portfolioLinks.length === 0) completenessSuggestions.push("Link live portfolio media or YouTube/Instagram reels to unlock verified portfolio badges.");
    if (input.skills.length < 3) completenessSuggestions.push("Add at least 3 specific AI tools and technical skills to maximize campaign match accuracy.");
    completenessSuggestions.push("Complete skill benchmark tests in the Creator Passport to earn verified skill credentials.");

    const normalizedTools = Array.from(
      new Set([
        ...input.skills.filter((s) => /midjourney|runway|flux|elevenlabs|pika|sora|claude|gpt|comfyui/i.test(s)),
        "Midjourney v6",
        "Runway Gen-3",
      ])
    );

    return GeneratedProfileDraftSchema.parse({
      professionalHeadline: headline.slice(0, 120),
      shortIntroduction: intro.slice(0, 300),
      bio: bioParagraphs.join("\n\n").slice(0, 2000),
      niche: input.niche,
      contentCategories: input.contentCategories && input.contentCategories.length > 0 ? input.contentCategories : [input.niche, "Generative AI", "UGC"],
      skills: input.skills,
      suggestedTools: normalizedTools,
      portfolioDrafts,
      completenessSuggestions,
      isDraft: true,
      generatedAt: new Date().toISOString(),
      provider: fallbackReason ? `Heuristic Fallback (${fallbackReason.slice(0, 40)})` : "Deterministic Heuristic Engine",
      isFallback: true,
    });
  }
}

export const aiService = new AIService();

// Top-level exported functions for direct import and consumption
export const analyzePortfolio = (input: PortfolioAnalysisInput) =>
  aiService.analyzePortfolio(input);

export const analyzeCampaign = (input: CampaignAnalysisInput | string) =>
  aiService.analyzeCampaign(input);

export const findMatches = (
  campaign: CampaignAnalysisOutput | CampaignAnalysisInput | string,
  customCreators?: CreatorMatchProfile[]
) => aiService.findMatches(campaign, customCreators);

export const explainMatch = (
  creatorId: string,
  campaign: CampaignAnalysisOutput | CampaignAnalysisInput | string,
  customCreators?: CreatorMatchProfile[]
) => aiService.explainMatch(creatorId, campaign, customCreators);

export const generateCreatorProfileDraft = (input: GenerateCreatorProfileInput) =>
  aiService.generateCreatorProfileDraft(input);
