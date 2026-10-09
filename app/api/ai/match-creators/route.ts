import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";
import { CampaignAnalysisOutputSchema } from "@/lib/ai/types";
import { aiLogger } from "@/lib/ai/logger";
import { z, ZodError } from "zod";


const MatchCreatorsRequestSchema = z.object({
  campaign: CampaignAnalysisOutputSchema,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaign } = MatchCreatorsRequestSchema.parse(body);

    const matches = await aiService.findMatches(campaign);

    return NextResponse.json({
      success: true,
      data: matches,
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

    aiLogger.error("API /api/ai/match-creators encountered an error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error during creator matching",
      },
      { status: 500 }
    );
  }
}
