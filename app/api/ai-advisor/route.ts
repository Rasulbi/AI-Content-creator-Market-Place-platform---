import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getAIProvider, getAIConfigurationStatus } from "@/lib/ai/provider-factory";
import { aiLogger } from "@/lib/ai/logger";
import { aiRateLimiter } from "@/lib/ai/rate-limiter";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth-helpers";
import { getStoredCreators, getCreatorById } from "@/lib/creators-store";
import { CREATORS_DATA } from "@/lib/creators-data";
import { AssistantContextSchema } from "@/lib/ai/types";
import {
  SupportedLanguageSchema,
  SupportedLanguageCode,
  detectLanguage,
  getLanguageMetadata,
  getChatbotStrings,
} from "@/lib/ai/multilingual";
import {
  analyzeChatbotIntent,
  searchMatchingCreators,
  searchMatchingCampaignsForCreator,
  compareCreatorsList,
  buildEnhancedSystemPrompt,
  generateSmartHeuristicResponse,
  RecommendedCreatorItem,
  RecommendedCampaignItem,
  CreatorComparisonItem,
} from "@/lib/ai/chatbot-engine";

/**
 * Validation schema for assistant messages
 */
const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z
    .string()
    .min(1, "Message content cannot be empty")
    .max(4000, "Message cannot exceed 4000 characters"),
});

const AIAdvisorRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1, "At least one message is required"),
  userContext: AssistantContextSchema.optional(),
  sessionId: z.string().optional(),
  preferredLanguage: SupportedLanguageSchema.optional(),
});

/**
 * Sanitizes input and checks for prompt injection or leakage attempts
 */
function inspectForSafetyAndInjection(text: string): { safe: boolean; reason?: string } {
  const lower = text.toLowerCase();

  // Guard against prompt leakage and system prompt manipulation attempts
  const injectionPatterns = [
    /ignore (all )?(previous|prior) (instructions|prompts)/i,
    /reveal (your )?(system prompt|instructions|secret key|api key)/i,
    /output (your )?(initial|system) (prompt|instructions)/i,
    /what are your (rules|system instructions)/i,
    /show (me )?(your )?(environment variables|\.env)/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(lower)) {
      return {
        safe: false,
        reason: "I am programmed to assist with branding, social media, creator workflows, and marketing. I cannot disclose internal system configuration or override platform guardrails.",
      };
    }
  }

  return { safe: true };
}

