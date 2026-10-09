import { z } from "zod";

export const campaignBaseSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(4000),
  category: z.string().trim().min(2, "Category is required"),
  target_audience: z.string().trim().max(1000).optional().nullable(),
  required_skills: z.array(z.string().uuid("Invalid skill ID")).default([]),
  content_formats: z.array(z.string().trim().min(1)).default([]),
  budget_min: z.number().min(0, "Minimum budget must be at least 0").default(0),
  budget_max: z.number().min(0, "Maximum budget must be at least 0").default(0),
  status: z.enum(["draft", "active", "in_progress", "completed", "cancelled"]).default("active"),
  deadline: z.string().datetime({ message: "Invalid ISO datetime string" }).optional().nullable(),
});

export const createCampaignSchema = campaignBaseSchema.refine(
  (data) => data.budget_max >= data.budget_min,
  {
    message: "Maximum budget cannot be less than minimum budget",
    path: ["budget_max"],
  }
);

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = campaignBaseSchema.partial().extend({
  id: z.string().uuid("Invalid campaign ID"),
});

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
