"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCreatorProfile } from "@/lib/supabase/auth-helpers";
import {
  updateCreatorProfileSchema,
  claimSkillSchema,
  createPortfolioProjectSchema,
  updatePortfolioProjectSchema,
  submitSkillTestSchema,
  respondMatchSchema,
} from "@/lib/validations";

export type ActionResult<T = any> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

/**
 * Update the authenticated creator's profile.
 * Protected by RLS: user_id = auth.uid()
 */
export async function updateCreatorProfileAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const validated = updateCreatorProfileSchema.parse(rawInput);
    const { profile } = await getCurrentCreatorProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("creator_profiles")
      .update({
        name: validated.name,
        bio: validated.bio,
        experience_years: validated.experience_years,
        experience_level: validated.experience_level,
        availability: validated.availability,
        hourly_rate: validated.hourly_rate,
        min_budget: validated.min_budget,
        max_budget: validated.max_budget,
        ai_tools: validated.ai_tools,
        platforms: validated.platforms,
        category: validated.category,
        location: validated.location,
      })
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/creator/profile");
    revalidatePath("/creator/dashboard");
    return { success: true, data, message: "Profile updated successfully." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update profile." };
  }
}

/**
 * Claim a skill or add portfolio evidence to an existing skill.
 */
export async function claimSkillAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = claimSkillSchema.parse(rawInput);
    const { profile } = await getCurrentCreatorProfile();
    const supabase = await createClient();

    const status = validated.evidence_url ? "portfolio_evidence" : "claimed";

    const { data, error } = await supabase
      .from("creator_skills")
      .upsert(
        {
          creator_profile_id: profile.id,
          skill_id: validated.skill_id,
          verification_status: status,
          evidence_text: validated.evidence_text || null,
          evidence_url: validated.evidence_url || null,
          score: status === "portfolio_evidence" ? 75.0 : 50.0,
        },
        { onConflict: "creator_profile_id,skill_id" }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/creator/skills");
    revalidatePath("/creator/passport");
    return { success: true, data, message: "Skill registered successfully." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to claim skill." };
  }
}

/**
 * Remove a skill from creator's profile.
 */
export async function removeSkillAction(skillId: string): Promise<ActionResult> {
  try {
    const { profile } = await getCurrentCreatorProfile();
    const supabase = await createClient();

    const { error } = await supabase
      .from("creator_skills")
      .delete()
      .eq("creator_profile_id", profile.id)
      .eq("skill_id", skillId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/creator/skills");
    revalidatePath("/creator/passport");
    return { success: true, data: { deleted: true }, message: "Skill removed." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to remove skill." };
  }
}

/**
 * Create a new portfolio project with media, prompt, and process evidence.
 */
export async function createPortfolioProjectAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const validated = createPortfolioProjectSchema.parse(rawInput);
    const { profile } = await getCurrentCreatorProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("portfolio_projects")
      .insert({
        creator_profile_id: profile.id,
        title: validated.title,
        description: validated.description,
        content_type: validated.content_type,
        tools_used: validated.tools_used,
        media_url: validated.media_url,
        prompt: validated.prompt || null,
        process_evidence: validated.process_evidence || null,
        external_url: validated.external_url || null,
        linked_skill_ids: validated.linked_skill_ids,
        metrics: validated.metrics,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Automatically elevate linked skills to 'portfolio_evidence' if currently 'claimed'
    if (validated.linked_skill_ids.length > 0) {
      for (const skillId of validated.linked_skill_ids) {
        await supabase
          .from("creator_skills")
          .update({
            verification_status: "portfolio_evidence",
            evidence_url: validated.media_url,
            score: 75.0,
          })
          .eq("creator_profile_id", profile.id)
          .eq("skill_id", skillId)
          .eq("verification_status", "claimed");
      }
    }

    revalidatePath("/creator/portfolio");
    revalidatePath("/creator/dashboard");
    return { success: true, data, message: "Portfolio project published." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create project." };
  }
}

/**
 * Update an existing portfolio project.
 */
export async function updatePortfolioProjectAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const validated = updatePortfolioProjectSchema.parse(rawInput);
    const { profile } = await getCurrentCreatorProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("portfolio_projects")
      .update({
        title: validated.title,
        description: validated.description,
        content_type: validated.content_type,
        tools_used: validated.tools_used,
        media_url: validated.media_url,
        prompt: validated.prompt,
        process_evidence: validated.process_evidence,
        external_url: validated.external_url,
        linked_skill_ids: validated.linked_skill_ids,
        metrics: validated.metrics,
      })
      .eq("id", validated.id)
      .eq("creator_profile_id", profile.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/creator/portfolio");
    return { success: true, data, message: "Project updated." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update project." };
  }
}

/**
 * Delete a portfolio project.
 */
export async function deletePortfolioProjectAction(
  projectId: string
): Promise<ActionResult> {
  try {
    const { profile } = await getCurrentCreatorProfile();
    const supabase = await createClient();

    const { error } = await supabase
      .from("portfolio_projects")
      .delete()
      .eq("id", projectId)
      .eq("creator_profile_id", profile.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/creator/portfolio");
    return { success: true, data: { deleted: true }, message: "Project removed." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete project." };
  }
}

/**
 * Submit answers and media proofs for a skill assessment test.
 */
export async function submitSkillTestAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = submitSkillTestSchema.parse(rawInput);
    const { profile } = await getCurrentCreatorProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("test_submissions")
      .insert({
        test_id: validated.test_id,
        creator_profile_id: profile.id,
        answers: validated.answers,
        evidence_media_urls: validated.evidence_media_urls,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/creator/tests");
    revalidatePath("/creator/passport");
    return { success: true, data, message: "Test submitted for evaluation." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to submit test." };
  }
}

/**
 * Accept or decline a campaign invitation/match.
 */
export async function respondToMatchAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = respondMatchSchema.parse(rawInput);
    const { profile } = await getCurrentCreatorProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("matches")
      .update({
        status: validated.action,
        proposal_notes: validated.proposal_notes || null,
      })
      .eq("id", validated.match_id)
      .eq("creator_profile_id", profile.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/creator/dashboard");
    return { success: true, data, message: `Match ${validated.action}.` };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to respond to match." };
  }
}
