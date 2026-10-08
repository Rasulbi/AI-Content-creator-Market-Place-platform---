import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";
import { CampaignAnalysisOutputSchema } from "@/lib/ai/types";
import { aiLogger } from "@/lib/ai/logger";
import { z, ZodError } from "zod";


const ExplainMatchRequestSchema = z.object({
  creatorId: z.string().min(1, "creatorId is required"),
  campaign: CampaignAnalysisOutputSchema,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorId, campaign } = ExplainMatchRequestSchema.parse(body);

    const explanation = await aiService.explainMatch(creatorId, campaign);

    return NextResponse.json({
      success: true,
      data: explanation,
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

    aiLogger.error("API /api/ai/explain-match encountered an error", { error: err });
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during match explanation",
      },
      { status: 500 }
    );
  }
}