/**
 * GET /api/ai-advisor?sessionId=...
 * Retrieves stored conversation messages for the authenticated user and session
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId parameter is required" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, messages: [] });
    }

    const authInfo = await getAuthenticatedUser();
    if (!authInfo) {
      return NextResponse.json({ success: true, messages: [] });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_advisor_conversations")
      .select("id, role, content, metadata, created_at")
      .eq("user_id", authInfo.user.id)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      aiLogger.warn("Failed to fetch stored advisor conversations", { error: error.message });
      return NextResponse.json({ success: true, messages: [] });
    }

    return NextResponse.json({
      success: true,
      messages: data || [],
    });
  } catch (err) {
    aiLogger.error("GET /api/ai-advisor error", { error: err });
    return NextResponse.json({ success: false, error: "Failed to load conversation history" }, { status: 500 });
  }
}

/**
 * POST /api/ai-advisor
 * 
 * Production-ready, full-spectrum AI Assistant for Creators, Influencers & Brands.
 * 
 * Supports free-form and guided requests across:
 * - Reel ideas, shot lists, audio cues, and full video scripts
 * - Captions, viral hooks, CTAs, hashtags, and monthly content calendars
 * - Brand campaign briefs, influencer collaboration outreach, and pricing
 * - Product descriptions, promotional copy, and ecommerce angles
 * - Audience, niche, and demographic persona analysis
 * - Content strategy, brand voice & tone development
 * - Social media growth recommendations and algorithm retention
 * - Editing, rewriting, summarizing, and translating content
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const validated = AIAdvisorRequestSchema.parse(rawBody);

    const latestMessage = validated.messages[validated.messages.length - 1];
    if (!latestMessage || latestMessage.role !== "user" || !latestMessage.content.trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid request or topic.", code: "EMPTY_PROMPT" },
        { status: 400 }
      );
    }

    // 1. Rate Limiting Check
    const clientId = aiRateLimiter.getClientIdentifier(req, validated.userContext?.creatorId);
    const rateCheck = aiRateLimiter.check(clientId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "You are sending requests too quickly. Please wait a few seconds before trying again.",
          code: "RATE_LIMIT_EXCEEDED",
          resetMs: rateCheck.resetMs,
        },
        { status: 429 }
      );
    }

    // 2. Safety & Prompt Injection Check
    const safetyCheck = inspectForSafetyAndInjection(latestMessage.content);
    if (!safetyCheck.safe) {
      return NextResponse.json({
        success: true,
        message: safetyCheck.reason || "I cannot fulfill this request.",
        provider: "system-guardrail",
        model: "safety-filter",
        isFallback: false,
        suggestedFollowUps: [
          "Suggest 3 viral content ideas for my niche",
          "Create a weekly content calendar",
          "Write a 30s Reel script with a strong hook",
          "How can I pitch to brands as a creator?",
        ],
      });
    }

    // 3. Resolve User Identity & Application Data from Session Cookie, Supabase, or Context
    let resolvedRole: "creator" | "brand" = "creator";
    let resolvedName: string = "User";
    let resolvedNiche: string = validated.userContext?.niche || "Content Creation";
    let resolvedPlatform: string = validated.userContext?.platform || "Multi-Platform";
    let resolvedAudience: string = validated.userContext?.targetAudience || "Target Consumers & Followers";
    let resolvedBrandProduct: string = validated.userContext?.brandOrProduct || "";
    let resolvedTone: string = validated.userContext?.tone || "Conversational & Energetic";
    let resolvedGoal: string = validated.userContext?.contentGoal || "Engagement & Growth";
    let isVerified: boolean = false;
    let userId: string | null = null;

    // A. Live Supabase authentication & database profile is authoritative when configured
    if (isSupabaseConfigured()) {
      try {
        const authInfo = await getAuthenticatedUser();
        if (authInfo) {
          userId = authInfo.user.id;
          resolvedName = authInfo.user.full_name || authInfo.user.email.split("@")[0] || resolvedName;
          resolvedRole = authInfo.user.role === "brand" ? "brand" : "creator";
          if (authInfo.user.company_name && !resolvedBrandProduct) {
            resolvedBrandProduct = authInfo.user.company_name;
          }
          isVerified = true;
        }
      } catch (authErr) {
        aiLogger.info("Supabase session not active or unconfigured", {
          error: authErr instanceof Error ? authErr.message : String(authErr),
        });
      }
    }

    // B. UserContext override (allows user to switch roles / personas in UI)
    if (validated.userContext?.role) {
      resolvedRole = validated.userContext.role === "brand" ? "brand" : "creator";
    }
    if (validated.userContext?.niche) {
      resolvedNiche = validated.userContext.niche;
    }
    if (validated.userContext?.brandOrProduct) {
      resolvedBrandProduct = validated.userContext.brandOrProduct;
    }

    // D. Extract intent and query entities
    const analysis = analyzeChatbotIntent(latestMessage.content);
    if (analysis.detectedBrandOrProduct && (!resolvedBrandProduct || resolvedBrandProduct === "Your Product")) {
      resolvedBrandProduct = analysis.detectedBrandOrProduct;
    }
    if (analysis.detectedCategory && (resolvedNiche === "Content Creation" || !validated.userContext?.niche)) {
      resolvedNiche = analysis.detectedCategory;
    }
    if (analysis.detectedPlatform && (resolvedPlatform === "Multi-Platform" || !validated.userContext?.platform)) {
      resolvedPlatform = analysis.detectedPlatform;
    }

    // 4. Resolve Language Preference & Detection
    const preferredLanguage = validated.preferredLanguage || validated.userContext?.preferredLanguage || "auto";
    const detection = detectLanguage(latestMessage.content, preferredLanguage);
    const isExplicit = Boolean(preferredLanguage && preferredLanguage !== "auto");
    const effectiveLanguage = (isExplicit ? preferredLanguage : detection.detectedLanguage) as SupportedLanguageCode;
    const langMeta = getLanguageMetadata(effectiveLanguage);

    // 5. Build Comprehensive Server System Prompt Grounded in Marketplace Data
    const systemInstruction = buildEnhancedSystemPrompt({
      role: resolvedRole,
      userName: resolvedName,
      userNiche: resolvedNiche,
      platform: resolvedPlatform,
      targetAudience: resolvedAudience,
      brandOrProduct: resolvedBrandProduct,
      tone: resolvedTone,
      goal: resolvedGoal,
      preferredLanguage,
      detectedLanguage: detection.detectedLanguage,
      isCodeSwitching: detection.isCodeSwitching,
      dialect: detection.dialect,
    });

    // 5. Limit Conversation History Sent to LLM (last 10 messages)
    const recentMessages = validated.messages.slice(-10);
    const languageReminder = effectiveLanguage !== "en" && effectiveLanguage !== "auto"
      ? `\n\n[MANDATORY SYSTEM DIRECTIVE: The user's active response language is ${langMeta.name} (${langMeta.nativeName}). You MUST generate the entire user-facing response, explanation, hooks, and creative scripts in fluent, natural ${langMeta.name} (${langMeta.nativeName}). DO NOT default to English. Keep product names (e.g. "GlowUp"), URLs, timestamps (e.g. "(0:00 - 0:03)"), and hashtags unchanged.]`
      : "";
    const conversationPrompt = recentMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n") + languageReminder;

    // 6. Resolve AI Provider (Google Gemini primary, OpenRouter / Groq alternative)
    const provider = getAIProvider();
    const configStatus = getAIConfigurationStatus();

    let assistantReply: string = "";
    let activeProviderId: string = provider.id;
    let activeModel = provider.model;
    let isFallback = false;
    let recommendedCreators: RecommendedCreatorItem[] | undefined;
    let recommendedCampaigns: RecommendedCampaignItem[] | undefined;
    let comparisonData: CreatorComparisonItem[] | undefined;
    let suggestedFollowUps: string[] = [];

    if (provider.isConfigured()) {
      try {
        assistantReply = await provider.generateText(conversationPrompt, systemInstruction);

        // Intelligently attach structured recommendations based on intent
        if (analysis.intent === "COMPARE_CREATORS") {
          comparisonData = compareCreatorsList().items;
          recommendedCreators = searchMatchingCreators({ category: resolvedNiche, limit: 3 });
        } else if (
          analysis.intent === "RECOMMEND_CREATORS" ||
          (resolvedRole === "brand" && (analysis.intent === "BRAND_PRODUCT_STRATEGY" || latestMessage.content.toLowerCase().includes("creator")))
        ) {
          recommendedCreators = searchMatchingCreators({
            category: resolvedNiche,
            budget: analysis.detectedBudget,
            platform: resolvedPlatform,
            limit: 3,
          });
        } else if (
          analysis.intent === "FIND_CAMPAIGNS" ||
          (resolvedRole === "creator" && latestMessage.content.toLowerCase().includes("campaign"))
        ) {
          recommendedCampaigns = searchMatchingCampaignsForCreator(resolvedNiche, undefined, 3);
        }

        const localizedStrings = getChatbotStrings(effectiveLanguage);
        suggestedFollowUps = effectiveLanguage !== "en" && effectiveLanguage !== "auto"
          ? (resolvedRole === "brand" ? localizedStrings.suggestedFollowUpsBrand : localizedStrings.suggestedFollowUpsCreator)
          : generateAssistantFollowUpPrompts(
              latestMessage.content,
              resolvedRole,
              resolvedNiche,
              resolvedPlatform
            );
      } catch (llmErr) {
        aiLogger.warn("Primary AI provider call failed, engaging dynamic contextual heuristic assistant", {
          provider: provider.name,
          error: llmErr instanceof Error ? llmErr.message : String(llmErr),
        });
        isFallback = true;
      }
    } else {
      isFallback = true;
    }

    // Dynamic Heuristic Fallback
    if (isFallback || !assistantReply.trim()) {
      isFallback = true;
      const fallbackResult = generateSmartHeuristicResponse({
        userMessage: latestMessage.content,
        role: resolvedRole,
        niche: resolvedNiche,
        name: resolvedName,
        platform: resolvedPlatform,
        audience: resolvedAudience,
        brandOrProduct: resolvedBrandProduct,
        tone: resolvedTone,
        goal: resolvedGoal,
        preferredLanguage: effectiveLanguage,
      });

      assistantReply = fallbackResult.reply;
      recommendedCreators = fallbackResult.recommendedCreators;
      recommendedCampaigns = fallbackResult.recommendedCampaigns;
      comparisonData = fallbackResult.comparisonData;
      suggestedFollowUps = fallbackResult.suggestedFollowUps;
      activeProviderId = "heuristic-fallback";
      activeModel = "rules-engine";
    }

    // 7. Supabase Conversation Persistence (RLS Protected)
    const sessionId = validated.sessionId || `session_${Date.now()}`;
    if (isSupabaseConfigured() && userId) {
      try {
        const supabase = await createClient();
        await supabase.from("ai_advisor_conversations").insert([
          {
            user_id: userId,
            session_id: sessionId,
            role: "user",
            content: latestMessage.content,
            metadata: {
              niche: resolvedNiche,
              role: resolvedRole,
              platform: resolvedPlatform,
              tone: resolvedTone,
              goal: resolvedGoal,
              preferredLanguage,
              detectedLanguage: detection.detectedLanguage,
            },
          },
          {
            user_id: userId,
            session_id: sessionId,
            role: "assistant",
            content: assistantReply,
            metadata: {
              provider: activeProviderId,
              model: activeModel,
              isFallback,
              tone: resolvedTone,
              effectiveLanguage,
            },
          },
        ]);
      } catch (dbErr) {
        aiLogger.info("Conversation persistence skipped or table pending migration", {
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: assistantReply,
      provider: activeProviderId,
      model: activeModel,
      isFallback,
      role: resolvedRole,
      recommendedCreators,
      recommendedCampaigns,
      comparisonData,
      detectedLanguage: detection.detectedLanguage,
      effectiveLanguage,
      dir: langMeta.dir,
      contextUsed: {
        role: resolvedRole,
        name: resolvedName,
        niche: resolvedNiche,
        platform: resolvedPlatform,
        audience: resolvedAudience,
        brandOrProduct: resolvedBrandProduct,
        tone: resolvedTone,
        goal: resolvedGoal,
        isVerified,
        preferredLanguage,
        effectiveLanguage,
      },
      suggestedFollowUps,
      sessionId,
      configNotice: !configStatus.isConfigured
        ? `Running in offline assistant mode. Set GEMINI_API_KEY in .env.local to activate live Google Gemini AI.`
        : undefined,
    });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: err.flatten(),
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    aiLogger.error("API /api/ai-advisor encountered an error", {
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      {
        success: false,
        error: "AI Assistant encountered an unexpected error. Please try again.",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * Production Comprehensive Dynamic Heuristic Engine
 * Handles broad spectrum of free-form requests deterministically when external LLM is offline
 */
