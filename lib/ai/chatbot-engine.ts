import { CREATORS_DATA, Creator } from "@/lib/creators-data";
import { CAMPAIGN_PRESETS, CampaignRequirements, analyzeCreatorMatch, MatchResult } from "@/lib/ai-matching";
import { getStoredCreators, getCreatorById } from "@/lib/creators-store";
import { AssistantContext } from "./types";
import {
  detectLanguage,
  buildMultilingualPromptDirective,
  getLanguageMetadata,
  getChatbotStrings,
  SupportedLanguageCode,
} from "./multilingual";
import {
  buildLocalizedHeuristicBlueprint,
  buildLocalizedHeuristicRecommendations,
  buildLocalizedHeuristicStrategy,
  buildLocalizedHeuristicComparison,
  buildLocalizedHeuristicEscrowNotice,
  buildLocalizedHeuristicProposal,
  buildLocalizedHeuristicProfileTips,
} from "./multilingual-templates";

export interface RecommendedCreatorItem {
  id: string;
  name: string;
  professionalTitle: string;
  category: string;
  avatar: string;
  followers: string;
  engagementRate: string;
  clientRating: number;
  isVerified: boolean;
  priceRange: string;
  matchScore: number;
  matchReasons: string[];
  skills: string[];
  profileUrl: string;
}

export interface RecommendedCampaignItem {
  id: string;
  title: string;
  productOrService: string;
  category: string;
  platform: string;
  budget: string;
  deadline: string;
  deliverables: string[];
  whySuitable: string;
}

export interface CreatorComparisonItem {
  id: string;
  name: string;
  professionalTitle: string;
  category: string;
  followers: string;
  engagementRate: string;
  clientRating: number;
  priceRange: string;
  keyStrengths: string[];
  isVerified: boolean;
  profileUrl: string;
}

export interface ChatbotIntentAnalysis {
  intent:
    | "RECOMMEND_CREATORS"
    | "COMPARE_CREATORS"
    | "BRAND_PRODUCT_STRATEGY"
    | "PLAN_CAMPAIGN"
    | "FIND_CAMPAIGNS"
    | "CONTENT_IDEAS"
    | "COLLABORATION_PROPOSAL"
    | "PROFILE_IMPROVEMENT"
    | "GENERAL";
  detectedBrandOrProduct?: string;
  detectedCategory?: string;
  detectedBudget?: number;
  detectedPlatform?: string;
  detectedFormat?: string;
  targetCreatorNames?: string[];
}

/**
 * Category keywords mapping to marketplace taxonomy
 */
const CATEGORY_KEYWORDS: Record<string, string> = {
  skincare: "Beauty & Skincare",
  skin: "Beauty & Skincare",
  beauty: "Beauty & Skincare",
  cosmetic: "Beauty & Skincare",
  makeup: "Beauty & Skincare",
  cream: "Beauty & Skincare",
  serum: "Beauty & Skincare",
  sunscreen: "Beauty & Skincare",
  fashion: "Fashion",
  clothing: "Fashion",
  apparel: "Fashion",
  streetwear: "Fashion",
  dress: "Fashion",
  outfit: "Fashion",
  lookbook: "Fashion",
  coat: "Fashion",
  jacket: "Fashion",
  tech: "Technology",
  technology: "Technology",
  software: "Technology",
  smartphone: "Technology",
  phone: "Technology",
  gadget: "Technology",
  laptop: "Technology",
  samsung: "Technology",
  apple: "Technology",
  ai: "Technology",
  fitness: "Fitness & Wellness",
  workout: "Fitness & Wellness",
  gym: "Fitness & Wellness",
  wellness: "Fitness & Wellness",
  posture: "Fitness & Wellness",
  yoga: "Fitness & Wellness",
  nutrition: "Fitness & Wellness",
  food: "Food",
  cooking: "Food",
  recipe: "Food",
  cookware: "Food",
  culinary: "Food",
  beverage: "Food",
  snack: "Food",
  travel: "Travel & Lifestyle",
  hotel: "Travel & Lifestyle",
  resort: "Travel & Lifestyle",
  vacation: "Travel & Lifestyle",
  lifestyle: "Travel & Lifestyle",
  tourism: "Travel & Lifestyle",
  gaming: "Gaming",
  game: "Gaming",
  esports: "Gaming",
  gamer: "Gaming",
  twitch: "Gaming",
  education: "Education",
  course: "Education",
  bootcamp: "Education",
  tutorial: "Education",
  study: "Education",
  agriculture: "Agriculture",
  farming: "Agriculture",
  agri: "Agriculture",
  crop: "Agriculture",
  drone: "Agriculture",
};

/**
 * Known brands catalog with marketing context
 */
