import { z } from "zod";

export const GenerateCreatorProfileInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  niche: z.string().trim().min(2, "Niche must be at least 2 characters").max(100),
  skills: z.array(z.string().trim().min(1)).min(1, "Please provide at least one skill"),
  experience: z.string().trim().max(1000).optional().default(""),
  portfolioLinks: z.array(z.string().trim().url("Invalid portfolio link URL")).optional().default([]),
  contentCategories: z.array(z.string().trim().min(1)).optional().default([]),
  campaignTypes: z.array(z.string().trim().min(1)).optional().default([]),
  workDescription: z.string().trim().max(2000).optional().default(""),
});

export type GenerateCreatorProfileInput = z.input<typeof GenerateCreatorProfileInputSchema>;
export type GenerateCreatorProfileValidated = z.output<typeof GenerateCreatorProfileInputSchema>;

export const GeneratedProfileDraftSchema = z.object({
  professionalHeadline: z.string().trim().min(5).max(120),
  shortIntroduction: z.string().trim().min(10).max(300),
  bio: z.string().trim().min(50).max(2000),
  niche: z.string().trim().min(2).max(100),
  contentCategories: z.array(z.string().trim()),
  skills: z.array(z.string().trim()),
  suggestedTools: z.array(z.string().trim()),
  portfolioDrafts: z.array(
    z.object({
      title: z.string().trim().min(2).max(150),
      description: z.string().trim().min(10).max(1000),
      suggestedContentType: z.string().trim(),
      suggestedTools: z.array(z.string().trim()),
    })
  ),
  completenessSuggestions: z.array(z.string().trim()),
  isDraft: z.literal(true),
  generatedAt: z.string(),
  provider: z.string(),
  isFallback: z.boolean(),
});

export type GeneratedProfileDraft = z.infer<typeof GeneratedProfileDraftSchema>;
