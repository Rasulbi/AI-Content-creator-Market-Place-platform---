import { NextRequest, NextResponse } from "next/server";
import { verificationService } from "@/lib/ai/verification-service";
import { VerifyCreatorsInputSchema } from "@/lib/ai/verification-types";
import { aiRateLimiter } from "@/lib/ai/rate-limiter";
import { aiLogger } from "@/lib/ai/logger";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting check
    const clientId = aiRateLimiter.getClientIdentifier(req);
    const rateCheck = aiRateLimiter.check(clientId);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please wait before triggering another AI verification audit.",
          resetMs: rateCheck.resetMs,
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateCheck.resetMs / 1000).toString(),
          },
        }
      );
    }

    // 2. Parse and validate payload
    const body = await req.json();
    const validatedInput = VerifyCreatorsInputSchema.parse(body);

    // 3. Execute AI profile verification analysis
    const result = await verificationService.verifyCreators(validatedInput);

    return NextResponse.json({
      success: true,
      data: result,
      provider: result.provider,
      engine: result.engine,
      isFallback: result.isFallback,
      timestamp: result.timestamp,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid campaign parameters for verification",
          details: err.flatten(),
        },
        { status: 400 }
      );
    }

    aiLogger.error("API /api/ai/verify-creators failed", {
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error occurred during AI profile verification audit",
      },
      { status: 500 }
    );
  }
}
