import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase/auth-helpers";
import { aiRateLimiter } from "@/lib/ai/rate-limiter";
import { aiLogger } from "@/lib/ai/logger";
import {
  UnifiedFeedbackRequestSchema,
  UnifiedFeedbackRequest,
} from "@/lib/validations/recommendation-interaction";
import { interactionService } from "@/lib/recommendations/interaction-service";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required to submit recommendation feedback." },
        { status: 401 }
      );
    }

    if (auth.user.role !== "brand" && auth.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only brand accounts can submit recommendation feedback." },
        { status: 403 }
      );
    }

    // Rate limiting: sliding window per brand user
    const clientId = aiRateLimiter.getClientIdentifier(req, auth.user.id);
    const rateCheck = aiRateLimiter.check(clientId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded for recommendation feedback. Please slow down.",
          resetMs: rateCheck.resetMs,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated: UnifiedFeedbackRequest = UnifiedFeedbackRequestSchema.parse(body);

    // 1. Validate Campaign Ownership
    const isOwner = await interactionService.verifyCampaignOwnership(
      validated.campaignId,
      auth.user.id
    );
    if (!isOwner && auth.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Campaign does not belong to your brand account." },
        { status: 403 }
      );
    }

    // 2. Validate Creator Identifier
    const isValidCreator = await interactionService.verifyCreatorIdentifier(
      validated.creatorProfileId
    );
    if (!isValidCreator) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid creator identifier '${validated.creatorProfileId}'. Creator does not exist.`,
        },
        { status: 400 }
      );
    }

    // 3. Record Explicit Feedback if rating provided
    let feedbackResult = null;
    if (validated.feedbackRating) {
      feedbackResult = await interactionService.recordExplicitFeedback(auth.user.id, {
        campaignId: validated.campaignId,
        creatorProfileId: validated.creatorProfileId,
        rating: validated.feedbackRating,
        reasons: validated.reasons || [],
        notes: validated.notes,
      });
    }

    // 4. Record Observed Action if action is not pure feedback placeholder
    let actionResult = null;
    if (validated.action !== "feedback") {
      actionResult = await interactionService.recordAction(auth.user.id, {
        campaignId: validated.campaignId,
        creatorProfileId: validated.creatorProfileId,
        action: validated.action,
        metadata: {
          notes: validated.notes,
          reasons: validated.reasons,
        },
      });
    }

    // 5. If rank & score snapshot are provided, record impression
    if (validated.recommendationRank && validated.finalScore !== undefined) {
      await interactionService.recordImpressions(
        validated.campaignId,
        auth.user.id,
        [
          {
            creatorProfileId: validated.creatorProfileId,
            recommendationRank: validated.recommendationRank,
            featureSnapshot: {
              semanticScore: validated.semanticScore ?? 50,
              ruleScore: validated.ruleScore ?? 50,
              finalScore: validated.finalScore,
              skillOverlapRatio: 0.5,
              verifiedSkillRatio: 0.3,
              budgetCompatibility: 0.8,
              categoryMatch: 1.0,
              experienceYears: 2,
            },
            modelVersion: validated.modelVersion || "hybrid_v1",
          },
        ],
        validated.modelVersion
      );
    }

    // 6. Server-side Outcome Classification (Prevent client forging)
    // Positive labels require authentic hire or explicit 'relevant' rating with action.
    // Negative labels require explicit rejection or 'not_relevant' rating.
    // Views, shortlists, or unresponded invites are strictly 'unlabelled_in_progress'.
    let outcomeClassification: "positive" | "negative" | "unlabelled_in_progress" =
      "unlabelled_in_progress";

    if (
      validated.action === "hire" ||
      validated.action === "campaign_completed" ||
      validated.action === "creator_accepted" ||
      (validated.feedbackRating === "relevant" &&
        (validated.action === "shortlist" || validated.action === "invite"))
    ) {
      outcomeClassification = "positive";
    } else if (
      validated.action === "reject" ||
      validated.action === "creator_declined" ||
      validated.feedbackRating === "not_relevant"
    ) {
      outcomeClassification = "negative";
    }

    aiLogger.info("Recommendation feedback processed successfully:", {
      brandId: auth.user.id,
      campaignId: validated.campaignId,
      creatorProfileId: validated.creatorProfileId,
      action: validated.action,
      feedbackRating: validated.feedbackRating,
      outcomeClassification,
    });

    return NextResponse.json({
      success: true,
      message: "Recommendation interaction logged successfully.",
      data: {
        campaignId: validated.campaignId,
        creatorProfileId: validated.creatorProfileId,
        action: validated.action,
        feedbackRating: validated.feedbackRating || null,
        outcomeClassification,
        persistenceStatus:
          actionResult?.persistenceStatus || feedbackResult?.persistenceStatus || "buffered_pending_migration",
      },
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed for recommendation interaction.",
          details: err.flatten(),
        },
        { status: 400 }
      );
    }

    aiLogger.error("Failed to record recommendation feedback:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to record recommendation interaction.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    if (auth.user.role !== "brand" && auth.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only brand or admin accounts can query recommendation stats." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId") || undefined;
    const brandId = auth.user.role === "admin" ? searchParams.get("brandId") || undefined : auth.user.id;

    const stats = await interactionService.getRecommendationStats(brandId, campaignId);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Failed to retrieve recommendation stats." },
      { status: 500 }
    );
  }
}