export const KNOWN_BRANDS_CATALOG: Record<
  string,
  {
    brand: string;
    category: string;
    typicalProducts: string;
    targetAudience: string;
    coreAngles: string[];
    suggestedPlatforms: string[];
    creatorCriteria: string[];
  }
> = {
  nike: {
    brand: "Nike",
    category: "Fashion",
    typicalProducts: "Performance Running Shoes, Streetwear Apparel & Activewear",
    targetAudience: "Active runners, athletes, streetwear enthusiasts, and lifestyle sneakers fans (16-35)",
    coreAngles: [
      "High-energy cinematic transitions showing sprint pacing and cushioning response",
      "Streetwear styling breakdown: How to pair Nike sneakers with everyday urban minimalist outfits",
      "30-day marathon prep shoe breakdown: Cushioning, grip, and durability test",
    ],
    suggestedPlatforms: ["Instagram Reels", "YouTube Shorts", "TikTok"],
    creatorCriteria: ["High-energy visual pacing", "Athletic or streetwear credibility", "Cinematic outdoor b-roll"],
  },
  samsung: {
    brand: "Samsung",
    category: "Technology",
    typicalProducts: "Galaxy Smartphones, Foldables, Smart Monitors & Ecosystem Displays",
    targetAudience: "Tech enthusiasts, mobile content creators, productivity professionals (20-40)",
    coreAngles: [
      "Macro camera comparison: 100x zoom and low-light nightography test vs real-world environments",
      "Day-in-the-life multitasking workflow using foldable split-screen productivity",
      "Creator desk setup tour: High-refresh workspace display and smart device sync",
    ],
    suggestedPlatforms: ["YouTube Longform", "Instagram Reels", "YouTube Shorts"],
    creatorCriteria: ["Technical benchmark knowledge", "Crisp 4K macro camera framing", "Impartial test credibility"],
  },
  glowup: {
    brand: "GlowUp Skincare",
    category: "Beauty & Skincare",
    typicalProducts: "Natural Botanical Face Cream & Barrier Repair Serums",
    targetAudience: "Women 18-35, clean beauty advocates, skincare ingredient researchers",
    coreAngles: [
      "14-day glass skin hydration challenge with clinical macro skin texture shots",
      "Dermatology-inspired ingredient breakdown: Why ceramides + hyaluronic acid matter",
      "Morning skincare ASMR routine under natural vanity ring light",
    ],
    suggestedPlatforms: ["Instagram Reels", "YouTube Shorts"],
    creatorCriteria: ["Verified skincare portfolio", "Authentic female audience", "High aesthetic lighting"],
  },
  "urban minimalist": {
    brand: "Urban Minimalist",
    category: "Fashion",
    typicalProducts: "Autumn Trench Coat Capsule & Sustainable Outerwear",
    targetAudience: "Fashion-forward urban professionals and aesthetic capsule wardrobe seekers (20-35)",
    coreAngles: [
      "1 trench coat styled 5 different ways for work, weekend coffee, and evening events",
      "Fabric drape & water-resistance real-life outdoor rain test",
      "Capsule wardrobe rules: The only outerwear you need for autumn",
    ],
    suggestedPlatforms: ["Instagram Reels", "TikTok"],
    creatorCriteria: ["High aesthetic visual consistency", "Editorial styling skill", "Urban architecture b-roll"],
  },
  "aether ai": {
    brand: "Aether AI",
    category: "Technology",
    typicalProducts: "Next-Gen Smart Workspace Monitor & Neural Launcher",
    targetAudience: "Software engineers, designers, tech creators, and productivity enthusiasts (18-40)",
    coreAngles: [
      "Automating 2 hours of daily workspace admin with one-click neural displays",
      "Hands-on benchmark review: Zero-latency split window multitasking",
      "Minimalist developer desk setup overhaul with ambient backlighting",
    ],
    suggestedPlatforms: ["YouTube", "Twitter / X", "Instagram Reels"],
    creatorCriteria: ["Software engineering / tech credentials", "Desk aesthetic quality", "Deep feature demo ability"],
  },
};

/**
 * Detects user intent and key entities from user message
 */
