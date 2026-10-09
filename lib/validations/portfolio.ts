import { z } from "zod";

export const createPortfolioProjectSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(2500),
  content_type: z.string().trim().min(2, "Content type is required").max(100),
  tools_used: z.array(z.string().trim().min(1)).min(1, "Select at least 1 AI tool"),
  media_url: z.string().url("Valid media URL is required"),
  prompt: z.string().trim().max(3000, "Prompt text cannot exceed 3000 characters").optional().nullable(),
  process_evidence: z.string().trim().max(3000, "Process notes cannot exceed 3000 characters").optional().nullable(),
  external_url: z.string().url("Must be a valid URL").optional().nullable(),
  linked_skill_ids: z.array(z.string().uuid("Invalid skill ID")).default([]),
  metrics: z.record(z.string(), z.any()).default({}),
});

export type CreatePortfolioProjectInput = z.infer<typeof createPortfolioProjectSchema>;

export const updatePortfolioProjectSchema = createPortfolioProjectSchema.partial().extend({
  id: z.string().uuid("Invalid portfolio project ID"),
});

export type UpdatePortfolioProjectInput = z.infer<typeof updatePortfolioProjectSchema>;