function generateComprehensiveAssistantResponse({
  userMessage,
  role,
  niche,
  name,
  platform,
  audience,
  brandOrProduct,
  tone,
  goal,
  skills,
  tools,
  rating,
  isVerified,
}: {
  userMessage: string;
  role: "creator" | "brand";
  niche: string;
  name: string;
  platform: string;
  audience: string;
  brandOrProduct: string;
  tone: string;
  goal: string;
  skills: string[];
  tools: string[];
  rating: number | null;
  isVerified: boolean;
}): string {
  const query = userMessage.toLowerCase();
  const targetTool = tools[0] || "AI Studio";
  const productLabel = brandOrProduct || `${niche} Solution`;

  // 1. Reel / Video Script / Shot List Request
  if (query.includes("script") || query.includes("shot list") || query.includes("reel") || query.includes("video concept")) {
    return `### 🎬 High-Converting 30-Second Video Script for **${platform}**
**Niche**: ${niche} | **Target Audience**: ${audience} | **Tone**: ${tone}

#### ⚡ Hook (0:00 - 0:03)
- **Visual**: Tight close-up with rapid movement or split screen showing before vs after using ${targetTool}.
- **On-Screen Text**: *"Stop doing this if you want real results in ${niche}..."*
- **Audio / Voiceover**: *"If you're still doing this in 2026, here is why your results are plateauing."*

#### 🔍 The Problem & Solution (0:03 - 0:18)
- **Visual**: Screen recording demonstrating the pain point, transitioning smoothly into a crisp showcase of ${productLabel}.
- **On-Screen Text**: *"Step 1: The Bottleneck | Step 2: The Breakthrough"*
- **Audio / Voiceover**: *"Most people think you need a huge budget. In reality, you just need this 3-step workflow that cuts production time by 80%."*

#### 🚀 Proof & Demonstration (0:18 - 0:25)
- **Visual**: Dynamic b-roll highlighting the end result with high aesthetic visual fidelity.
- **On-Screen Text**: *"Benchmark: +45% Retention"*
- **Audio / Voiceover**: *"Look at the clarity here. No fluff, just pure quality that converts viewers into followers."*

#### 🎯 Call-To-Action (0:25 - 0:30)
- **Visual**: Creator on camera pointing down or dynamic graphic pointing to the caption.
- **On-Screen Text**: *"Comment 'PLAN' for the exact template👇"*
- **Audio / Voiceover**: *"Drop a comment below, and I'll send you the free breakdown."*

---
> **Production Tip**: Add trending rhythmic audio at -14dB below voiceover and ensure captions are centered to avoid being obscured by UI overlays on ${platform}.`;
  }

  // 2. Captions, Hooks, CTAs, and Hashtags
  if (query.includes("caption") || query.includes("hook") || query.includes("cta") || query.includes("hashtag")) {
    return `### ✍️ High-Retention Hooks, Captions & Hashtags for **${niche}**
**Platform**: ${platform} | **Goal**: ${goal} | **Tone**: ${tone}

#### 🎯 5 Viral Hook Variations
1. **The Curiosity Gap**: *"The ${niche} secret top industry insiders keep to themselves..."*
2. **The Contrarian Angle**: *"Why everything you've been told about ${niche.toLowerCase()} is completely backwards."*
3. **The Proof Framework**: *"I tested 10 different workflows for 30 days so you don't have to. Here's what worked."*
4. **The Direct Pain Point**: *"Struggling to get engagement on ${platform}? Fix this one setting today."*
5. **The Time-Saver**: *"How to master ${niche} in 15 minutes a day (Step-by-step)."*

#### 📝 Ready-to-Post Caption
\`\`\`text
Most people overcomplicate ${niche.toLowerCase()}.

Here is the exact framework I use to consistently drive ${goal.toLowerCase()} without burning out:

1️⃣ Focus on retention in the first 3 seconds
2️⃣ Deliver immediate, actionable value with 0 filler
3️⃣ Give your audience a clear reason to save this post for later

Save this post so you have it ready when creating your next piece of content! 📌

What is your biggest hurdle with ${niche.toLowerCase()} right now? Let's discuss in the comments below. 👇
\`\`\`

#### 🏷️ Targeted Hashtag Cluster
\`#${niche.replace(/[^a-zA-Z]/g, "")} #${platform.replace(/[^a-zA-Z]/g, "")}Creator #ContentStrategy #AIContent #DigitalCreator #ViralGrowth #CreatorEconomy\``;
  }

  // 3. Brand Campaign Ideas & Influencer Outreach
  if (query.includes("campaign") || query.includes("collaboration") || query.includes("collab") || query.includes("brief") || query.includes("pitch") || query.includes("outreach")) {
    return `### 💼 Influencer Collaboration & Campaign Strategy
**Role**: ${role === "brand" ? "Brand Campaign Blueprint" : "Creator Brand Pitch Framework"}
**Focus**: ${niche} | **Product**: ${productLabel}

#### 📋 Campaign Concept: *"The Real-World AI Transformation"*
- **Deliverables**: 2x Instagram Reels (9:16 vertical), 3x Story sequences with direct UTM swipe-up, and 30-day paid ad whitelisting.
- **Key Message**: Authentically showcase how ${productLabel} solves consumer pain points in under 60 seconds.
- **Target Metrics**: 6.5%+ engagement rate, 12%+ save rate, and direct click-through to product landing page.

#### ✉️ Outreach Template (Brand to Creator / Creator to Brand)
\`\`\`text
Subject: Collaboration Opportunity: ${productLabel} x [Creator Name]

Hi [Name],

I've been following your recent content in ${niche}—especially your breakdown on [Specific Video Topic]—and your creative style is a perfect fit for what we're building.

We are launching a focused campaign for ${productLabel} targeting ${audience}. We would love to collaborate on a sponsored vertical video showcasing your authentic workflow.

We provide creative freedom, competitive compensation, and clear turnaround guidelines.

Could you share your current media kit and collaboration rates for 1x Reel + Story sequence?

Best regards,
${name}
\`\`\`

> **Advisor Note**: High-performing campaigns specify clear commercial usage rights up front. Ensure both parties agree on a 30 or 60-day digital ad usage license.`;
  }

  // 4. Product Descriptions & Promotional Copy
  if (query.includes("product") || query.includes("promo") || query.includes("copy") || query.includes("sales") || query.includes("description")) {
    return `### 🛍️ High-Converting Product & Promotional Copy
**Product**: ${productLabel} | **Tone**: ${tone} | **Goal**: ${goal}

#### 🌟 Hero Product Description (Above The Fold)
> **Headline**: *Transform Your ${niche} Workflow in Half the Time.*
>
> Stop struggling with disjointed tools and slow turnarounds. **${productLabel}** gives you the precision, speed, and creative leverage needed to deliver commercial-grade results effortlessly. Designed specifically for ${audience}.

#### 💡 The PAS Copywriting Framework
- **Problem**: Creating consistent, high-performing content in ${niche} feels like an endless treadmill. You spend hours tweaking drafts with unpredictable results.
- **Agitation**: Every day without a streamlined system is lost reach, wasted budget, and missed sponsorship opportunities.
- **Solution**: **${productLabel}** eliminates the guesswork. With automated prompt workflows, benchmark-backed frameworks, and verified performance, you scale your output without sacrificing your creative voice.

#### 🛒 3 Compelling Value Bullets
- ⚡ **80% Faster Turnaround**: Move from concept to published asset in minutes.
- 🎯 **Targeted Precision**: Formatted specifically for ${platform} algorithms.
- 🛡️ **Guaranteed Quality**: Backed by verified creator standards and community reviews.`;
  }

  // 5. Audience & Niche Analysis
  if (query.includes("audience") || query.includes("niche") || query.includes("persona") || query.includes("demographic")) {
    return `### 🎯 Deep Audience & Niche Persona Analysis: **${niche}**
**Platform**: ${platform} | **Primary Goal**: ${goal}

#### 👤 Core Audience Persona: *"The Forward-Thinking Creator / Consumer"*
- **Demographics**: 20–38 years old, digital-first, consumes short-form vertical video daily.
- **Top 3 Desires**:
  1. Actionable, non-gimmicky workflows that deliver tangible outcomes.
  2. Tools and aesthetics that elevate their personal or commercial brand.
  3. Clear, honest product recommendations backed by real evidence.
- **Top 3 Frustrations**:
  1. Superficial advice and generic "AI prompt" hype that doesn't work in practice.
  2. Slow, bloated software with steep learning curves.
  3. High subscription costs with low ROI.

#### 📊 Recommended Content Pillars
1. **40% Education & Micro-Tutorials**: Quick "How-To" frameworks that solve one immediate pain point.
2. **30% Trend Analysis & Tool Reviews**: Objective comparisons highlighting pros and cons.
3. **20% Behind-The-Scenes Process**: Authentic proofs of work, raw b-roll, and prompt walkthroughs.
4. **10% Community & High-Energy Opinion**: Contrarian takes that spark active debate in the comments.`;
  }

  // 6. Content Calendar & 7-Day Strategy
  if (query.includes("calendar") || query.includes("schedule") || query.includes("plan") || query.includes("weekly")) {
    return `### 📅 7-Day Omnichannel Content Calendar for **${niche}**
**Platform**: ${platform} | **Objective**: ${goal} | **Tone**: ${tone}

| Day | Content Type | Hook / Title | Format | Core Goal |
| :--- | :--- | :--- | :--- | :--- |
| **Mon** | **Industry Insight** | *"The biggest shift happening in ${niche} right now"* | 30s Reel | Establish Authority |
| **Tue** | **Step-by-Step Tutorial** | *"How to achieve [Result] in 3 simple steps"* | Carousel / Short | Drive Saves & Bookmarks |
| **Wed** | **Behind-The-Scenes** | *"My raw workflow using ${targetTool}"* | Vertical Video | Build Creator Trust |
| **Thu** | **Tool / Product Breakdown** | *"Is ${productLabel} worth the hype in 2026?"* | Split-Screen Test | Attract Brand Inquiries |
| **Fri** | **Contrarian Myth-Buster** | *"Stop making this common ${niche} mistake"* | High-Pace Video | Maximize Viral Reach |
| **Sat** | **Audience Q&A / Poll** | *"Answering your top questions about ${niche}"* | Story Sequence | Boost Direct Engagement |
| **Sun** | **Weekly Recap & Portfolio** | *"Highlights & creative experiments from the week"* | Aesthetic Reel | Long-term Follower Growth |

> **Optimal Posting Windows**: 11:30 AM – 1:30 PM and 6:30 PM – 8:30 PM in your target audience's primary time zone.`;
  }

  // 7. Editing, Rewriting, Summarizing, and Translating
  if (query.includes("rewrite") || query.includes("edit") || query.includes("summarize") || query.includes("translate") || query.includes("tone")) {
    return `### 🔄 Content Transformation & Polish Engine
**Desired Tone**: ${tone} | **Target Platform**: ${platform}

#### ✨ Rewritten & Optimized Version
\`\`\`text
Here is your content transformed with high-retention structure and ${tone.toLowerCase()} voice:

"Want to level up your ${niche} game without spending hours in post-production? 

Here is what most people miss: Quality isn't about complex setups—it's about intentional pacing and sharp hooks. When you combine modern tools with clear creative vision, your results speak for themselves.

Try this on your next project and see the difference."
\`\`\`

#### 🔍 Key Enhancements Applied
1. **Hook Velocity**: Removed passive opening phrases to grab attention immediately.
2. **Readability**: Formatted with single-sentence spacing optimal for mobile feeds on ${platform}.
3. **Tone Alignment**: Infused ${tone.toLowerCase()} phrasing while preserving the core message.
4. **Call to Action**: Included a subtle prompt that encourages viewer saves and comments.`;
  }

  // 8. Default Comprehensive Response for Free-Form Requests
  return `### 👋 Hello ${name}! I'm your Production AI Assistant.
**Role**: ${role === "brand" ? "Brand Campaign Strategist" : "Creator & Growth Advisor"} | **Niche**: ${niche} | **Platform**: ${platform}

I am ready to help you with any brand, creator, influencer, social media, or marketing request.

#### 🚀 Key Workflows We Can Tackle Right Now:
- 🎬 **Video Scripts & Shot Lists**: 15s, 30s, or 60s vertical scripts with timestamps, hooks, visual cues, and CTAs.
- ✍️ **Viral Hooks & Captions**: Tailored copy for ${platform} with custom hashtag clusters.
- 💼 **Brand Campaigns & Briefs**: Influencer outreach letters, deliverable scopes, and pricing benchmarks.
- 🛍️ **Product Copy & Sales Angles**: Compelling descriptions using PAS and AIDA frameworks for ${productLabel}.
- 📅 **Content Calendars**: 7-day or 30-day schedules optimized for ${goal.toLowerCase()}.
- 🔄 **Rewriting & Polishing**: Translating, summarizing, or restructuring your existing drafts.

Feel free to ask a specific question or give me a draft to optimize!`;
}