export function analyzeChatbotIntent(message: string): ChatbotIntentAnalysis {
  const lower = message.toLowerCase();

  // 1. Detect Category
  let detectedCategory: string | undefined;
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (new RegExp(`\\b${kw}\\b`, "i").test(lower)) {
      detectedCategory = cat;
      break;
    }
  }

  // 2. Detect Known Brand
  let detectedBrandOrProduct: string | undefined;
  for (const [key, brandInfo] of Object.entries(KNOWN_BRANDS_CATALOG)) {
    if (lower.includes(key) || lower.includes(brandInfo.brand.toLowerCase())) {
      detectedBrandOrProduct = brandInfo.brand;
      if (!detectedCategory) {
        detectedCategory = brandInfo.category;
      }
      break;
    }
  }

  // If generic product was mentioned
  if (!detectedBrandOrProduct) {
    if (lower.includes("skincare") || lower.includes("face cream") || lower.includes("serum")) {
      detectedBrandOrProduct = "Skincare Product";
    } else if (lower.includes("shoe") || lower.includes("sneaker")) {
      detectedBrandOrProduct = "Athletic Footwear";
    } else if (lower.includes("clothing") || lower.includes("clothing brand") || lower.includes("fashion brand")) {
      detectedBrandOrProduct = "Women's Clothing Brand";
    } else if (lower.includes("smartphone") || lower.includes("phone")) {
      detectedBrandOrProduct = "Smartphone";
    } else if (lower.includes("laptop") || lower.includes("gaming laptop")) {
      detectedBrandOrProduct = "Gaming Laptop";
    }
  }

  // 3. Detect Budget
  let detectedBudget: number | undefined;
  const budgetMatch = lower.match(/(?:₹|rs\.?|inr|budget\s*(?:of|is|:)?\s*(?:₹|rs\.?)?)\s*(\d+[\d,]*)/i);
  if (budgetMatch) {
    const rawNum = budgetMatch[1].replace(/,/g, "");
    const parsed = parseInt(rawNum, 10);
    if (!isNaN(parsed)) detectedBudget = parsed;
  } else if (lower.includes("10k") || lower.includes("10,000")) {
    detectedBudget = 10000;
  } else if (lower.includes("20k") || lower.includes("20,000")) {
    detectedBudget = 20000;
  } else if (lower.includes("35k") || lower.includes("35,000")) {
    detectedBudget = 35000;
  } else if (lower.includes("50k") || lower.includes("50,000")) {
    detectedBudget = 50000;
  }

  // 4. Detect Platform
  let detectedPlatform: string | undefined;
  if (lower.includes("instagram") || lower.includes("reel")) detectedPlatform = "Instagram";
  else if (lower.includes("youtube") || lower.includes("shorts")) detectedPlatform = "YouTube";
  else if (lower.includes("tiktok")) detectedPlatform = "TikTok";
  else if (lower.includes("linkedin")) detectedPlatform = "LinkedIn";

  // 5. Detect Video Format / Duration
  let detectedFormat: string | undefined;
  if (lower.includes("15-second") || lower.includes("15s") || lower.includes("15 second")) detectedFormat = "15-Second Reel";
  else if (lower.includes("30-second") || lower.includes("30s") || lower.includes("30 second")) detectedFormat = "30-Second Reel";
  else if (lower.includes("60s") || lower.includes("60-second")) detectedFormat = "60-Second Video";
  else if (lower.includes("ugc")) detectedFormat = "UGC Review";

  // 6. Detect Intent
  let intent: ChatbotIntentAnalysis["intent"] = "GENERAL";

  if (
    lower.includes("compare") ||
    lower.includes("comparison") ||
    lower.includes("versus") ||
    lower.includes("vs") ||
    (lower.includes("which") && lower.includes("best") && lower.includes("between"))
  ) {
    intent = "COMPARE_CREATORS";
  } else if (
    lower.includes("which creator") ||
    lower.includes("suggest creator") ||
    lower.includes("recommend creator") ||
    lower.includes("find creator") ||
    lower.includes("who is suitable") ||
    lower.includes("creators are suitable") ||
    lower.includes("creator is best")
  ) {
    intent = "RECOMMEND_CREATORS";
  } else if (
    lower.includes("which campaign") ||
    lower.includes("find campaign") ||
    lower.includes("match my skills") ||
    lower.includes("brands are suitable") ||
    lower.includes("suitable brands")
  ) {
    intent = "FIND_CAMPAIGNS";
  } else if (
    lower.includes("proposal") ||
    lower.includes("pitch") ||
    lower.includes("outreach") ||
    lower.includes("collaboration letter")
  ) {
    intent = "COLLABORATION_PROPOSAL";
  } else if (
    lower.includes("improve") && (lower.includes("profile") || lower.includes("portfolio") || lower.includes("match score"))
  ) {
    intent = "PROFILE_IMPROVEMENT";
  } else if (
    lower.includes("content idea") ||
    lower.includes("reel") ||
    lower.includes("script") ||
    lower.includes("hook") ||
    lower.includes("blueprint") ||
    lower.includes("caption") ||
    lower.includes("hashtag") ||
    lower.includes("15-second") ||
    lower.includes("30-second") ||
    lower.includes("video duration")
  ) {
    intent = "CONTENT_IDEAS";
  } else if (
    lower.includes("strategy for") ||
    lower.includes("promote a") ||
    lower.includes("marketing strategy") ||
    lower.includes("campaign idea for") ||
    (detectedBrandOrProduct && (lower.includes("promote") || lower.includes("market") || lower.includes("campaign")))
  ) {
    intent = "BRAND_PRODUCT_STRATEGY";
  } else if (
    lower.includes("brief") ||
    lower.includes("plan campaign") ||
    lower.includes("campaign plan")
  ) {
    intent = "PLAN_CAMPAIGN";
  }

  return {
    intent,
    detectedBrandOrProduct,
    detectedCategory,
    detectedBudget,
    detectedPlatform,
    detectedFormat,
  };
}

