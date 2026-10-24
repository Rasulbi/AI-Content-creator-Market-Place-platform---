"use server";

import { aiService } from "@/lib/ai/ai-service";
import {
  PortfolioAnalysisInputSchema,
  PortfolioAnalysisOutput,
  CampaignAnalysisInputSchema,
  CampaignAnalysisOutput,
  MatchExplanation,
  CampaignAnalysisOutputSchema,
} from "@/lib/ai/types";
import { z } from "zod";

export type ActionResult<T = any> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; details?: any };

/**
 * Server Action: Analyze a portfolio submission using the AI layer.
 * 
 * CRITICAL RULE:
 * AI analysis provides structured evidence for human decision-makers
 * and does NOT automatically verify a skill.
 */
export async function analyzePortfolioAction(
  rawInput: unknown
): Promise<ActionResult<PortfolioAnalysisOutput>> {
  try {
    const validated = PortfolioAnalysisInputSchema.parse(rawInput);
    const result = await aiService.analyzePortfolio(validated);
    return {
      success: true,
      data: result,
      message: "Portfolio analyzed successfully. Ready for moderator review.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to analyze portfolio",
      details: err?.errors || null,
    };
  }
}

/**
 * Server Action: Analyze a natural language campaign brief.
 * Extracts content types, required skills, AI tools, audience, budget, deadline, and deliverables.
 */
export async function analyzeCampaignAction(
  rawInput: unknown
): Promise<ActionResult<CampaignAnalysisOutput>> {
  try {
    const validated = CampaignAnalysisInputSchema.parse(rawInput);
    const result = await aiService.analyzeCampaign(validated);
    return {
      success: true,
      data: result,
      message: "Campaign brief parsed successfully.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to analyze campaign brief",
      details: err?.errors || null,
    };
  }
}

/**
 * Server Action: Find creator matches using MVP weighted model:
 * - Skill Match: 40%
 * - Verification: 25%
 * - Portfolio: 15%
 * - Experience: 10%
 * - Client Rating: 10%
 */
export async function findMatchesAction(
  rawInput: unknown
): Promise<ActionResult<MatchExplanation[]>> {
  try {
    // Accepts either parsed CampaignAnalysisOutput or a raw brief string/object
    let campaign: CampaignAnalysisOutput;
    if (typeof rawInput === "string" || (typeof rawInput === "object" && rawInput !== null && "brief" in rawInput)) {
      const briefInput = CampaignAnalysisInputSchema.parse(rawInput);
      campaign = await aiService.analyzeCampaign(briefInput);
    } else {
      campaign = CampaignAnalysisOutputSchema.parse(rawInput);
    }

    const matches = await aiService.findMatches(campaign);
    return {
      success: true,
      data: matches,
      message: `Calculated match rankings for ${matches.length} creators.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to find creator matches",
      details: err?.errors || null,
    };
  }
}

const ExplainMatchActionSchema = z.object({
  creatorId: z.string().min(1, "creatorId is required"),
  campaign: z.union([CampaignAnalysisOutputSchema, z.string(), z.object({ brief: z.string() })]),
});

/**
 * Server Action: Explain why a specific creator matches a campaign.
 * Returns detailed, evidence-based reasons:
 * - AI Video: 91/100
 * - Product Advertising: 94/100
 * - 14 verified projects
 * - Similar campaign experience
 * - Within budget
 */
export async function explainMatchAction(
  rawInput: unknown
): Promise<ActionResult<MatchExplanation>> {
  try {
    const { creatorId, campaign } = ExplainMatchActionSchema.parse(rawInput);
    const explanation = await aiService.explainMatch(creatorId, campaign);
    return {
      success: true,
      data: explanation,
      message: `Generated explainable match evaluation for creator ${creatorId}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to explain creator match",
      details: err?.errors || null,
    };
  }
}

// =============================================================================
// DATABASE PERSISTENCE: SAVED AI CONTENT & VERIFICATION AUDITS
// =============================================================================

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth-helpers";
import { revalidatePath } from "next/cache";

// Global fallback in-memory store for demo / offline sessions
const globalMemoryStore = globalThis as unknown as {
  __SAVED_AI_CONTENT__?: Map<string, any[]>;
  __CAMPAIGN_VERIFICATIONS__?: Map<string, any[]>;
};
if (!globalMemoryStore.__SAVED_AI_CONTENT__) {
  globalMemoryStore.__SAVED_AI_CONTENT__ = new Map();
}
if (!globalMemoryStore.__CAMPAIGN_VERIFICATIONS__) {
  globalMemoryStore.__CAMPAIGN_VERIFICATIONS__ = new Map();
}

const SaveAIContentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  concept: z.string().min(1, "Concept is required"),
  hook: z.string().min(1, "Hook is required"),
  caption: z.string().min(1, "Caption is required"),
  hashtags: z.array(z.string()).default([]),
  callToAction: z.string().min(1, "Call to action is required"),
  videoScriptOutline: z.any().optional(),
  niche: z.string().default("General"),
  platform: z.string().default("Instagram Reels"),
  contentGoal: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * Persists a generated AI content concept, viral hook, or script to the database.
 */
