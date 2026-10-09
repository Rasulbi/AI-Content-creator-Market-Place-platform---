import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";
import { ContentSuggestionsInputSchema } from "@/lib/ai/types";
import { aiLogger } from "@/lib/ai/logger";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = ContentSuggestionsInputSchema.parse(body);

    const result = await aiService.generateContentSuggestions(validated);

    return NextResponse.json({
      success: true,
      data: result,
      engine: result.engine,
      provider: result.provider,
      isFallback: result.isFallback,
      fallbackReason: result.fallbackReason,
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

    aiLogger.error("API /api/ai/content-suggestions encountered an error", { error: err });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate AI content suggestions. Please try again.",
      },
      { status: 500 }
    );
  }
}
