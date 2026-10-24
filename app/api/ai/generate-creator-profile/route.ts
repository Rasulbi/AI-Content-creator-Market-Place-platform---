import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";
 import { GenerateCreatorProfileInputSchema } from "@/lib/validations/ai-profile";
 import { aiRateLimiter } from "@/lib/ai/rate-limiter";
 import { aiLogger } from "@/lib/ai/logger";
 import { ZodError } from "zod";
 import { getAuthenticatedUser } from "@/lib/supabase/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const auth = await getAuthenticatedUser();
    const clientId = aiRateLimiter.getClientIdentifier(req, auth?.user?.id);
    const rateLimit = aiRateLimiter.check(clientId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many profile generation requests. Please wait a moment before trying again.",
          rateLimit: {
            limit: rateLimit.limit,
            remaining: rateLimit.remaining,
            resetMs: rateLimit.resetMs,
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetMs.toString(),
          },
        }
      );
    }
    // Allow if authenticated, or allow in development/test if caller provides authorization header or active session
    if (auth && auth.user.role === "brand") {
      return NextResponse.json(
        {
          success: false,
          error: "Only creator accounts can access the AI Profile Assistant.",
        },
        { status: 403 }
      );
    }

    // 3. Parse and validate body
    const body = await req.json();
    const validatedInput = GenerateCreatorProfileInputSchema.parse(body);

    // 4. Generate structured profile draft
    const draft = await aiService.generateCreatorProfileDraft(validatedInput);

    return NextResponse.json({
      success: true,
      data: draft,
      isDraft: true,
      provider: draft.provider,
      isFallback: draft.isFallback,
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed. Please verify your profile generation inputs.",
          details: err.flatten(),
        },
        { status: 400 }
      );
    }

    aiLogger.error("API /api/ai/generate-creator-profile encountered an error", { error: err });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate AI creator profile draft. Please try again.",
      },
      { status: 500 }
    );
  }
}
