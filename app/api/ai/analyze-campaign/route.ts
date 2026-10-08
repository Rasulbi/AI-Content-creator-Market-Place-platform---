import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";
import { CampaignAnalysisInputSchema } from "@/lib/ai/types";
import { aiLogger } from "@/lib/ai/logger";
import { ZodError } from "zod";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedInput = CampaignAnalysisInputSchema.parse(body);

    const result = await aiService.analyzeCampaign(validatedInput);

    return NextResponse.json({
      success: true,
      data: result,
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

    aiLogger.error("API /api/ai/analyze-campaign encountered an error", { error: err });
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during campaign brief analysis",
      },
      { status: 500 }
    );
  }
}
