"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrandUser } from "@/lib/supabase/auth-helpers";
import {
  createCampaignSchema,
  updateCampaignSchema,
  inviteCreatorSchema,
  hireCreatorSchema,
  createReviewSchema,
} from "@/lib/validations";
import { ActionResult } from "./creator-actions";
import { interactionService } from "@/lib/recommendations/interaction-service";

/**
 * Create a new marketing campaign.
 * Protected by RLS: brand_id = auth.uid()
 */
export async function createCampaignAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = createCampaignSchema.parse(rawInput);
    const { user } = await getCurrentBrandUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        brand_id: user.id,
        title: validated.title,
        description: validated.description,
        category: validated.category,
        target_audience: validated.target_audience || null,
        required_skills: validated.required_skills,
        content_formats: validated.content_formats,
        budget_min: validated.budget_min,
        budget_max: validated.budget_max,
        status: validated.status,
        deadline: validated.deadline || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/brand/dashboard");
    return { success: true, data, message: "Campaign created successfully." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create campaign." };
  }
}

/**
 * Update an existing campaign.
 */
export async function updateCampaignAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = updateCampaignSchema.parse(rawInput);
    const { user } = await getCurrentBrandUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("campaigns")
      .update({
        title: validated.title,
        description: validated.description,
        category: validated.category,
        target_audience: validated.target_audience,
        required_skills: validated.required_skills,
        content_formats: validated.content_formats,
        budget_min: validated.budget_min,
        budget_max: validated.budget_max,
        status: validated.status,
        deadline: validated.deadline,
      })
      .eq("id", validated.id)
      .eq("brand_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/brand/dashboard");
    return { success: true, data, message: "Campaign updated." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update campaign." };
  }
}

/**
 * Delete a campaign.
 */
export async function deleteCampaignAction(campaignId: string): Promise<ActionResult> {
  try {
    const { user } = await getCurrentBrandUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("brand_id", user.id)
      .select("id");

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: "Campaign not found or you do not have permission to delete it.",
      };
    }

    revalidatePath("/brand/dashboard");
    return { success: true, data: { deleted: true, id: campaignId }, message: "Campaign removed." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete campaign." };
  }
}

/**
 * Invite a creator to a campaign.
 */
