import { z } from "zod";
import { SKILL_TESTS_CATALOG } from "@/lib/skill-passport-store";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidTestIdentifier = (val: string): boolean => {
  if (typeof val !== "string" || !val.trim()) return false;
  if (UUID_REGEX.test(val)) return true;
  return SKILL_TESTS_CATALOG.some((t) => t.id === val);
};

export const submitSkillTestSchema = z.object({
  test_id: z.string().refine(isValidTestIdentifier, {
    message: "Invalid test ID or unknown catalog slug",
  }),
  answers: z.record(z.string(), z.any()).default({}),
  evidence_media_urls: z.array(z.string().url("Must be a valid URL")).default([]),
  score: z.number().min(0).max(100).optional().nullable(),
  status: z.enum(["passed", "failed", "pending"]).optional(),
  feedback: z.string().max(2000).optional().nullable(),
  user_prompt: z.string().max(4000).optional().nullable(),
  user_workflow_notes: z.string().max(4000).optional().nullable(),
});

export type SubmitSkillTestInput = z.infer<typeof submitSkillTestSchema>;

export const evaluateTestSubmissionSchema = z.object({
  submission_id: z.string().uuid("Invalid submission ID"),
  score: z.number().min(0).max(100, "Score must be between 0 and 100"),
  status: z.enum(["passed", "failed"]),
  feedback: z.string().trim().min(5, "Evaluation feedback is required").max(2000),
});

export type EvaluateTestSubmissionInput = z.infer<typeof evaluateTestSubmissionSchema>;

export const createSkillTestSchema = z.object({
  skill_id: z.string().uuid("Invalid skill ID"),
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(2000),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]).default("intermediate"),
  passing_score: z.number().min(50).max(100).default(75),
  duration_minutes: z.number().min(5).max(180).default(45),
  questions: z.array(z.record(z.string(), z.any())).min(1, "At least 1 question is required"),
  rubric: z.record(z.string(), z.any()).default({}),
});

export type CreateSkillTestInput = z.infer<typeof createSkillTestSchema>;
