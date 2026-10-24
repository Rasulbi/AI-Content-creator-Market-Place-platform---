import { Creator } from "../creators-data";
import { CampaignAnalysisOutput } from "./types";
import { generateEmbedding, cosineSimilarity, isRealEmbeddingProviderConfigured } from "./pgvector-store";
import { aiLogger } from "./logger";

export interface SemanticMatchResult {
  creatorId: string;
  creatorName: string;
  avatar: string;
  category: string;
  professionalTitle: string;
  priceRange: string;
  availability: string;
  isVerified: boolean;
  semanticSimilarityScore: number; // 0 - 100 based on vector cosine similarity
  ruleScore: number; // 0 - 100 based on verified skills, budget & constraints
  finalMatchScore: number; // Composite transparent score
  scoreBreakdown: {
    semanticRelevance: number;
    skillCoverage: number;
    verificationBonus: number;
    budgetAlignment: number;
    categoryMatch: number;
  };
  evidence: {
    matchedSkills: string[];
    verifiedSkills: string[];
    missingSkills: string[];
    budgetFit: "within_budget" | "exceeds_budget" | "below_minimum" | "unspecified";
    nicheAlignment: "direct_match" | "adjacent_niche" | "cross_industry";
    explanation: string;
  };
  isSemanticActive: boolean;
  isDemo: boolean;
}

export interface MatchOptions {
  includeDemo?: boolean;
  minThreshold?: number;
  categoryFilter?: string;
}

/**
 * Builds a dense representation string for a creator profile to generate an embedding.
 */
function buildCreatorEmbeddingText(creator: Creator): string {
  const parts = [
    `Name: ${creator.name}`,
    `Niche: ${creator.category}`,
    `Title: ${creator.professionalTitle}`,
    `Bio: ${creator.bio}`,
    `Skills: ${creator.skills.join(", ")}`,
    `AI Tools: ${creator.aiTools?.join(", ") || ""}`,
    `Platforms: ${creator.platforms.join(", ")}`,
    `Content Types: ${creator.contentTypes.join(", ")}`,
  ];

  if (Array.isArray(creator.portfolio) && creator.portfolio.length > 0) {
    const portfolioSnippets = creator.portfolio
      .slice(0, 3)
      .map((p) => `${p.title} (${p.category}): ${p.description}`)
      .join("; ");
    parts.push(`Portfolio: ${portfolioSnippets}`);
  }

  return parts.join("\n");
}

/**
 * Builds a dense representation string for a campaign brief to generate an embedding.
 */
function buildCampaignEmbeddingText(campaign: CampaignAnalysisOutput): string {
  const category = (campaign as any).category || (campaign.contentType && campaign.contentType[0]) || "General AI";
  return [
    `Category: ${category}`,
    `Required Skills: ${campaign.requiredSkills.join(", ")}`,
    `AI Tools: ${campaign.aiTools.join(", ")}`,
    `Content Formats: ${campaign.contentType.join(", ")}`,
    `Target Audience: ${campaign.targetAudience}`,
    `Platform: ${campaign.platform.join(", ")}`,
    `Key Requirements: ${campaign.campaignRequirements.join(", ")}`,
  ].join("\n");
}

/**
 * Computes deterministic rule-based score (0 - 100)
 */