/**
 * Searches and ranks real creators matching the query parameters
 */
export function searchMatchingCreators({
  category,
  skills,
  budget,
  platform,
  limit = 3,
}: {
  category?: string;
  skills?: string[];
  budget?: number;
  platform?: string;
  limit?: number;
}): RecommendedCreatorItem[] {
  const allCreators = getStoredCreators();

  // Create a synthetic campaign query to score against
  const syntheticCampaign: CampaignRequirements = {
    title: "Dynamic Targeted Campaign",
    productOrService: "Target Product",
    category: category || "Beauty & Skincare",
    campaignGoal: "Engagement & High ROI Sales Conversion",
    targetAudience: "Target Demographic",
    requiredSkills: skills && skills.length > 0 ? skills : ["Content Creation", "Product Reviews", "UGC"],
    contentType: ["Instagram Reels", "UGC Review"],
    platform: platform || "Instagram",
    budget: budget ? `₹ ${budget.toLocaleString()}` : "₹ 25,000 - ₹ 40,000",
    deadline: "2 Weeks",
  };

  // Rank creators using the multi-factor scoring model
  const scored = allCreators.map((creator) => {
    const match = analyzeCreatorMatch(creator, syntheticCampaign);
    let adjustedScore = match.totalScore;

    // Direct category match priority
    if (category && creator.category.toLowerCase().includes(category.toLowerCase())) {
      adjustedScore = Math.max(88, adjustedScore);
    } else if (category && !creator.category.toLowerCase().includes(category.toLowerCase())) {
      adjustedScore = Math.min(55, adjustedScore);
    }

    return {
      creator,
      match,
      adjustedScore,
    };
  });

  scored.sort((a, b) => b.adjustedScore - a.adjustedScore);
  const selected = scored.slice(0, limit);

  return selected.map(({ creator, match, adjustedScore }) => {
    return {
      id: creator.id,
      name: creator.name,
      professionalTitle: creator.professionalTitle,
      category: creator.category,
      avatar: creator.avatar,
      followers: creator.followers,
      engagementRate: creator.engagementRate,
      clientRating: creator.clientRating,
      isVerified: creator.isVerified,
      priceRange: creator.priceRange,
      matchScore: adjustedScore,
      matchReasons: match.reasons.slice(0, 3),
      skills: creator.skills.slice(0, 4),
      profileUrl: `/creators/${creator.id}`,
    };
  });
}

/**
 * Compares two or three creators in depth
 */
export function compareCreatorsList(
  creatorsToCompare?: Creator[]
): {
  items: CreatorComparisonItem[];
  verdict: string;
} {
  const list = creatorsToCompare && creatorsToCompare.length > 0
    ? creatorsToCompare
    : getStoredCreators().slice(0, 3);

  const items: CreatorComparisonItem[] = list.map((c) => ({
    id: c.id,
    name: c.name,
    professionalTitle: c.professionalTitle,
    category: c.category,
    followers: c.followers,
    engagementRate: c.engagementRate,
    clientRating: c.clientRating,
    priceRange: c.priceRange,
    keyStrengths: c.skills.slice(0, 3),
    isVerified: c.isVerified,
    profileUrl: `/creators/${c.id}`,
  }));

  // Determine top engagement or highest rated
  const highestEngagement = [...list].sort((a, b) => b.engagementNum - a.engagementNum)[0];
  const highestRating = [...list].sort((a, b) => b.clientRating - a.clientRating)[0];

  let verdict = `### 🏆 Comparison Verdict & Best Match:
- **Best for Maximum Organic Engagement**: **${highestEngagement.name}** (${highestEngagement.engagementRate} engagement rate, ${highestEngagement.followers} audience). Best for viral Reels, comments, and authentic community discussions.
- **Best for Premium Brand Trust & Reviews**: **${highestRating.name}** (${highestRating.clientRating}/5.0 client rating across ${highestRating.reviewsCount} verified reviews). Best for high-converting conversions and commercial brand safety.
- **Recommendation**: If your campaign objective is viral brand awareness, select **${highestEngagement.name}**. If you need clinical product trust and high conversion rate, select **${highestRating.name}**.`;

  return { items, verdict };
}

