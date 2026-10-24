import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";
import { CampaignAnalysisOutputSchema } from "@/lib/ai/types";
import { aiLogger } from "@/lib/ai/logger";
import { z, ZodError } from "zod";
import { getDatabaseCreators } from "@/lib/creators-catalog";
import { matchCreatorsSemantically } from "@/lib/ai/semantic-matcher";

const MatchCreatorsRequestSchema = z.object({
  campaign: CampaignAnalysisOutputSchema,
  useSemantic: z.boolean().optional().default(true),
  includeDemo: z.boolean().optional().default(true),
  categoryFilter: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaign, useSemantic, includeDemo, categoryFilter } =
      MatchCreatorsRequestSchema.parse(body);

    // Retrieve creator candidates from database first
    const candidates = await getDatabaseCreators({
      includeDemo,
      category: categoryFilter || campaign.category,
    });

    if (useSemantic && candidates.length > 0) {
      const semanticResults = await matchCreatorsSemantically(campaign, candidates, {
        includeDemo,
      });

      return NextResponse.json({
        success: true,
        data: semanticResults,
        count: semanticResults.length,
        isSemanticActive: semanticResults.some((s) => s.isSemanticActive),
        isDemo: semanticResults.some((s) => s.isDemo),
      });
    }

    // Baseline fallback to AIService findMatches
    const matches = await aiService.findMatches(campaign);

    return NextResponse.json({
      success: true,
      data: matches,
      count: matches.length,
      isSemanticActive: false,
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
