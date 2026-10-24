import { z } from "zod";

export const claimSkillSchema = z
  .object({
    skill_id: z.string().uuid("Invalid skill ID").optional(),
    skill_name: z.string().trim().min(2, "Skill name must be at least 2 characters").max(100).optional(),
    category: z.string().trim().min(2).default("AI Creative Discipline"),
    status: z.enum(["claimed", "portfolio_evidence"]).default("claimed"),
    evidence_text: z.string().trim().max(2000, "Evidence text cannot exceed 2000 characters").optional().nullable(),
    evidence_url: z.string().url("Must be a valid URL").optional().nullable(),
  })
  .refine((data) => Boolean(data.skill_id || (data.skill_name && data.skill_name.trim().length >= 2)), {
    message: "Either skill_id or skill_name (at least 2 characters) must be provided",
    path: ["skill_id"],
  });

export type ClaimSkillInput = z.infer<typeof claimSkillSchema>;

export const verifySkillSchema = z.object({
  creator_profile_id: z.string().uuid("Invalid creator profile ID"),
  skill_id: z.string().uuid("Invalid skill ID"),
  verification_status: z.enum([
    "claimed",
    "portfolio_evidence",
    "test_verified",
    "client_verified",
  ]),
  score: z.number().min(0).max(100, "Score must be between 0 and 100"),
  evidence_text: z.string().trim().optional().nullable(),
});

export type VerifySkillInput = z.infer<typeof verifySkillSchema>;

export const createSkillSchema = z.object({
  name: z.string().trim().min(2, "Skill name must be at least 2 characters").max(100),
  category: z.string().trim().min(2, "Category must be specified"),
  description: z.string().trim().max(1000).optional().nullable(),
  weight: z.number().min(0.1).max(5.0).default(1.0),
  is_active: z.boolean().default(true),
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
