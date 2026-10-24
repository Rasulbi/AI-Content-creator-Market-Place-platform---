"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentCreatorProfile } from "@/lib/supabase/auth-helpers";
import {
  updateCreatorProfileSchema,
  claimSkillSchema,
  createPortfolioProjectSchema,
  updatePortfolioProjectSchema,
  submitSkillTestSchema,
  respondMatchSchema,
} from "@/lib/validations";
import { SKILL_TESTS_CATALOG } from "@/lib/skill-passport-store";
import { getAuthoritativeSkillTest } from "@/lib/server/skill-tests-data";
import { evaluateSkillTest } from "@/app/api/v1/tests/submissions/route";
import crypto from "crypto";
import { interactionService } from "@/lib/recommendations/interaction-service";

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

    let skillId = validated.skill_id;

    if (!skillId && validated.skill_name) {
      const { data: existingSkill } = await supabase
        .from("skills")
        .select("id")
        .ilike("name", validated.skill_name.trim())
        .maybeSingle();

      if (existingSkill) {
        skillId = existingSkill.id;
      } else {
        const { data: newSkill, error: createSkillErr } = await supabase
          .from("skills")
          .insert({
            name: validated.skill_name.trim(),
            category: validated.category,
            description: `AI skill in ${validated.category}`,
            weight: 1.0,
            is_active: true,
          })
          .select()
          .single();

        if (createSkillErr) {
          return { success: false, error: createSkillErr.message };
        }
        skillId = newSkill.id;
      }
    }

    if (!skillId) {
      return { success: false, error: "Either skill_id or skill_name must be provided." };
    }

    // Check if skill already exists for this creator to prevent regressing verified status or score
    const { data: existingSkillRow } = await supabase
      .from("creator_skills")
      .select("id, verification_status, score")
      .eq("creator_profile_id", profile.id)
      .eq("skill_id", skillId)
      .maybeSingle();

    const isAlreadyVerified =
      existingSkillRow?.verification_status === "test_verified" ||
      existingSkillRow?.verification_status === "client_verified";

    // If already verified by official assessment or client, strictly preserve verified status and authoritative score
    const targetStatus = isAlreadyVerified
      ? existingSkillRow.verification_status
      : validated.evidence_url
      ? "portfolio_evidence"
      : "claimed";

    const targetScore = isAlreadyVerified
      ? Number(existingSkillRow.score) || 85.0
      : targetStatus === "portfolio_evidence"
      ? 75.0
      : 50.0;

    const { data, error } = await supabase
      .from("creator_skills")
      .upsert(
        {
          creator_profile_id: profile.id,
          skill_id: skillId,
          verification_status: targetStatus,
          evidence_text: validated.evidence_text || null,
          evidence_url: validated.evidence_url || null,
          score: targetScore,
        },
        { onConflict: "creator_profile_id,skill_id" }
      )
      .select("*, skills(name, category)")
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

    let targetSkillId: string | null = skillId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(skillId);

    if (!isUuid) {
      const { data: matchedSkill } = await supabase
        .from("skills")
        .select("id")
        .ilike("name", skillId.trim())
        .maybeSingle();

      if (matchedSkill) {
        targetSkillId = matchedSkill.id;
      } else {
        return { success: true, data: { deleted: true }, message: "Skill removed." };
      }
    }

    const { error } = await supabase
      .from("creator_skills")
      .delete()
      .eq("creator_profile_id", profile.id)
      .eq("skill_id", targetSkillId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/creator/skills");
    revalidatePath("/creator/passport");
    revalidatePath("/creator/profile");
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

    let resolvedTestId: string = validated.test_id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(validated.test_id);

    let testQuestions: any[] = [];
    let passingScore = 80;
    let skillIdForElevation: string | null = null;

    if (!isUuid) {
      const catalogItem = SKILL_TESTS_CATALOG.find((t) => t.id === validated.test_id);
      if (!catalogItem) {
        return {
          success: false,
          error: `Invalid test ID or unknown catalog slug: ${validated.test_id}`,
        };
      }

      const authoritativeCatalog = getAuthoritativeSkillTest(validated.test_id);
      testQuestions = authoritativeCatalog?.questions || catalogItem.questions || [];
      passingScore = authoritativeCatalog?.passingScore ?? catalogItem.passingScore ?? 80;

      // Check if skill_test exists with this title
      const { data: existingTest } = await supabase
        .from("skill_tests")
        .select("id, skill_id")
        .eq("title", catalogItem.title)
        .maybeSingle();

      if (existingTest) {
        resolvedTestId = existingTest.id;
        skillIdForElevation = existingTest.skill_id;
      } else {
        // Ensure skill exists
        let skillId: string | null = null;
        const { data: existingSkill } = await supabase
          .from("skills")
          .select("id")
          .ilike("name", catalogItem.associatedSkill)
          .maybeSingle();

        if (existingSkill) {
          skillId = existingSkill.id;
        } else {
          const { data: newSkill } = await supabase
            .from("skills")
            .insert({
              name: catalogItem.associatedSkill,
              category: catalogItem.category,
              description: `Standardized skill for ${catalogItem.associatedSkill}`,
              weight: 1.0,
              is_active: true,
            })
            .select()
            .single();
          skillId = newSkill?.id || null;
        }

        if (skillId) {
          skillIdForElevation = skillId;
          const { data: createdTest } = await supabase
            .from("skill_tests")
            .insert({
              skill_id: skillId,
              title: catalogItem.title,
              description: catalogItem.description,
              difficulty: catalogItem.difficulty.toLowerCase() === "master" ? "expert" : "intermediate",
              passing_score: catalogItem.passingScore,
              duration_minutes: catalogItem.durationMinutes,
              questions: (catalogItem.questions || []) as any,
              rubric: {},
            })
            .select()
            .single();
          if (createdTest) {
            resolvedTestId = createdTest.id;
          }
        }
      }
    } else {
      const { data: dbTest } = await supabase
        .from("skill_tests")
        .select("questions, passing_score, skill_id")
        .eq("id", resolvedTestId)
        .maybeSingle();
      if (dbTest) {
        testQuestions = (dbTest.questions as any[]) || [];
        passingScore = Number(dbTest.passing_score) || 80;
        skillIdForElevation = dbTest.skill_id;
      }
    }

    const evaluation = evaluateSkillTest({
      questions: testQuestions,
      passingScore,
      answers: validated.answers,
      userPrompt: validated.user_prompt,
      userWorkflowNotes: validated.user_workflow_notes,
    });

    const testSlug = (validated.test_id || resolvedTestId).substring(0, 4).toUpperCase();
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    const certId = evaluation.passed ? `CERT-AI-${testSlug}-${randomHex}` : null;

    const answersPayload = {
      ...(validated.answers || {}),
      ...(certId
        ? {
            __certificate: {
              certificateId: certId,
              issuedAt: new Date().toISOString(),
              score: evaluation.authoritativeScore,
              testTitle: "Standardized AI Skill Benchmark",
            },
          }
        : {}),
    };

    const { data, error } = await supabase
      .from("test_submissions")
      .insert({
        test_id: resolvedTestId,
        creator_profile_id: profile.id,
        answers: answersPayload,
        evidence_media_urls: validated.evidence_media_urls,
        score: evaluation.authoritativeScore,
        status: evaluation.status,
        feedback: evaluation.feedback,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (evaluation.passed && skillIdForElevation) {
      const adminSupabase = createAdminClient();
      await adminSupabase.from("creator_skills").upsert(
        {
          creator_profile_id: profile.id,
          skill_id: skillIdForElevation,
          verification_status: "test_verified",
          score: evaluation.authoritativeScore,
          verified_at: new Date().toISOString(),
          evidence_text: `Official Assessment Passed (${evaluation.authoritativeScore}%). Certificate: ${certId}`,
        },
        { onConflict: "creator_profile_id,skill_id" }
      );
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

    // Fetch existing match to verify ownership and ensure valid state transition
    const { data: existingMatch, error: fetchError } = await supabase
      .from("matches")
      .select("id, status, proposal_notes, campaign_id, campaigns!inner(brand_id)")
      .eq("id", validated.match_id)
      .eq("creator_profile_id", profile.id)
      .maybeSingle();

    if (fetchError || !existingMatch) {
      return { success: false, error: "Invitation not found or unauthorized." };
    }

    if (existingMatch.status !== "invited") {
      return {
        success: false,
        error: `Cannot ${validated.action} invitation: current status is '${existingMatch.status}'. Only pending invitations ('invited') can be accepted or declined.`,
      };
    }

    // Preserve existing proposal_notes unless the caller explicitly supplies a replacement
    const updatePayload: { status: "accepted" | "declined"; proposal_notes?: string | null } = {
      status: validated.action,
    };

    if (validated.proposal_notes !== undefined) {
      updatePayload.proposal_notes = validated.proposal_notes;
    }

    const { data, error } = await supabase
      .from("matches")
      .update(updatePayload)
      .eq("id", validated.match_id)
      .eq("creator_profile_id", profile.id)
      .eq("status", "invited") // Concurrency guard
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Record interaction event for ML ranking pipeline
    if ((existingMatch as any)?.campaigns?.brand_id) {
      interactionService
        .recordAction((existingMatch as any).campaigns.brand_id, {
          campaignId: (existingMatch as any).campaign_id,
          creatorProfileId: profile.id,
          action: validated.action === "accepted" ? "creator_accepted" : "creator_declined",
          metadata: { match_id: validated.match_id },
        })
        .catch(() => {});
    }

    revalidatePath("/creator/dashboard");
    revalidatePath("/brand/dashboard");
    return { success: true, data, message: `Match ${validated.action}.` };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to respond to match." };
  }
}

/**
 * Retrieve incoming campaign matches / invitations for authenticated creator.
 */
export async function getCreatorMatchesAction(): Promise<ActionResult> {
  try {
    const { profile } = await getCurrentCreatorProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("matches")
      .select(`
        id,
        status,
        match_score,
        proposal_notes,
        created_at,
        campaigns(
          id,
          title,
          description,
          category,
          budget_min,
          budget_max,
          content_formats
        )
      `)
      .eq("creator_profile_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch matches." };
  }
}
