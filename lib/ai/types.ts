import { z } from "zod";
import { SupportedLanguageCode, SupportedLanguageSchema } from "./multilingual";
export type { SupportedLanguageCode };

// ==========================================
// 1. PORTFOLIO ANALYSIS SCHEMAS
// ==========================================

export const PortfolioAnalysisInputSchema = z.preprocess(
  (val: any) => {
    if (typeof val === "object" && val !== null) {
      return {
        portfolioTitle: val.portfolioTitle || val.title || "",
        description: val.description || "",
        tools: Array.isArray(val.tools)
          ? val.tools
          : Array.isArray(val.toolsUsed)
          ? val.toolsUsed
          : [],
        prompt: val.prompt || "",
        process: val.process || val.processEvidence || "",
        availableMediaContext:
          val.availableMediaContext || val.mediaContext || val.mediaUrl || val.media || "",
      };
    }
    return val;
  },
  z.object({
    portfolioTitle: z.string().min(2, "Portfolio title is required"),
    description: z.string().min(5, "Description is required"),
    tools: z.array(z.string()).default([]),
    prompt: z.string().optional().default(""),
    process: z.string().optional().default(""),
    availableMediaContext: z.string().optional().default(""),
  })
);

export type PortfolioAnalysisInput = {
  portfolioTitle: string;
  description: string;
  tools?: string[];
  prompt?: string;
  process?: string;
  availableMediaContext?: string;
  [key: string]: any;
};

export const PortfolioAnalysisOutputSchema = z.object({
  skills: z.array(z.string()).describe("Identified creative and technical skills"),
  contentTypes: z.array(z.string()).describe("Content formats (e.g. UGC, Reels, 3D Lookbook)"),
  tools: z.array(z.string()).describe("AI and editing tools detected (e.g. Midjourney, Runway Gen-2)"),
  strengths: z.array(z.string()).describe("Specific creative strengths observed from evidence"),
  confidence: z.number().min(0).max(1).describe("Model confidence score between 0.0 and 1.0"),
  evidenceSummary: z.string().optional().describe("Observed evidence notes for platform reviewer audit"),
  requiresHumanReview: z.boolean().default(true),
  // Generation provenance metadata
  engine: z.enum(["ai_model", "heuristic_fallback"]).default("ai_model"),
  provider: z.string().optional(),
  isFallback: z.boolean().default(false),
  fallbackReason: z.string().optional(),
});

export type PortfolioAnalysisOutput = z.infer<typeof PortfolioAnalysisOutputSchema>;

// ==========================================
// 2. CAMPAIGN BRIEF ANALYSIS SCHEMAS
// ==========================================

export const CampaignAnalysisInputSchema = z.preprocess(
  (val: any) => {
    if (typeof val === "string") {
      return { brief: val };
    }
    return val;
  },
  z.object({
    brief: z.string().min(10, "Natural language campaign brief must be at least 10 characters"),
  })
);

export type CampaignAnalysisInput = z.infer<typeof CampaignAnalysisInputSchema>;

export const CampaignAnalysisOutputSchema = z.object({
  contentType: z.array(z.string()).describe("Extracted content formats e.g. Instagram Reels, UGC Review"),
  requiredSkills: z.array(z.string()).describe("Core skills required e.g. Skincare, Product Reviews"),
  aiTools: z.array(z.string()).describe("AI software or workflows required"),
  targetAudience: z.string().describe("Demographic & persona target e.g. Women 18-35"),
  platform: z.array(z.string()).describe("Target distribution channels e.g. Instagram, TikTok"),
  budget: z.object({
    min: z.number().nullable().default(null),
    max: z.number().nullable().default(null),
    currency: z.string().default("INR"),
    rawText: z.string(),
  }),
  deadline: z.string().describe("Target timeframe or turnaround e.g. 2 Weeks"),
  deliverables: z.array(z.string()).describe("Specific items expected e.g. 5 Instagram Reels"),
  category: z.string().optional().describe("Campaign industry or niche category"),
  campaignRequirements: z.array(z.string()).describe("Summary of non-negotiable criteria"),
  // Generation provenance metadata
  engine: z.enum(["ai_model", "heuristic_fallback"]).default("ai_model"),
  provider: z.string().optional(),
  isFallback: z.boolean().default(false),
  fallbackReason: z.string().optional(),
});

export type CampaignAnalysisOutput = z.infer<typeof CampaignAnalysisOutputSchema>;

// ==========================================
// 3. CREATOR MATCHING & SCORING SCHEMAS
// ==========================================

export const CreatorMatchProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  skills: z.array(z.string()),
  verifiedSkills: z.array(z.string()),
  portfolioCount: z.number().default(0),
  experienceYears: z.number().default(2),
  engagementRate: z.number().default(5.0), // e.g. 8.7
  clientRating: z.number().default(4.5), // out of 5.0
  previousBrandCollabs: z.array(z.string()).default([]),
  priceRange: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
  platforms: z.array(z.string()).default([]),
  contentTypes: z.array(z.string()).default([]),
});

export type CreatorMatchProfile = z.infer<typeof CreatorMatchProfileSchema>;

