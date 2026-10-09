"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import {
  evaluateTestSubmissionSchema,
  verifySkillSchema,
  createSkillSchema,
  createSkillTestSchema,
} from "@/lib/validations";
import { ActionResult } from "./creator-actions";

/**
 * Grade and evaluate a test submission (Admin / Evaluator only).
 * On passing: automatically upgrades creator's skill status to 'test_verified'
 * and records the benchmark score in the Skill Passport.
 */
export async function evaluateTestSubmissionAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const validated = evaluateTestSubmissionSchema.parse(rawInput);
    const { user } = await requireAdmin();
    const adminSupabase = createAdminClient();

    // 1. Fetch submission and linked test
    const { data: submission, error: sError } = await adminSupabase
      .from("test_submissions")
      .select("id, test_id, creator_profile_id, skill_tests(skill_id)")
      .eq("id", validated.submission_id)
      .single();

    if (sError || !submission) {
      return { success: false, error: "Submission not found." };
    }

    // 2. Update submission evaluation
    const { data: updatedSub, error: uError } = await adminSupabase
      .from("test_submissions")
      .update({
        score: validated.score,
        status: validated.status,
        feedback: validated.feedback,
        evaluated_by: user.id,
        evaluated_at: new Date().toISOString(),
      })
      .eq("id", validated.submission_id)
      .select()
      .single();

    if (uError) {
      return { success: false, error: uError.message };
    }

    // 3. If passed, automatically elevate creator's skill to 'test_verified'
    const skillId = (submission.skill_tests as any)?.skill_id;
    if (validated.status === "passed" && skillId) {
      await adminSupabase.from("creator_skills").upsert(
        {
          creator_profile_id: submission.creator_profile_id,
          skill_id: skillId,
          verification_status: "test_verified",
          score: validated.score,
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        },
        { onConflict: "creator_profile_id,skill_id" }
      );

      // Recalculate creator's overall passport score
      const { data: allSkills } = await adminSupabase
        .from("creator_skills")
        .select("score, verification_status")
        .eq("creator_profile_id", submission.creator_profile_id);

      if (allSkills && allSkills.length > 0) {
        const avgScore =
          allSkills.reduce((acc, curr) => acc + Number(curr.score), 0) /
          allSkills.length;
        await adminSupabase
          .from("creator_profiles")
          .update({
            passport_score: Math.round(avgScore * 10) / 10,
            is_verified: true,
          })
          .eq("id", submission.creator_profile_id);
      }
    }

    revalidatePath("/creator/passport");
    revalidatePath("/creator/tests");
    return {
      success: true,
      data: updatedSub,
      message: `Submission evaluated as ${validated.status}.`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to evaluate submission." };
  }
}

/**
 * Manually verify or adjust a creator's skill status and score (Admin only).
 */
export async function verifySkillAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = verifySkillSchema.parse(rawInput);
    const { user } = await requireAdmin();
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
      .from("creator_skills")
      .upsert(
        {
          creator_profile_id: validated.creator_profile_id,
          skill_id: validated.skill_id,
          verification_status: validated.verification_status,
          score: validated.score,
          evidence_text: validated.evidence_text || null,
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        },
        { onConflict: "creator_profile_id,skill_id" }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/creators/${validated.creator_profile_id}`);
    return { success: true, data, message: "Skill verification saved." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to verify skill." };
  }
}

/**
 * Create a new canonical skill in the platform skills catalog (Admin only).
 */
export async function createSkillAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = createSkillSchema.parse(rawInput);
    await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("skills")
      .insert({
        name: validated.name,
        category: validated.category,
        description: validated.description || null,
        weight: validated.weight,
        is_active: validated.is_active,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data, message: "Skill added to catalog." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create skill." };
  }
}

/**
 * Create a new benchmark skill test (Admin only).
 */
export async function createSkillTestAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = createSkillTestSchema.parse(rawInput);
    await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("skill_tests")
      .insert({
        skill_id: validated.skill_id,
        title: validated.title,
        description: validated.description,
        difficulty: validated.difficulty,
        passing_score: validated.passing_score,
        duration_minutes: validated.duration_minutes,
        questions: validated.questions,
        rubric: validated.rubric,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data, message: "Benchmark skill test published." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create skill test." };
  }
}
