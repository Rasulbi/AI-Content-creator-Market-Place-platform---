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
