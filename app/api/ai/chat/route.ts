import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";
import { ChatRequestSchema } from "@/lib/ai/types";
import { aiLogger } from "@/lib/ai/logger";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = ChatRequestSchema.parse(body);

    const chatResult = await aiService.handleChatWithMetadata(validated.messages, validated.userContext);

    return NextResponse.json({
      success: true,
      message: chatResult.reply,
      engine: chatResult.engine,
      provider: chatResult.provider,
      isFallback: chatResult.isFallback,
      fallbackReason: chatResult.fallbackReason,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid chat payload",
          details: err.flatten(),
        },
        { status: 400 }
      );
    }

    aiLogger.error("API /api/ai/chat encountered an error", { error: err });
    return NextResponse.json(
      {
        success: false,
        error: "AI Assistant is currently unavailable. Please retry in a moment.",
      },
      { status: 500 }
    );
  }
}
