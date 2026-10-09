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

    revalidatePath("/brand/campaigns");
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

    revalidatePath(`/brand/campaigns/${validated.id}`);
    revalidatePath("/brand/campaigns");
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

    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("brand_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/brand/campaigns");
    return { success: true, data: { deleted: true }, message: "Campaign removed." };
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

    // Verify campaign belongs to brand
    const { data: campaign, error: cError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", validated.campaign_id)
      .eq("brand_id", user.id)
      .single();

    if (cError || !campaign) {
      return { success: false, error: "Campaign not found or unauthorized." };
    }

    const { data, error } = await supabase
      .from("matches")
      .upsert(
        {
          campaign_id: validated.campaign_id,
          creator_profile_id: validated.creator_profile_id,
          match_score: 90.0,
          status: "invited",
          proposal_notes: validated.proposal_notes || null,
        },
        { onConflict: "campaign_id,creator_profile_id" }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/brand/campaigns/${validated.campaign_id}`);
    return { success: true, data, message: "Invitation sent to creator." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to invite creator." };
  }
}

/**
 * Hire a creator for a campaign.
 */
export async function hireCreatorAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = hireCreatorSchema.parse(rawInput);
    const { user } = await getCurrentBrandUser();
    const supabase = await createClient();

    // Fetch match with campaign details
    const { data: match, error: mError } = await supabase
      .from("matches")
      .select("id, campaign_id, campaigns!inner(brand_id)")
      .eq("id", validated.match_id)
      .single();

    if (mError || !match || (match as any).campaigns.brand_id !== user.id) {
      return { success: false, error: "Match not found or unauthorized." };
    }

    const { data, error } = await supabase
      .from("matches")
      .update({ status: "hired" })
      .eq("id", validated.match_id)
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

    revalidatePath(`/brand/campaigns/${match.campaign_id}`);
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

    revalidatePath(`/creators/${validated.creator_profile_id}`);
    return { success: true, data, message: "Review and skill verification published." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to submit review." };
  }
}