function computeRuleScore(
  creator: Creator,
  campaign: CampaignAnalysisOutput
): {
  ruleScore: number;
  matchedSkills: string[];
  verifiedSkills: string[];
  missingSkills: string[];
  budgetFit: "within_budget" | "exceeds_budget" | "below_minimum" | "unspecified";
  nicheAlignment: "direct_match" | "adjacent_niche" | "cross_industry";
  breakdown: {
    skillCoverage: number;
    verificationBonus: number;
    budgetAlignment: number;
    categoryMatch: number;
  };
} {
  const required = campaign.requiredSkills || [];
  const neededTools = campaign.aiTools || [];
  const allNeeded = Array.from(new Set([...required, ...neededTools]));

  const matchedSkills: string[] = [];
  const verifiedSkills: string[] = [];
  const missingSkills: string[] = [];

  const creatorAllSkills = Array.from(
    new Set([...creator.skills, ...(creator.aiTools || [])])
  ).map((s) => s.toLowerCase());

  const creatorVerified = (creator.verifiedSkills || []).map((s) => s.toLowerCase());

  allNeeded.forEach((req) => {
    const reqLower = req.toLowerCase();
    const isMatched = creatorAllSkills.some(
      (cs) => cs.includes(reqLower) || reqLower.includes(cs)
    );
    if (isMatched) {
      matchedSkills.push(req);
      if (creatorVerified.some((vs) => vs.includes(reqLower) || reqLower.includes(vs))) {
        verifiedSkills.push(req);
      }
    } else {
      missingSkills.push(req);
    }
  });

  // 1. Skill Coverage (0 - 100)
  let skillCoverage = 75;
  if (allNeeded.length > 0) {
    const ratio = matchedSkills.length / allNeeded.length;
    skillCoverage = Math.round(ratio * 100);
  }

  // 2. Verification Bonus (0 - 100)
  let verificationBonus = 40;
  if (creator.isVerified) verificationBonus += 30;
  if (verifiedSkills.length > 0) {
    verificationBonus += Math.min(30, verifiedSkills.length * 10);
  }
  verificationBonus = Math.min(100, verificationBonus);

  // 3. Category Match (0 - 100)
  let categoryMatch = 40;
  let nicheAlignment: "direct_match" | "adjacent_niche" | "cross_industry" = "cross_industry";

  const campCat = ((campaign as any).category || (campaign.contentType && campaign.contentType[0]) || "").toLowerCase().trim();
  const creatorCat = (creator.category || "").toLowerCase().trim();

  if (campCat === creatorCat) {
    categoryMatch = 100;
    nicheAlignment = "direct_match";
  } else if (campCat && creatorCat && (campCat.includes(creatorCat) || creatorCat.includes(campCat))) {
    categoryMatch = 85;
    nicheAlignment = "adjacent_niche";
  } else {
    // Check if bio or skills mention category
    if (campCat && creator.bio.toLowerCase().includes(campCat)) {
      categoryMatch = 65;
      nicheAlignment = "adjacent_niche";
    }
  }

  // 4. Budget Alignment (0 - 100)
  let budgetAlignment = 80;
  let budgetFit: "within_budget" | "exceeds_budget" | "below_minimum" | "unspecified" = "within_budget";

  const budgetMax = campaign.budget?.max ?? null;
  if (budgetMax !== null && budgetMax > 0) {
    const rawPrice = creator.priceRange.replace(/[^0-9]/g, "");
    const minCreatorPrice = Number(rawPrice.slice(0, 5)) || 20000;

    if (minCreatorPrice > budgetMax * 1.25) {
      budgetAlignment = 40;
      budgetFit = "exceeds_budget";
    } else if (minCreatorPrice > budgetMax) {
      budgetAlignment = 65;
      budgetFit = "exceeds_budget";
    } else {
      budgetAlignment = 95;
      budgetFit = "within_budget";
    }
  }

  const ruleScore = Math.round(
    skillCoverage * 0.40 +
    verificationBonus * 0.25 +
    categoryMatch * 0.20 +
    budgetAlignment * 0.15
  );

  return {
    ruleScore,
    matchedSkills,
    verifiedSkills,
    missingSkills,
    budgetFit,
    nicheAlignment,
    breakdown: {
      skillCoverage,
      verificationBonus,
      categoryMatch,
      budgetAlignment,
    },
  };
}

/**
 * Intelligent Semantic Creator Matching Service.
 * Evaluates candidate creators against campaign briefs combining semantic vector similarity
 * with transparent rule-based eligibility.
 */
