import { z } from "zod";

export const updateCreatorProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  bio: z.string().trim().max(1000, "Bio cannot exceed 1000 characters").optional().nullable(),
  experience_years: z.number().min(0, "Experience years must be positive").max(40).default(0),
  experience_level: z.enum(["junior", "intermediate", "senior", "expert"]).default("intermediate"),
  availability: z.enum(["available", "busy", "unavailable"]).default("available"),
  hourly_rate: z.number().min(0).max(100000).optional().nullable(),
  min_budget: z.number().min(0).default(0),
  max_budget: z.number().min(0).default(0),
  ai_tools: z.array(z.string().trim().min(1)).default([]),
  platforms: z.array(z.string().trim().min(1)).default([]),
  category: z.string().trim().min(2).default("General AI"),
  location: z.string().trim().max(100).optional().nullable(),
}).refine((data) => data.max_budget >= data.min_budget, {
  message: "Maximum budget cannot be less than minimum budget",
  path: ["max_budget"],
});

export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileSchema>;