export async function saveAIContentAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = SaveAIContentSchema.parse(rawInput);
    const auth = await getAuthenticatedUser();

    if (isSupabaseConfigured()) {
      if (!auth?.user?.id) {
        return { success: false, error: "Please log in to save AI content to your personal database collection." };
      }

      const userId = auth.user.id;
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("saved_ai_content")
        .insert({
          user_id: userId,
          title: validated.title,
          concept: validated.concept,
          hook: validated.hook,
          caption: validated.caption,
          hashtags: validated.hashtags,
          call_to_action: validated.callToAction,
          video_script_outline: validated.videoScriptOutline || [],
          niche: validated.niche,
          platform: validated.platform,
          content_goal: validated.contentGoal || null,
          is_favorite: true,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      revalidatePath("/creator/dashboard");
      return { success: true, data, message: "Saved to database successfully." };
    }

    // In-memory server-side fallback when Supabase is not yet connected
    const userId = validated.userId || "usr_demo_user";
    const fallbackItem = {
      id: `ai-cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      title: validated.title,
      concept: validated.concept,
      hook: validated.hook,
      caption: validated.caption,
      hashtags: validated.hashtags,
      call_to_action: validated.callToAction,
      video_script_outline: validated.videoScriptOutline || [],
      niche: validated.niche,
      platform: validated.platform,
      content_goal: validated.contentGoal || null,
      is_favorite: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const currentList = globalMemoryStore.__SAVED_AI_CONTENT__!.get(userId) || [];
    globalMemoryStore.__SAVED_AI_CONTENT__!.set(userId, [fallbackItem, ...currentList]);

    return {
      success: true,
      data: fallbackItem,
      message: "Saved to active session (Supabase not configured).",
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save AI content" };
  }
}

/**
 * Retrieves saved AI content for the current authenticated user.
 */
export async function getSavedAIContentAction(userIdFallback?: string): Promise<ActionResult> {
  try {
    const auth = await getAuthenticatedUser();

    if (isSupabaseConfigured()) {
      if (!auth?.user?.id) {
        return { success: true, data: [] };
      }

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("saved_ai_content")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    }

    const userId = userIdFallback || "usr_demo_user";
    const items = globalMemoryStore.__SAVED_AI_CONTENT__!.get(userId) || [];
    return { success: true, data: items };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to retrieve saved AI content" };
  }
}

/**
 * Deletes a saved AI content record owned by the user.
 */
export async function deleteSavedAIContentAction(id: string, userIdFallback?: string): Promise<ActionResult> {
  try {
    const auth = await getAuthenticatedUser();

    if (isSupabaseConfigured()) {
      if (!auth?.user?.id) {
        return { success: false, error: "Authentication required to delete saved content." };
      }

      const supabase = await createClient();
      const { error } = await supabase
        .from("saved_ai_content")
        .delete()
        .eq("id", id)
        .eq("user_id", auth.user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: { id }, message: "Deleted successfully." };
    }

    const userId = userIdFallback || "usr_demo_user";
    const currentList = globalMemoryStore.__SAVED_AI_CONTENT__!.get(userId) || [];
    const filtered = currentList.filter((item) => item.id !== id);
    globalMemoryStore.__SAVED_AI_CONTENT__!.set(userId, filtered);

    return { success: true, data: { id }, message: "Deleted from session." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete saved content" };
  }
}

const SaveCampaignVerificationSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  productName: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  platform: z.string().default("Instagram"),
  targetAudience: z.string().optional(),
  budget: z.string().optional(),
  deadline: z.string().optional(),
  verificationsCount: z.number().int().default(0),
  verificationsData: z.any(),
  brandId: z.string().optional(),
});

/**
 * Persists an AI Creator Verification audit report for a brand.
 */
export async function saveCampaignVerificationAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = SaveCampaignVerificationSchema.parse(rawInput);
    const auth = await getAuthenticatedUser();
    const brandId = auth?.user?.id || validated.brandId || "usr_brand_001";

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("campaign_verifications")
        .insert({
          brand_id: brandId,
          brand_name: validated.brandName,
          product_name: validated.productName,
          category: validated.category,
          platform: validated.platform,
          target_audience: validated.targetAudience || null,
          budget: validated.budget || null,
          deadline: validated.deadline || null,
          verifications_count: validated.verificationsCount,
          verifications_data: validated.verificationsData,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      revalidatePath("/brand/dashboard");
      return { success: true, data, message: "Verification audit saved to database." };
    }

    const fallbackAudit = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      brand_id: brandId,
      brand_name: validated.brandName,
      product_name: validated.productName,
      category: validated.category,
      platform: validated.platform,
      target_audience: validated.targetAudience || null,
      budget: validated.budget || null,
      deadline: validated.deadline || null,
      verifications_count: validated.verificationsCount,
      verifications_data: validated.verificationsData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const currentList = globalMemoryStore.__CAMPAIGN_VERIFICATIONS__!.get(brandId) || [];
    globalMemoryStore.__CAMPAIGN_VERIFICATIONS__!.set(brandId, [fallbackAudit, ...currentList]);

    return {
      success: true,
      data: fallbackAudit,
      message: "Verification audit saved to session (Supabase not configured).",
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save verification audit" };
  }
}

/**
 * Retrieves past verification audits for a brand owner.
 */
export async function getCampaignVerificationsAction(brandIdFallback?: string): Promise<ActionResult> {
  try {
    const auth = await getAuthenticatedUser();
    const brandId = auth?.user?.id || brandIdFallback || "usr_brand_001";

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("campaign_verifications")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    }

    const list = globalMemoryStore.__CAMPAIGN_VERIFICATIONS__!.get(brandId) || [];
    return { success: true, data: list };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to retrieve verification history" };
  }
}