/**
 * Searches real campaigns matching creator niche and skills
 */
export function searchMatchingCampaignsForCreator(
  creatorCategory?: string,
  _creatorSkills?: string[],
  limit = 3
): RecommendedCampaignItem[] {
  const cat = creatorCategory || "Beauty & Skincare";

  const scored = CAMPAIGN_PRESETS.map((camp) => {
    let score = 50;
    if (camp.category.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(camp.category.toLowerCase())) {
      score += 45;
    }
    return { camp, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, limit).map((s) => s.camp);

  return selected.map((camp) => ({
    id: camp.id || "campaign-1",
    title: camp.title,
    productOrService: camp.productOrService,
    category: camp.category,
    platform: camp.platform,
    budget: camp.budget,
    deadline: camp.deadline,
    deliverables: camp.contentType,
    whySuitable: `Strong category alignment with ${camp.category}. The brand is actively hiring creators for ${camp.contentType.join(" & ")} with a budget of ${camp.budget}.`,
  }));
}

/**
 * Generates rich, data-grounded system instructions for LLM
 */
export function buildEnhancedSystemPrompt({
  role,
  userName,
  userNiche,
  platform,
  targetAudience,
  brandOrProduct,
  tone,
  goal,
  preferredLanguage = "auto",
  detectedLanguage,
  isCodeSwitching,
  dialect,
}: {
  role: "brand" | "creator";
  userName: string;
  userNiche: string;
  platform: string;
  targetAudience: string;
  brandOrProduct?: string;
  tone: string;
  goal: string;
  preferredLanguage?: SupportedLanguageCode | string;
  detectedLanguage?: SupportedLanguageCode | string;
  isCodeSwitching?: boolean;
  dialect?: string;
}): string {
  // Determine effective response language
  const isExplicit = Boolean(preferredLanguage && preferredLanguage !== "auto");
  const targetLanguage = (isExplicit ? preferredLanguage : (detectedLanguage || "en")) as SupportedLanguageCode;
  const multilingualDirective = buildMultilingualPromptDirective({
    targetLanguage,
    isExplicitSelection: isExplicit,
    isCodeSwitching,
    dialect,
  });

  // Extract catalog highlights to ground the LLM in actual marketplace data
  const sampleCreators = getStoredCreators().slice(0, 15).map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    followers: c.followers,
    engagementRate: c.engagementRate,
    priceRange: c.priceRange,
    skills: c.skills.slice(0, 3).join(", "),
    collabs: c.previousBrandCollabs.slice(0, 2).join(", "),
  }));

  const sampleCampaigns = CAMPAIGN_PRESETS.slice(0, 6).map((cp) => ({
    id: cp.id,
    title: cp.title,
    category: cp.category,
    budget: cp.budget,
    deliverables: cp.contentType.join(", "),
  }));

  const isNonEnglish = targetLanguage !== "en" && targetLanguage !== "auto";
  const meta = getLanguageMetadata(targetLanguage);
  const topLanguageBanner = isNonEnglish
    ? `================================================================================
🚨 MANDATORY RESPONSE LANGUAGE DIRECTIVE: ${meta.name.toUpperCase()} (${meta.nativeName})
You MUST produce your entire user-facing response, explanations, creative scripts, hook lines, visual breakdowns, CTA, and markdown headings in ${meta.name} (${meta.nativeName})!
DO NOT DEFAULT TO ENGLISH.
${isExplicit ? `The user has explicitly selected ${meta.name} (${meta.nativeName}) as their response language.` : `The user's query language was detected as ${meta.name} (${meta.nativeName}).`}
Preserve only brand names (e.g. "GlowUp", "Nike", "VeriCreator"), creator names, URLs, timestamps (e.g. "(0:00 - 0:03)"), hashtags (e.g. "#GlowUp #UGCContent"), and platform names in English/Latin script. All other narrative, scripts, and explanations MUST be in natural, fluent ${meta.name} (${meta.nativeName}).
================================================================================\n\n`
    : "";

  return `${topLanguageBanner}You are the Official AI Marketplace Assistant for the "AI Content Creator Marketplace — Where Brands Find Verified AI Creators".
You are an expert creative director, influencer marketing strategist, talent scout, and brand consultant.

### AUTHENTICATED USER CONTEXT:
- Role: ${role === "brand" ? "Brand Owner / Campaign Manager" : "Content Creator / AI Influencer"}
- User Name: ${userName}
- Industry Focus / Niche: ${userNiche}
- Preferred Distribution Platform: ${platform}
- Target Audience: ${targetAudience}
${brandOrProduct ? `- Specific Brand / Product: ${brandOrProduct}` : ""}
- Communication Tone: ${tone}
- Primary Objective: ${goal}

