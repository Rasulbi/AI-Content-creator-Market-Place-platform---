import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z, ZodError } from "zod";
import { extractJSON } from "@/lib/ai/json-parser";
import { aiLogger } from "@/lib/ai/logger";
import { aiService } from "@/lib/ai/ai-service";
import { getAIProvider } from "@/lib/ai/provider-factory";
import { ContentSuggestionsOutput } from "@/lib/ai/types";

/**
 * Validation schema for Content Generation requests
 */
const AIContentRequestSchema = z.object({
  niche: z.string().optional().default("Beauty & Skincare"),
  topic: z.string().optional(),
  targetAudience: z.string().optional().default("General digital audience"),
  platform: z.string().optional().default("Instagram Reels"),
  contentGoal: z.string().optional().default("Engagement & Brand Growth"),
  preferredFormat: z.string().optional().default("30s Short-Form Video"),
  keywords: z.string().optional().default("trending, viral, high engagement"),
  count: z.number().int().min(1).max(5).optional().default(3),
});

/**
 * POST /api/ai-content
 * Generates viral content ideas, hooks, captions, hashtags, and script outlines using the OpenAI API.
 * 
 * SECURITY:
 * Runs strictly on the server. Reads OPENAI_API_KEY from process.env.
 * Never exposes the API key to client browsers or network payloads.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const validated = AIContentRequestSchema.parse(rawBody);

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const isKeyConfigured = Boolean(
      apiKey &&
      !apiKey.startsWith("your_") &&
      !apiKey.startsWith("paste-") &&
      !apiKey.includes("REPLACE_WITH_") &&
      apiKey.length > 15
    );

    // 1. If OpenAI API key is configured, invoke the official OpenAI API
    if (isKeyConfigured && apiKey) {
      try {
        const openai = new OpenAI({
          apiKey,
          timeout: 30000, // 30-second timeout
        });

        const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

        const systemPrompt = `You are an elite viral content strategist, creative director, and copywriter for digital content creators and brands.
Given a niche, platform, target audience, format, and campaign focus, generate high-converting content concepts.

Each concept MUST include:
1. "id": Unique string identifier (e.g. "concept-1")
2. "title": Catchy, clickable project title
3. "concept": 1-2 sentence core concept explaining why this works
4. "hook": Attention-grabbing 0-3 second visual/verbal hook
5. "caption": Compelling ready-to-post caption with call to action
6. "hashtags": Array of 5-8 strategic hashtags with # prefix
7. "callToAction": Explicit engagement CTA (e.g., "Drop a comment below", "Save for later")
8. "videoScriptOutline": Array of 3 scenes, each containing:
   - "scene": Scene name/time (e.g. "Scene 1 (0-3s)")
   - "visual": On-screen visual direction
   - "audioOrVoiceover": Spoken voiceover or soundtrack direction

Respond ONLY with valid JSON strictly adhering to this structure:
{
  "niche": "${validated.niche}",
  "platform": "${validated.platform}",
  "suggestions": [
    {
      "id": "concept-1",
      "title": "string",
      "concept": "string",
      "hook": "string",
      "caption": "string",
      "hashtags": ["#tag1", "#tag2"],
      "callToAction": "string",
      "videoScriptOutline": [
        { "scene": "Scene 1 (0-3s)", "visual": "string", "audioOrVoiceover": "string" },
        { "scene": "Scene 2 (3-15s)", "visual": "string", "audioOrVoiceover": "string" },
        { "scene": "Scene 3 (15-30s)", "visual": "string", "audioOrVoiceover": "string" }
      ]
    }
  ]
}`;

        const userPrompt = `Generate ${validated.count} viral content treatments for:
- Niche: ${validated.niche}
- Topic / Focus: ${validated.topic || validated.keywords}
- Target Audience: ${validated.targetAudience}
- Preferred Platform: ${validated.platform}
- Content Goal: ${validated.contentGoal}
- Format: ${validated.preferredFormat}
- Key Themes / Keywords: ${validated.keywords}`;

        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });

        const rawContent = completion.choices[0]?.message?.content;
        if (!rawContent) {
          throw new Error("OpenAI returned an empty response");
        }

        const parsedData = extractJSON<ContentSuggestionsOutput>(rawContent);

        aiLogger.info("Successfully generated AI content suggestions via OpenAI", {
          model,
          suggestionsCount: parsedData.suggestions?.length || 0,
        });

        return NextResponse.json({
          success: true,
          data: parsedData,
          provider: "openai",
          model,
          isFallback: false,
        });
      } catch (openAiError: unknown) {
        const error = openAiError as Error;
        aiLogger.warn("OpenAI API call failed, falling back to configured provider or heuristic engine", {
          message: error.message,
        });

        // Fallback to configured AI provider (e.g. Gemini) or heuristic generator
        const contentData = await aiService.generateContentSuggestions({
          niche: validated.niche,
          targetAudience: validated.targetAudience,
          platform: validated.platform,
          contentGoal: validated.contentGoal,
          preferredFormat: validated.preferredFormat,
          keywords: validated.keywords,
        });

        const isModel = !contentData.isFallback && contentData.engine === "ai_model";
        const configuredProvider = getAIProvider();

        return NextResponse.json({
          success: true,
          data: contentData,
          provider: isModel ? configuredProvider.id : "heuristic-fallback",
          model: isModel ? configuredProvider.model : undefined,
          isFallback: !isModel,
          warning: isModel
            ? `OpenAI API call failed; generated via configured ${configuredProvider.name}.`
            : "Live AI generation encountered an error; displayed verified fallback suggestions.",
        });
      }
    }

    // 2. When OPENAI_API_KEY is not configured, generate via the configured provider (e.g. Gemini) or heuristic fallback
    aiLogger.info("Generating content suggestions via configured provider / aiService");
    const contentData = await aiService.generateContentSuggestions({
      niche: validated.niche,
      targetAudience: validated.targetAudience,
      platform: validated.platform,
      contentGoal: validated.contentGoal,
      preferredFormat: validated.preferredFormat,
      keywords: validated.keywords,
    });

    const isModel = !contentData.isFallback && contentData.engine === "ai_model";
    const configuredProvider = getAIProvider();

    return NextResponse.json({
      success: true,
      data: contentData,
      provider: isModel ? configuredProvider.id : "heuristic-fallback",
      model: isModel ? configuredProvider.model : undefined,
      isFallback: !isModel,
      ...(isModel
        ? {}
        : {
            message:
              "Generated via heuristic fallback engine. Set OPENAI_API_KEY or GEMINI_API_KEY in .env.local to enable live model generation.",
          }),
    });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: err.flatten(),
        },
        { status: 400 }
      );
    }

    aiLogger.error("API /api/ai-content encountered unexpected server error", {
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during content generation. Please try again.",
      },
      { status: 500 }
    );
  }
}