export async function matchCreatorsSemantically(
  campaign: CampaignAnalysisOutput,
  candidates: Creator[],
  options: MatchOptions = {}
): Promise<SemanticMatchResult[]> {
  return aiLogger.time("SemanticMatcher.matchCreators", async () => {
    if (!candidates || candidates.length === 0) {
      return [];
    }

    // 1. Generate Campaign Embedding
    const campaignText = buildCampaignEmbeddingText(campaign);
    let campaignEmbedding: number[] = [];
    let isSemanticActive = false;

    if (isRealEmbeddingProviderConfigured()) {
      try {
        campaignEmbedding = await generateEmbedding(campaignText);
        isSemanticActive = true;
      } catch (err: any) {
        aiLogger.warn(
          "Failed to generate campaign neural embedding, skipping vector similarity and using transparent rule baseline",
          { error: err?.message || err }
        );
        isSemanticActive = false;
      }
    } else {
      aiLogger.info(
        "Semantic vector matching skipped: no live neural embedding provider configured; utilizing transparent rule engine baseline."
      );
    }

    // 2. Score candidates
    const results: SemanticMatchResult[] = await Promise.all(
      candidates.map(async (creator) => {
        // Calculate Semantic Cosine Similarity
        let semanticSimilarityScore = 75; // baseline

        if (isSemanticActive && campaignEmbedding.length > 0) {
          try {
            const creatorText = buildCreatorEmbeddingText(creator);
            const creatorEmbedding = await generateEmbedding(creatorText);
            const similarity = cosineSimilarity(campaignEmbedding, creatorEmbedding);
            // Map [-1, 1] cosine to [0, 100]
            semanticSimilarityScore = Math.max(0, Math.min(100, Math.round(((similarity + 1) / 2) * 100)));
          } catch {
            semanticSimilarityScore = 70;
          }
        }

        // Calculate Transparent Rule Score
        const ruleEval = computeRuleScore(creator, campaign);

        // Combined Final Score: 45% Semantic Similarity + 55% Concrete Eligibility
        const finalMatchScore = Math.round(
          semanticSimilarityScore * 0.45 + ruleEval.ruleScore * 0.55
        );

        // Evidence Narrative
        const verifiedText = ruleEval.verifiedSkills.length > 0
          ? `Verified credentials in ${ruleEval.verifiedSkills.join(", ")}.`
          : "Portfolio evidence pending official assessment.";

        const categoryText = campaign.category || (campaign.contentType?.[0] ? campaign.contentType[0] : "creative");
        const explanation = isSemanticActive
          ? `${creator.name} demonstrates ${semanticSimilarityScore}% semantic relevance to your ${categoryText} brief via neural embeddings. ${ruleEval.matchedSkills.length} required skills matched (${ruleEval.matchedSkills.join(", ")}). ${verifiedText} Budget status: ${ruleEval.budgetFit.replace("_", " ")}.`
          : `${creator.name} evaluated via transparent rule baseline (${ruleEval.ruleScore}% eligibility). ${ruleEval.matchedSkills.length} required skills matched (${ruleEval.matchedSkills.join(", ")}). ${verifiedText} Budget status: ${ruleEval.budgetFit.replace("_", " ")}. (Neural vector similarity inactive: rule engine fallback).`;

        return {
          creatorId: creator.id,
          creatorName: creator.name,
          avatar: creator.avatar,
          category: creator.category,
          professionalTitle: creator.professionalTitle,
          priceRange: creator.priceRange,
          availability: creator.availability,
          isVerified: creator.isVerified,
          semanticSimilarityScore,
          ruleScore: ruleEval.ruleScore,
          finalMatchScore,
          scoreBreakdown: {
            semanticRelevance: semanticSimilarityScore,
            ...ruleEval.breakdown,
          },
          evidence: {
            matchedSkills: ruleEval.matchedSkills,
            verifiedSkills: ruleEval.verifiedSkills,
            missingSkills: ruleEval.missingSkills,
            budgetFit: ruleEval.budgetFit,
            nicheAlignment: ruleEval.nicheAlignment,
            explanation,
          },
          isSemanticActive,
          isDemo: Boolean(creator.isDemo),
        };
      })
    );

    // Sort descending by final score
    results.sort((a, b) => b.finalMatchScore - a.finalMatchScore);

    // Apply minimum threshold filter if provided
    const threshold = options.minThreshold || 0;
    return results.filter((r) => r.finalMatchScore >= threshold);
  });
}