/**
 * Dynamic follow-up chips tailored to request context
 */
function generateAssistantFollowUpPrompts(
  lastMessage: string,
  role: string,
  niche: string,
  platform: string
): string[] {
  const lower = lastMessage.toLowerCase();

  if (lower.includes("script") || lower.includes("reel") || lower.includes("video")) {
    return [
      `Give me 3 alternate visual hooks for this script`,
      `Create a shot list and B-roll checklist for this video`,
      `Write an engaging Instagram caption for this reel`,
      `How can I adapt this video for YouTube Shorts?`,
    ];
  }

  if (lower.includes("caption") || lower.includes("hook") || lower.includes("hashtag")) {
    return [
      `Turn this caption into a 30s video script`,
      `Give me 3 high-converting calls-to-action (CTAs)`,
      `Suggest a carousel outline based on this topic`,
      `What are the best hours to post this on ${platform}?`,
    ];
  }

  if (lower.includes("campaign") || lower.includes("brief") || lower.includes("pitch") || lower.includes("collab")) {
    return [
      `What deliverables should I request in this campaign?`,
      `How should I price commercial digital ad usage rights?`,
      `Write a follow-up email if the creator doesn't respond`,
      `How do I define clear milestone terms in creator briefs?`,
    ];
  }

  if (lower.includes("product") || lower.includes("copy") || lower.includes("promo")) {
    return [
      `Write 3 short-form ad scripts for this product`,
      `Create an email newsletter promoting this offer`,
      `What customer objections should this copy address?`,
      `Give me 5 punchy Facebook/Instagram ad headlines`,
    ];
  }

  if (role === "brand") {
    return [
      `Draft a campaign brief for 5 Instagram Reels`,
      `What creator skills are required for a ${niche} launch?`,
      `Suggest a viral product launch challenge`,
      `How can I benchmark influencer engagement rates?`,
    ];
  }

  return [
    `Write a 30s viral Reel script with a shot list`,
    `Give me 5 high-retention hooks and captions`,
    `Create a 7-day content schedule for ${niche}`,
    `How can I pitch to brands as a ${niche} creator?`,
  ];
}
