import { z } from "zod";

// ==========================================
// 1. RECOMMENDATION IMPRESSIONS SCHEMA
// ==========================================

export const RecommendationImpressionItemSchema = z.object({
  creatorProfileId: z.string().trim().min(1, "Creator profile identifier is required"),
  recommendationRank: z.number().int().min(1, "Recommendation rank must be >= 1"),
  featureSnapshot: z.object({
    semanticScore: z.number().min(0).max(100),
    ruleScore: z.number().min(0).max(100),
    finalScore: z.number().min(0).max(100),
    skillOverlapRatio: z.number().min(0).max(1).default(0),
    verifiedSkillRatio: z.number().min(0).max(1).default(0),
    budgetCompatibility: z.number().min(0).max(1).default(0),
    categoryMatch: z.number().min(0).max(1).default(0),
    experienceYears: z.number().min(0).default(0),
  }),
  modelVersion: z.string().trim().min(1).default("hybrid_v1"),
});

export type RecommendationImpressionItem = z.infer<typeof RecommendationImpressionItemSchema>;

export const RecordImpressionsInputSchema = z.object({
  campaignId: z.string().uuid("Campaign ID must be a valid UUID"),
  impressions: z
    .array(RecommendationImpressionItemSchema)
    .min(1, "At least one impression is required")
    .max(100, "Maximum 100 impressions per batch"),
  modelVersion: z.string().trim().min(1).default("hybrid_v1"),
});

export type RecordImpressionsInput = z.infer<typeof RecordImpressionsInputSchema>;

// ==========================================
// 2. BEHAVIORAL INTERACTION ACTIONS SCHEMA
// ==========================================

export const ALLOWED_INTERACTION_ACTIONS = [
  "view",
  "shortlist",
  "invite",
  "creator_accepted",
  "creator_declined",
  "hire",
  "reject",
  "campaign_completed",
] as const;

export type InteractionAction = (typeof ALLOWED_INTERACTION_ACTIONS)[number];

export const RecordActionInputSchema = z.object({
  campaignId: z.string().uuid("Campaign ID must be a valid UUID"),
  creatorProfileId: z.string().trim().min(1, "Creator profile identifier is required"),
  action: z.enum(ALLOWED_INTERACTION_ACTIONS),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export type RecordActionInput = z.input<typeof RecordActionInputSchema>;

// ==========================================
// 3. EXPLICIT BRAND FEEDBACK SCHEMA
// ==========================================

export const FEEDBACK_RATINGS = ["relevant", "somewhat_relevant", "not_relevant"] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export const RecordExplicitFeedbackInputSchema = z.object({
  campaignId: z.string().uuid("Campaign ID must be a valid UUID"),
  creatorProfileId: z.string().trim().min(1, "Creator profile identifier is required"),
  rating: z.enum(FEEDBACK_RATINGS),
  reasons: z.array(z.string().trim().max(100)).max(10).optional().default([]),
  notes: z.string().trim().max(1000, "Notes cannot exceed 1000 characters").optional(),
});

export type RecordExplicitFeedbackInput = z.input<typeof RecordExplicitFeedbackInputSchema>;

// ==========================================
// 4. UNIFIED FEEDBACK REQUEST SCHEMA (BACKWARD COMPATIBLE)
// ==========================================

export const UnifiedFeedbackRequestSchema = z.object({
  campaignId: z.string().uuid("Valid campaign UUID is required"),
  creatorProfileId: z.string().trim().min(1, "Creator profile ID is required"),
  action: z.enum([
    "view",
    "shortlist",
    "invite",
    "creator_accepted",
    "creator_declined",
    "hire",
    "reject",
    "campaign_completed",
    "feedback",
  ]),
  feedbackRating: z.enum(["relevant", "somewhat_relevant", "not_relevant"]).optional(),
  reasons: z.array(z.string().trim()).optional().default([]),
  notes: z.string().trim().max(1000).optional(),
  recommendationRank: z.number().int().min(1).optional(),
  semanticScore: z.number().min(0).max(100).optional(),
  ruleScore: z.number().min(0).max(100).optional(),
  finalScore: z.number().min(0).max(100).optional(),
  modelVersion: z.string().optional().default("hybrid_v1"),
});

export type UnifiedFeedbackRequest = z.infer<typeof UnifiedFeedbackRequestSchema>;