export const MatchScoringBreakdownSchema = z.object({
  skillMatch: z.number().min(0).max(100).describe("Weight 40%"),
  verification: z.number().min(0).max(100).describe("Weight 25%"),
  portfolio: z.number().min(0).max(100).describe("Weight 15%"),
  experience: z.number().min(0).max(100).describe("Weight 10%"),
  clientRating: z.number().min(0).max(100).describe("Weight 10%"),
});

export type MatchScoringBreakdown = z.infer<typeof MatchScoringBreakdownSchema>;

export const MatchExplanationSchema = z.object({
  creatorId: z.string(),
  creatorName: z.string(),
  finalMatchScore: z.number().min(0).max(100),
  breakdown: MatchScoringBreakdownSchema,
  specificReasons: z.array(z.string()).describe("Detailed evidence-based reasons e.g. 'AI Video: 91/100', '14 verified projects'"),
  potentialGaps: z.array(z.string()).describe("Potential gaps or constraints e.g. 'Limited experience with YouTube content'"),
  withinBudget: z.boolean().default(true),
  recommendationSummary: z.string(),
});

export type MatchExplanation = z.infer<typeof MatchExplanationSchema>;

// ==========================================
// 4. CREATOR PROFILE AI ANALYSIS SCHEMAS
// ==========================================

export const CreatorProfileAnalysisInputSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  bio: z.string().optional().default(""),
  skills: z.array(z.string()).min(1, "At least one skill is required for AI analysis"),
  portfolioCount: z.number().default(0),
  portfolioSamples: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        tools: z.array(z.string()).default([]),
        results: z.string().optional(),
      })
    )
    .default([]),
  followers: z.string().optional(),
  engagementRate: z.string().optional(),
  platforms: z.array(z.string()).default([]),
  contentTypes: z.array(z.string()).default([]),
  availability: z.string().optional(),
});

export type CreatorProfileAnalysisInput = z.infer<typeof CreatorProfileAnalysisInputSchema>;

export const CreatorProfileAnalysisOutputSchema = z.object({
  strengths: z.array(z.string()),
  relevantSkills: z.array(z.string()),
  suitableCategories: z.array(z.string()),
  recommendedCampaignTypes: z.array(z.string()),
  potentialImprovementAreas: z.array(z.string()),
  campaignMatchAffinities: z.array(
    z.object({
      campaignType: z.string(),
      matchScore: z.number(),
      reason: z.string(),
    })
  ),
  overallReadinessScore: z.number().min(0).max(100),
  requiresHumanReview: z.boolean().default(true),
  // Generation provenance metadata
  engine: z.enum(["ai_model", "heuristic_fallback"]).default("ai_model"),
  provider: z.string().optional(),
  isFallback: z.boolean().default(false),
  fallbackReason: z.string().optional(),
});

export type CreatorProfileAnalysisOutput = z.infer<typeof CreatorProfileAnalysisOutputSchema>;

// ==========================================
// 5. AI CHATBOT SCHEMAS
// ==========================================
// 5. AI CHATBOT & ASSISTANT SCHEMAS
// ==========================================

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "Message content cannot be empty").max(4000, "Message cannot exceed 4000 characters"),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const AssistantContextSchema = z.object({
  role: z.enum(["brand", "influencer", "creator", "admin"]).default("creator"),
  niche: z.string().optional(),
  platform: z.string().optional(),
  targetAudience: z.string().optional(),
  brandOrProduct: z.string().optional(),
  tone: z.string().optional(),
  contentGoal: z.string().optional(),
  creatorId: z.string().optional(),
  additionalNotes: z.string().optional(),
  preferredLanguage: SupportedLanguageSchema.optional(),
});

export type AssistantContext = z.infer<typeof AssistantContextSchema>;

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1, "At least one message is required"),
  userContext: AssistantContextSchema.optional(),
  sessionId: z.string().optional(),
  preferredLanguage: SupportedLanguageSchema.optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ==========================================
// 6. AI CONTENT SUGGESTIONS SCHEMAS
// ==========================================

export const ContentSuggestionsInputSchema = z.object({
  niche: z.string().min(2, "Niche is required"),
  targetAudience: z.string().min(2, "Target audience is required"),
  platform: z.string().min(2, "Platform is required"),
  contentGoal: z.string().min(2, "Goal is required"),
  preferredFormat: z.string().min(2, "Format is required"),
  keywords: z.string().optional().default(""),
});

export type ContentSuggestionsInput = {
  niche: string;
  targetAudience: string;
  platform: string;
  contentGoal: string;
  preferredFormat: string;
  keywords?: string;
};

export const ContentSuggestionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  concept: z.string(),
  hook: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  callToAction: z.string(),
  videoScriptOutline: z
    .array(
      z.object({
        scene: z.string(),
        visual: z.string(),
        audioOrVoiceover: z.string(),
      })
    )
    .optional(),
});

export type ContentSuggestionItem = z.infer<typeof ContentSuggestionItemSchema>;

export const ContentSuggestionsOutputSchema = z.object({
  suggestions: z.array(ContentSuggestionItemSchema),
  // Generation provenance metadata
  engine: z.enum(["ai_model", "heuristic_fallback"]).default("ai_model"),
  provider: z.string().optional(),
  isFallback: z.boolean().default(false),
  fallbackReason: z.string().optional(),
});

export type ContentSuggestionsOutput = z.infer<typeof ContentSuggestionsOutputSchema>;