export async function inviteCreatorAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = inviteCreatorSchema.parse(rawInput);
    const { user } = await getCurrentBrandUser();
    const supabase = await createClient();

    // Verify campaign belongs to authenticated brand
    const { data: campaign, error: cError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", validated.campaign_id)
      .eq("brand_id", user.id)
      .single();

    if (cError || !campaign) {
      return { success: false, error: "Campaign not found or unauthorized. Only campaign owners can send invitations." };
    }

    // Resolve creator profile ID if provided as slug
    let resolvedProfileId = validated.creator_profile_id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(validated.creator_profile_id);

    if (!isUuid) {
      const { data: cp } = await supabase
        .from("creator_profiles")
        .select("id")
        .eq("slug", validated.creator_profile_id)
        .maybeSingle();

      if (cp) {
        resolvedProfileId = cp.id;
      } else {
        return {
          success: false,
          error: `Creator profile '${validated.creator_profile_id}' is a showcase profile and is not yet registered in the database. Only registered creators with an active Supabase profile can receive live campaign invitations.`,
        };
      }
    }

    // Verify creator profile exists in database
    const { data: targetCreator, error: targetError } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("id", resolvedProfileId)
      .maybeSingle();

    if (targetError || !targetCreator) {
      return {
        success: false,
        error: "Target creator profile is not registered in the database. Only registered creators can receive live campaign invitations.",
      };
    }

    // Check existing match: do not regress 'accepted' or 'hired' states
    const { data: existingMatch } = await supabase
      .from("matches")
      .select("id, status, proposal_notes")
      .eq("campaign_id", validated.campaign_id)
      .eq("creator_profile_id", resolvedProfileId)
      .maybeSingle();

    if (existingMatch) {
      if (existingMatch.status === "accepted") {
        return {
          success: false,
          error: "This creator has already accepted your invitation for this campaign. You can now finalize hiring in your brand dashboard.",
        };
      }
      if (existingMatch.status === "hired") {
        return {
          success: false,
          error: "This creator is already hired for this campaign.",
        };
      }
    }

    const { data, error } = await supabase
      .from("matches")
      .upsert(
        {
          campaign_id: validated.campaign_id,
          creator_profile_id: resolvedProfileId,
          match_score: 90.0,
          status: "invited",
          proposal_notes: validated.proposal_notes || existingMatch?.proposal_notes || null,
        },
        { onConflict: "campaign_id,creator_profile_id" }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Record interaction event for ML ranking pipeline
    interactionService
      .recordAction(user.id, {
        campaignId: validated.campaign_id,
        creatorProfileId: resolvedProfileId,
        action: "invite",
        metadata: { proposal_notes: validated.proposal_notes || null },
      })
      .catch(() => {});

    revalidatePath("/brand/dashboard");
    revalidatePath("/creator/dashboard");
    return { success: true, data, message: "Invitation sent to creator." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to invite creator." };
  }
}

/**
 * Hire a creator for a campaign.
 * Guarded: Only 'accepted' matches can be hired.
 */
export async function hireCreatorAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = hireCreatorSchema.parse(rawInput);
    const { user } = await getCurrentBrandUser();
    const supabase = await createClient();

    // Fetch match with campaign details and verify brand ownership
    const { data: match, error: mError } = await supabase
      .from("matches")
      .select("id, status, campaign_id, creator_profile_id, campaigns!inner(brand_id)")
      .eq("id", validated.match_id)
      .single();

    if (mError || !match || (match as any).campaigns.brand_id !== user.id) {
      return { success: false, error: "Match not found or unauthorized." };
    }

    if (match.status !== "accepted") {
      return {
        success: false,
        error: `Cannot hire creator: invitation is in '${match.status}' status. Creator must accept the collaboration invitation before you can hire them.`,
      };
    }

    const { data, error } = await supabase
      .from("matches")
      .update({ status: "hired" })
      .eq("id", validated.match_id)
      .eq("status", "accepted") // Concurrency guard
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Update campaign status to 'in_progress'
    await supabase
      .from("campaigns")
      .update({ status: "in_progress" })
      .eq("id", match.campaign_id);

    // Record interaction event for ML ranking pipeline
    interactionService
      .recordAction(user.id, {
        campaignId: match.campaign_id,
        creatorProfileId: (match as any).creator_profile_id,
        action: "hire",
        metadata: { match_id: validated.match_id },
      })
      .catch(() => {});

    revalidatePath("/brand/dashboard");
    revalidatePath("/creator/dashboard");
    return { success: true, data, message: "Creator successfully hired." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to hire creator." };
  }
}

/**
 * Submit a post-collaboration review and verify creator skills ('client_verified').
 */
export async function createReviewAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = createReviewSchema.parse(rawInput);
    const { user } = await getCurrentBrandUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        campaign_id: validated.campaign_id,
        brand_id: user.id,
        creator_profile_id: validated.creator_profile_id,
        rating: validated.rating,
        review_text: validated.review_text,
        verified_skills: validated.verified_skills,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Record interaction event for ML ranking pipeline
    interactionService
      .recordAction(user.id, {
        campaignId: validated.campaign_id,
        creatorProfileId: validated.creator_profile_id,
        action: "campaign_completed",
        metadata: { rating: validated.rating },
      })
      .catch(() => {});

    revalidatePath("/brand/dashboard");
    revalidatePath(`/creators/${validated.creator_profile_id}`);
    return { success: true, data, message: "Review and skill verification published." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to submit review." };
  }
}

/**
 * Retrieve all sent invitations and matches for the authenticated brand's campaigns.
 */
export async function getBrandCampaignMatchesAction(): Promise<ActionResult> {
  try {
    const { user } = await getCurrentBrandUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("matches")
      .select(`
        id,
        campaign_id,
        creator_profile_id,
        match_score,
        status,
        proposal_notes,
        created_at,
        updated_at,
        campaigns!inner(
          id,
          brand_id,
          title,
          category,
          budget_min,
          budget_max,
          status
        ),
        creator_profiles(
          id,
          name,
          slug,
          category,
          experience_level,
          passport_score,
          is_verified
        )
      `)
      .eq("campaigns.brand_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch brand campaign matches." };
  }
}