### ACTUAL MARKETPLACE DATA AVAILABLE:
**Top Verified Creators Catalog**:
${sampleCreators.map((c) => `- ${c.name} (ID: "${c.id}") | Category: ${c.category} | ${c.followers} followers | ${c.engagementRate} engagement | Price: ${c.priceRange} | Skills: ${c.skills} | Past Collabs: ${c.collabs}`).join("\n")}

**Active Marketplace Campaigns**:
${sampleCampaigns.map((cp) => `- [${cp.title}] (Category: ${cp.category}, Budget: ${cp.budget}, Formats: ${cp.deliverables})`).join("\n")}

### YOUR DUAL-ROLE DIRECTIVES:

${
  role === "brand"
    ? `#### AS ASSISTANT FOR BRAND OWNERS:
1. **Creator Discovery & Recommendations**:
   - Recommend real creators from the catalog above by exact name and markdown link to their profile (e.g. "[Ananya Rao](/creators/ananya-rao)").
   - Give specific reasons based on verified skills, audience engagement rate, and past brand collaborations.
   - If user provides a budget (e.g. ₹10,000 or ₹35,000), explain how the creator's price range matches and what deliverables fit within that budget.
2. **Product & Brand Strategy**:
   - When asked about specific brands (e.g. Nike, Samsung, GlowUp) or products (skincare, clothing, tech gadgets), identify audience psychographics, format fit (15s vs 30s Reels), hook angles, and deliverables.
3. **Creator Comparisons**:
   - When asked to compare creators, analyze followers, engagement rate, client rating, format specialization, and give an objective verdict on who to hire.
4. **Campaign Briefs & Collaboration Plans**:
   - Draft actionable campaign briefs with deliverables, deadlines, usage rights, and performance benchmarks.`
    : `#### AS ASSISTANT FOR CONTENT CREATORS:
1. **Brand & Campaign Discovery**:
   - Recommend suitable brand categories and active campaigns from the marketplace matching the creator's niche and skills.
   - Explain why the creator is a strong fit and what deliverables brands look for.
2. **Product Content Ideas & Scripts**:
   - Suggest viral video ideas, 15s/30s Reel script outlines (with 0-3s hook, b-roll visuals, voiceover, and CTAs) for specific products.
3. **Collaboration Proposals & Pitches**:
   - Draft compelling, professional outreach DMs and email proposals tailored to specific brands.
4. **Profile & Portfolio Optimization**:
   - Advise on how to boost their Marketplace Match Score, complete Skill Passport assessments, and display verified client metrics.`
}

### CRITICAL RULES:
- Ground your answers in the marketplace data above. Whenever recommending a creator, use markdown link format: "[Creator Name](/creators/creator-id)".
- PAYMENT & ESCROW TRANSPARENCY: Payment processing, digital wallets, and automated escrow are NOT currently operational on this platform. Milestone compensation and payment terms must be agreed upon and settled separately between brand and creator via direct off-platform arrangements. Never claim or imply that the platform collects, holds, or releases escrow payments.
- Do not invent non-existent real-time live stock prices or speculative corporate partnerships. If external details are missing, provide structured strategic marketing frameworks and invite the user to specify further details.
- Format all responses with clear markdown headings (###, ####), bullet points, bold highlights, and code blocks for copy/scripts.${multilingualDirective ? `\n\n${multilingualDirective}` : ""}${isNonEnglish ? `\n\n### FINAL VERIFICATION BEFORE GENERATING:\n- Target Language: ${meta.name} (${meta.nativeName})\n- Rule: Ensure EVERY sentence of narrative, hooks, problem statements, and call-to-actions is in ${meta.name} (${meta.nativeName}). DO NOT OUTPUT ENGLISH PROSE.` : ""}`;
}

/**
 * Deterministic Comprehensive Heuristic Engine for Offline / Fallback Operation
 */
