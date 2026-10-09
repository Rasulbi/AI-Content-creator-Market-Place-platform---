import { z } from "zod";

export const submitSkillTestSchema = z.object({
  test_id: z.string().uuid("Invalid test ID"),
  answers: z.record(z.string(), z.any()),
  evidence_media_urls: z.array(z.string().url("Must be a valid URL")).default([]),
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
