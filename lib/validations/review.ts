import { z } from "zod";

export const createReviewSchema = z.object({
  campaign_id: z.string().uuid("Invalid campaign ID"),
  creator_profile_id: z.string().uuid("Invalid creator profile ID"),
  rating: z.number().min(1.0).max(5.0, "Rating must be between 1.0 and 5.0"),
  review_text: z.string().trim().min(10, "Review must be at least 10 characters").max(2000),
  verified_skills: z.array(z.string().uuid("Invalid skill ID")).default([]),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