function executeRawSmartHeuristicResponse({
  userMessage,
  role,
  niche,
  name,
  platform,
  audience,
  brandOrProduct,
  tone,
  goal,
  effectiveLanguage = "en",
}: {
  userMessage: string;
  role: "creator" | "brand";
  niche: string;
  name: string;
  platform: string;
  audience: string;
  brandOrProduct?: string;
  tone: string;
  goal: string;
  effectiveLanguage?: SupportedLanguageCode;
}): {
  reply: string;
  recommendedCreators?: RecommendedCreatorItem[];
  recommendedCampaigns?: RecommendedCampaignItem[];
  comparisonData?: CreatorComparisonItem[];
  suggestedFollowUps: string[];
} {
  const analysis = analyzeChatbotIntent(userMessage);
  const targetCategory = analysis.detectedCategory || niche || "Beauty & Skincare";
  const targetBrand = analysis.detectedBrandOrProduct || brandOrProduct || "";
  const targetPlatform = analysis.detectedPlatform || platform || "Instagram";
  const lowerMsg = userMessage.toLowerCase();
  const strings = getChatbotStrings(effectiveLanguage);

  // ==========================================
  // PAYMENT & ESCROW TRANSPARENCY HANDLER
  // ==========================================
  if (
    lowerMsg.includes("escrow") ||
    lowerMsg.includes("how to pay") ||
    lowerMsg.includes("how do payments work") ||
    lowerMsg.includes("payment processing") ||
    lowerMsg.includes("hold funds")
  ) {
    const reply = buildLocalizedHeuristicEscrowNotice(effectiveLanguage);
    return {
      reply,
      suggestedFollowUps: strings.suggestedFollowUpsBrand.slice(0, 3),
    };
  }

  // ==========================================
  // INTENT 1: COMPARE CREATORS
  // ==========================================
  if (analysis.intent === "COMPARE_CREATORS") {
    const all = getStoredCreators();
    const categoryCreators = all.filter((c) => c.category.toLowerCase().includes(targetCategory.toLowerCase()));
    const toCompare = categoryCreators.length >= 2 ? categoryCreators.slice(0, 3) : all.slice(0, 3);
    const { items, verdict } = compareCreatorsList(toCompare);

    const tableRows = items.map(
      (c) => `| [${c.name}](${c.profileUrl}) | ${c.followers} | ${c.engagementRate} | ⭐ ${c.clientRating}/5.0 | ${c.priceRange} | ${c.isVerified ? "✅ Verified" : "Standard"} |`
    ).join("\n");

    const reply = buildLocalizedHeuristicComparison({
      category: targetCategory,
      tableRows,
      verdict,
      lang: effectiveLanguage,
    });

    return {
      reply,
      recommendedCreators: searchMatchingCreators({ category: targetCategory, limit: 3 }),
      comparisonData: items,
      suggestedFollowUps: strings.suggestedFollowUpsBrand.slice(0, 3),
    };
  }

  // ==========================================
  // INTENT 2: RECOMMEND CREATORS (Brand Owner)
  // ==========================================
  if (analysis.intent === "RECOMMEND_CREATORS" || (role === "brand" && (userMessage.toLowerCase().includes("creator") || userMessage.toLowerCase().includes("who is")))) {
    const creators = searchMatchingCreators({
      category: targetCategory,
      budget: analysis.detectedBudget,
      platform: targetPlatform,
      limit: 3,
    });

    const creatorNames = creators.map((c) => `**[${c.name}](${c.profileUrl})** (${c.followers} followers, ${c.engagementRate} engagement, ${c.priceRange})`).join("\n- ");

    const reply = buildLocalizedHeuristicRecommendations({
      brand: targetBrand,
      category: targetCategory,
      creatorNames,
      budget: analysis.detectedBudget,
      lang: effectiveLanguage,
    });

    return {
      reply,
      recommendedCreators: creators,
      suggestedFollowUps: strings.suggestedFollowUpsBrand.slice(0, 4),
    };
  }

  // ==========================================
  // INTENT 3: BRAND OR PRODUCT STRATEGY
  // ==========================================
  if (analysis.intent === "BRAND_PRODUCT_STRATEGY" || (targetBrand && userMessage.toLowerCase().includes("promote"))) {
    const known = KNOWN_BRANDS_CATALOG[targetBrand.toLowerCase()];
    const brandTitle = known ? known.brand : targetBrand || "Your Product";
    const brandCat = known ? known.category : targetCategory;
    const creators = searchMatchingCreators({ category: brandCat, limit: 2 });

    const reply = buildLocalizedHeuristicStrategy({
      brand: brandTitle,
      category: brandCat,
      platform: targetPlatform,
      tone,
      creators,
      lang: effectiveLanguage,
    });

    return {
      reply,
      recommendedCreators: creators,
      suggestedFollowUps: strings.suggestedFollowUpsBrand.slice(0, 4),
    };
  }

  // ==========================================
  // INTENT 4: FIND CAMPAIGNS (For Creators)
  // ==========================================
  if (analysis.intent === "FIND_CAMPAIGNS" || (role === "creator" && userMessage.toLowerCase().includes("campaign"))) {
    const campaigns = searchMatchingCampaignsForCreator(targetCategory, undefined, 3);
    const campaignList = campaigns
      .map(
        (cp) =>
          `#### 🎯 [${cp.title}](/brand/dashboard)
- **Product**: ${cp.productOrService} (${cp.category})
- **Platform & Formats**: ${cp.platform} — ${cp.deliverables.join(", ")}
- **Budget**: **${cp.budget}** | **Turnaround**: ${cp.deadline}
- **Why You Match**: ${cp.whySuitable}`
      )
      .join("\n\n");

    const reply = `### 💼 Matching Brand Campaigns for Your **${targetCategory}** Profile
Here are active marketplace campaigns looking for creators with your skills:

${campaignList}

---
#### 💡 Creator Next Steps:
1. Review the required deliverables and ensure your portfolio features relevant sample clips.
2. Submit a concise collaboration proposal stating your 30-day reach and 2 creative angles for their product.`;

    return {
      reply,
      recommendedCampaigns: campaigns,
      suggestedFollowUps: strings.suggestedFollowUpsCreator.slice(0, 4),
    };
  }

  // ==========================================
  // INTENT 5: COLLABORATION PROPOSAL (For Creators)
  // ==========================================
  if (analysis.intent === "COLLABORATION_PROPOSAL") {
    const brandName = targetBrand || "Brand Partner";
    const reply = buildLocalizedHeuristicProposal({
      brand: brandName,
      category: targetCategory,
      name,
      platform: targetPlatform,
      lang: effectiveLanguage,
    });

    return {
      reply,
      suggestedFollowUps: strings.suggestedFollowUpsCreator.slice(0, 3),
    };
  }

  // ==========================================
  // INTENT 6: PROFILE & PORTFOLIO IMPROVEMENT
  // ==========================================
  if (analysis.intent === "PROFILE_IMPROVEMENT") {
    const reply = buildLocalizedHeuristicProfileTips(effectiveLanguage);

    return {
      reply,
      suggestedFollowUps: strings.suggestedFollowUpsCreator.slice(0, 3),
    };
  }

  // ==========================================
  // INTENT 7: CONTENT IDEAS & VIDEO SCRIPTS / REEL BLUEPRINT (DEFAULT)
  // ==========================================
  const reply = buildLocalizedHeuristicBlueprint({
    brand: targetBrand || "GlowUp",
    category: targetCategory,
    platform: targetPlatform,
    format: analysis.detectedFormat || "Vertical Reel",
    tone,
    lang: effectiveLanguage,
  });

  return {
    reply,
    suggestedFollowUps: (role === "brand" ? strings.suggestedFollowUpsBrand : strings.suggestedFollowUpsCreator).slice(0, 4),
  };
}

