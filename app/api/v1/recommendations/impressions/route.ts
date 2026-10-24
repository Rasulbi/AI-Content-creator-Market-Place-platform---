import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase/auth-helpers";
import { aiRateLimiter } from "@/lib/ai/rate-limiter";
import { aiLogger } from "@/lib/ai/logger";
import { RecordImpressionsInputSchema } from "@/lib/validations/recommendation-interaction";
import { interactionService } from "@/lib/recommendations/interaction-service";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required to log recommendation impressions." },
        { status: 401 }
      );
    }

    if (auth.user.role !== "brand" && auth.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only brand accounts can log recommendation impressions." },
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
          error: "Rate limit exceeded for impression logging.",
          resetMs: rateCheck.resetMs,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated = RecordImpressionsInputSchema.parse(body);

    // 1. Verify Campaign Ownership
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

    // 2. Filter & validate creator IDs
    const validImpressions = [];
    for (const item of validated.impressions) {
      const isValid = await interactionService.verifyCreatorIdentifier(item.creatorProfileId);
      if (isValid) {
        validImpressions.push(item);
      }
    }

    if (validImpressions.length === 0) {
      return NextResponse.json(
        { success: false, error: "None of the provided creator profile identifiers are valid." },
        { status: 400 }
      );
    }

    // 3. Record Impressions Batch
    const result = await interactionService.recordImpressions(
      validated.campaignId,
      auth.user.id,
      validImpressions,
      validated.modelVersion
    );

    return NextResponse.json({
      success: true,
      message: "Impressions logged successfully.",
      data: {
        campaignId: validated.campaignId,
        recordedCount: result.recordedCount,
        skippedCount: result.skippedCount,
        persistenceStatus: result.persistenceStatus,
      },
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed for impression batch.",
          details: err.flatten(),
        },
        { status: 400 }
      );
    }

    aiLogger.error("Failed to record recommendation impressions:", err);
    return NextResponse.json(
      { success: false, error: "Failed to record impressions." },
      { status: 500 }
    );
  }
}
