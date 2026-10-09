import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";
import { CreatorProfileAnalysisInputSchema } from "@/lib/ai/types";
import { aiLogger } from "@/lib/ai/logger";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if creator profile is incomplete
    if (!body.skills || (Array.isArray(body.skills) && body.skills.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          incomplete: true,
          error:
            "Creator profile is incomplete. Please add your verified skills and at least one portfolio item before generating an AI audit.",
        },
        { status: 422 }
      );
    }

    const validatedInput = CreatorProfileAnalysisInputSchema.parse(body);
    const analysis = await aiService.analyzeCreatorProfile(validatedInput);

    return NextResponse.json({
      success: true,
      data: analysis,
      engine: analysis.engine,
      provider: analysis.provider,
      isFallback: analysis.isFallback,
      fallbackReason: analysis.fallbackReason,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: err.flatten(),
        },
        { status: 400 }
      );
    }

    aiLogger.error("API /api/ai/analyze-creator-profile encountered an error", { error: err });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate AI creator profile analysis. Please try again.",
      },
      { status: 500 }
    );
  }
}