/**
 * Multilingual-Aware Smart Heuristic Generator for Offline / Fallback Operation
 */
export function generateSmartHeuristicResponse({
  userMessage,
  role = "creator",
  niche = "Content Creation",
  name = "Friend",
  platform = "Instagram",
  audience = "General Audience",
  brandOrProduct,
  tone = "Friendly & Professional",
  goal = "Growth",
  preferredLanguage = "auto",
}: {
  userMessage: string;
  role?: "creator" | "brand";
  niche?: string;
  name?: string;
  platform?: string;
  audience?: string;
  brandOrProduct?: string;
  tone?: string;
  goal?: string;
  preferredLanguage?: SupportedLanguageCode | string;
}): {
  reply: string;
  recommendedCreators?: RecommendedCreatorItem[];
  recommendedCampaigns?: RecommendedCampaignItem[];
  comparisonData?: CreatorComparisonItem[];
  suggestedFollowUps: string[];
  detectedLanguage?: SupportedLanguageCode;
  effectiveLanguage?: SupportedLanguageCode;
  dir: "ltr" | "rtl";
} {
  const isExplicit = Boolean(preferredLanguage && preferredLanguage !== "auto");
  const detection = detectLanguage(userMessage, preferredLanguage);
  const effectiveLanguage = (isExplicit ? preferredLanguage : detection.detectedLanguage) as SupportedLanguageCode;
  const strings = getChatbotStrings(effectiveLanguage);
  const meta = getLanguageMetadata(effectiveLanguage);
  const localizedFollowUps = role === "brand" ? strings.suggestedFollowUpsBrand : strings.suggestedFollowUpsCreator;

  const rawResult = executeRawSmartHeuristicResponse({
    userMessage,
    role,
    niche,
    name,
    platform,
    audience,
    brandOrProduct,
    tone,
    goal,
    effectiveLanguage,
  });

  let finalReply = rawResult.reply;
  if (effectiveLanguage !== "en") {
    finalReply += `\n\n> 🌐 *[${meta.nativeName}] ${strings.fallbackNotice}*`;
  }

  return {
    ...rawResult,
    reply: finalReply,
    suggestedFollowUps:
      effectiveLanguage !== "en" && localizedFollowUps.length > 0
        ? localizedFollowUps
        : rawResult.suggestedFollowUps,
    detectedLanguage: detection.detectedLanguage,
    effectiveLanguage,
    dir: meta.dir,
  };
}
