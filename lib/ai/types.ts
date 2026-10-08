import { z } from "zod";

// ==========================================
// 1. PORTFOLIO ANALYSIS SCHEMAS
// ==========================================

export const PortfolioAnalysisInputSchema = z.object({
  portfolioTitle: z.string().min(2, "Portfolio title is required"),
  description: z.string().min(5, "Description is required"),
  tools: z.array(z.string()).default([]),
  prompt: z.string().optional().default(""),
  process: z.string().optional().default(""),
  availableMediaContext: z.string().optional().default(""),
});

export type PortfolioAnalysisInput = z.infer<typeof PortfolioAnalysisInputSchema>;

export const PortfolioAnalysisOutputSchema = z.object({
  skills: z.array(z.string()).describe("Identified creative and technical skills"),
  contentTypes: z.array(z.string()).describe("Content formats (e.g. UGC, Reels, 3D Lookbook)"),
  tools: z.array(z.string()).describe("AI and editing tools detected (e.g. Midjourney, Runway Gen-2)"),
  strengths: z.array(z.string()).describe("Specific creative strengths observed from evidence"),
  confidence: z.number().min(0).max(1).describe("Model confidence score between 0.0 and 1.0"),
  evidenceSummary: z.string().describe("Observed evidence notes for platform reviewer audit"),
  // Note: AI analysis must be evidence for decision-making and must NOT automatically verify a skill
  requiresHumanReview: z.boolean().default(true),
});

export type PortfolioAnalysisOutput = z.infer<typeof PortfolioAnalysisOutputSchema>;

// ==========================================
// 2. CAMPAIGN BRIEF ANALYSIS SCHEMAS
// ==========================================

export const CampaignAnalysisInputSchema = z.object({
  brief: z.string().min(10, "Natural language campaign brief must be at least 10 characters"),
});

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
  campaignRequirements: z.array(z.string()).describe("Summary of non-negotiable criteria"),
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
