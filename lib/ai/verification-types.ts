import { z } from "zod";

export const VerificationStatusEnum = z.enum(["Verified", "Partially Verified", "Not Verified"]);
export type VerificationStatus = z.infer<typeof VerificationStatusEnum>;

export const AccuracyScoreBreakdownSchema = z.object({
  identityAuthenticity: z.number().min(0).max(100).describe("Verified skills, badges, and portfolio catalog evidence (25%)"),
  brandProductRelevance: z.number().min(0).max(100).describe("Previous brand collabs and product category relevance (30%)"),
  audienceNicheRelevance: z.number().min(0).max(100).describe("Category alignment and audience demographic match (25%)"),
  engagementReliability: z.number().min(0).max(100).describe("Authentic engagement rate and follower statistics (10%)"),
  profileCompleteness: z.number().min(0).max(100).describe("Bio, experience, tools, and social profile links (10%)"),
});
export type AccuracyScoreBreakdown = z.infer<typeof AccuracyScoreBreakdownSchema>;

export const CreatorVerificationItemSchema = z.object({
  creatorId: z.string(),
  creatorName: z.string(),
  avatar: z.string(),
  professionalTitle: z.string(),
  category: z.string(),
  location: z.string(),
  primaryPlatform: z.string(),
  socialHandle: z.string(),
  profileUrl: z.string(),
  followers: z.string(),
  followersCount: z.number(),
  engagementRate: z.string(),
  engagementNum: z.number(),
  accuracyScore: z.number().min(0).max(100),
  verificationStatus: VerificationStatusEnum,
  breakdown: AccuracyScoreBreakdownSchema,
  verifiedDetails: z.array(z.string()),
  unverifiedDetails: z.array(z.string()),
  matchExplanation: z.string(),
  evidenceSources: z.array(z.string()),
  verificationTimestamp: z.string(),
  modelUsed: z.string(),
  isAIAssisted: z.boolean().default(true),
  portfolioCount: z.number(),
  clientRating: z.number(),
  reviewsCount: z.number(),
  priceRange: z.string(),
  availability: z.string(),
  verifiedSkills: z.array(z.string()),
  isDemo: z.boolean().default(true),
  demoNotice: z.string().default("Demo Sandbox Profile: Social handles and telemetry are demonstration data. Real-world account verification requires live OAuth API sync."),
  matchScoreLabel: z.string().default("AI Campaign Match Score"),
  authenticityNotice: z.string().default("This AI score measures campaign requirements matching only. Real account authenticity & identity verification requires separate verified evidence (KYC & Live Platform API)."),
});
export type CreatorVerificationItem = z.infer<typeof CreatorVerificationItemSchema>;

export const VerifyCreatorsInputSchema = z.object({
  brandName: z.string().min(2, "Brand name must be at least 2 characters"),
  productName: z.string().min(2, "Product name must be at least 2 characters"),
  category: z.string().min(2, "Target category is required"),
  platform: z.string().min(2, "Target platform is required"),
  targetAudience: z.string().optional().default("General digital consumers (18-35)"),
  contentTypes: z.array(z.string()).optional().default(["Reels", "Product Review"]),
  budget: z.string().optional().default("₹ 20,000 - ₹ 35,000"),
  deadline: z.string().optional().default("2 Weeks"),
  notes: z.string().optional().default(""),
  creators: z.array(z.any()).optional(),
});
export type VerifyCreatorsInput = z.infer<typeof VerifyCreatorsInputSchema>;

export const VerifyCreatorsOutputSchema = z.object({
  verifications: z.array(CreatorVerificationItemSchema),
  verifiedCount: z.number(),
  partiallyVerifiedCount: z.number(),
  notVerifiedCount: z.number(),
  campaignSummary: z.object({
    brandName: z.string(),
    productName: z.string(),
    category: z.string(),
    platform: z.string(),
  }),
  engine: z.enum(["ai_model", "heuristic_fallback"]).default("ai_model"),
  provider: z.string(),
  timestamp: z.string(),
  isAIAssisted: z.boolean().default(true),
});
export type VerifyCreatorsOutput = z.infer<typeof VerifyCreatorsOutputSchema>;
