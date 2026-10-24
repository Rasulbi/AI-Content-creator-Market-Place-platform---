import {
  VerifyCreatorsInput,
  VerifyCreatorsInputSchema,
  VerifyCreatorsOutput,
  VerifyCreatorsOutputSchema,
  CreatorVerificationItem,
  VerificationStatus,
  AccuracyScoreBreakdown,
} from "./verification-types";
import { CREATORS_DATA, Creator } from "../creators-data";
import { getAIProvider } from "./provider-factory";
import { AIModelProvider } from "./provider-interface";
import { GrokProvider } from "./grok-provider";
import { aiLogger } from "./logger";

export class VerificationService {
  private explicitProvider?: AIModelProvider;

  constructor(provider?: AIModelProvider) {
    if (provider) {
      this.explicitProvider = provider;
    }
  }

  get provider(): AIModelProvider {
    return this.explicitProvider || getAIProvider();
  }

  /**
   * Generates authentic handle and profile URL for the creator
   */
  private getSocialProfile(creator: Creator, targetPlatform: string): {
    platform: string;
    handle: string;
    profileUrl: string;
  } {
    const isYouTubeTarget = targetPlatform.toLowerCase().includes("youtube");
    const supportsYouTube = creator.platforms.some((p) => p.toLowerCase().includes("youtube"));

    const platformName = isYouTubeTarget && supportsYouTube ? "YouTube" : "Instagram";
    const cleanHandle = `@${creator.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const handle = `${cleanHandle}.demo`;
    // Internal verified marketplace profile route to prevent misleading external links
    const profileUrl = `/creators/${creator.id}`;

    return {
      platform: platformName,
      handle,
      profileUrl,
    };
  }

  /**
   * Deterministic 5-factor accuracy score calculator
   */
  public evaluateAccuracyAndEvidence(
    creator: Creator,
    input: VerifyCreatorsInput
  ): {
    accuracyScore: number;
    verificationStatus: VerificationStatus;
    breakdown: AccuracyScoreBreakdown;
    verifiedDetails: string[];
    unverifiedDetails: string[];
    matchExplanation: string;
    evidenceSources: string[];
  } {
    const brandLower = input.brandName.toLowerCase();
    const productLower = input.productName.toLowerCase();
    const categoryLower = input.category.toLowerCase();
    const platformLower = input.platform.toLowerCase();

    // 1. Identity & Authenticity Evidence (25% Weight)
    let identityScore = 30; // base registered creator
    if (creator.isVerified) identityScore += 35;
    if (creator.verifiedSkills && creator.verifiedSkills.length > 0) {
      identityScore += Math.min(20, creator.verifiedSkills.length * 6);
    }
    if (creator.clientRating >= 4.7 && creator.reviewsCount >= 15) {
      identityScore += 15;
    }
    identityScore = Math.min(100, identityScore);

    // 2. Brand & Product Relevance (30% Weight)
    let brandScore = 20;
    // Check if brand is in past collaborations
    const hasDirectBrandCollab = creator.previousBrandCollabs.some(
      (b) => b.toLowerCase().includes(brandLower) || brandLower.includes(b.toLowerCase())
    );
    if (hasDirectBrandCollab) {
      brandScore += 45;
    } else {
      // Check for related category brands
      const hasCategoryCollabs = creator.previousBrandCollabs.length > 0;
      if (hasCategoryCollabs) brandScore += 25;
    }

    // Check portfolio for product keywords or category alignment
    const matchesProductKeywords = creator.portfolio.some(
      (p) =>
        p.title.toLowerCase().includes(productLower) ||
        p.description.toLowerCase().includes(productLower) ||
        productLower.split(" ").some((w) => w.length > 3 && (p.title.toLowerCase().includes(w) || p.description.toLowerCase().includes(w)))
    );
    if (matchesProductKeywords) brandScore += 20;

    // Check format alignment
    const formatOverlap = (input.contentTypes || []).some((fmt) =>
      creator.contentTypes.some((c) => c.toLowerCase().includes(fmt.toLowerCase()))
    );
    if (formatOverlap) brandScore += 15;
    brandScore = Math.min(100, brandScore);

    // 3. Audience & Niche Relevance (25% Weight)
    let audienceScore = 15;
    const isCategoryExact = creator.category.toLowerCase() === categoryLower;
    // Adjacent pairings (e.g. Beauty & Fashion, Food & Lifestyle, Fitness & Wellness)
    const isAdjacent =
      (creator.category === "Beauty & Skincare" && input.category === "Fashion") ||
      (creator.category === "Fashion" && input.category === "Beauty & Skincare") ||
      (creator.category === "Food" && input.category === "Fitness & Wellness") ||
      (creator.category === "Fitness & Wellness" && input.category === "Food") ||
      (creator.category === "Travel & Lifestyle" && input.category === "Fashion");

    if (isCategoryExact) {
      audienceScore += 60;
    } else if (isAdjacent) {
      audienceScore += 35;
    } else {
      audienceScore += 10;
    }

    // Platform presence
    const hasPlatform = creator.platforms.some((p) => p.toLowerCase().includes(platformLower));
    if (hasPlatform) {
      audienceScore += 20;
    } else {
      audienceScore += 5;
    }

    // Audience alignment in bio/experience
    if (
      creator.bio.toLowerCase().includes(categoryLower) ||
      (creator.experience && creator.experience.toLowerCase().includes(categoryLower))
    ) {
      audienceScore += 10;
    }
    audienceScore = Math.min(100, audienceScore);

    // 4. Engagement & Audience Reliability (10% Weight)
    let engagementScore = 50;
    if (creator.engagementNum >= 8.0) {
      engagementScore = 100;
    } else if (creator.engagementNum >= 6.5) {
      engagementScore = 85;
    } else if (creator.engagementNum >= 5.0) {
      engagementScore = 70;
    } else {
      engagementScore = 55;
    }

    // 5. Profile Completeness & Consistency (10% Weight)
    let completenessScore = 30;
    if (creator.bio && creator.bio.length > 50) completenessScore += 20;
    if (creator.experience && creator.experience.length > 30) completenessScore += 20;
    if (creator.aiTools && creator.aiTools.length >= 3) completenessScore += 15;
    if (creator.priceRange) completenessScore += 15;
    completenessScore = Math.min(100, completenessScore);

    // Total Composite Accuracy Score
    const compositeScore = Math.round(
      identityScore * 0.25 +
      brandScore * 0.30 +
      audienceScore * 0.25 +
      engagementScore * 0.10 +
      completenessScore * 0.10
    );

    // Verification Status Determination
    let status: VerificationStatus;
    if (compositeScore >= 75 && identityScore >= 70 && isCategoryExact && audienceScore >= 60 && brandScore >= 45) {
      status = "Verified";
    } else if (compositeScore >= 45 && (isCategoryExact || isAdjacent)) {
      status = "Partially Verified";
    } else {
      status = "Not Verified";
    }

    // Verified Details Checklist
    const verifiedDetails: string[] = [];
    if (creator.isVerified) {
      verifiedDetails.push("Identity verified via Marketplace creator authentication & portfolio audit");
    }
    if (creator.verifiedSkills && creator.verifiedSkills.length > 0) {
      verifiedDetails.push(
        `Independently verified skills: ${creator.verifiedSkills.join(", ")}`
      );
    }
    if (hasDirectBrandCollab) {
      verifiedDetails.push(
        `Confirmed prior commercial collaboration with "${input.brandName}" on record`
      );
    } else if (creator.previousBrandCollabs.length > 0) {
      verifiedDetails.push(
        `Verified past commercial partnerships: ${creator.previousBrandCollabs.slice(0, 3).join(", ")}`
      );
    }
    if (hasPlatform) {
      verifiedDetails.push(
        `Active verified creator on ${input.platform} with ${creator.followers} reach & ${creator.engagementRate} engagement`
      );
    }
    if (isCategoryExact) {
      verifiedDetails.push(
        `Deep domain authority in ${creator.category} with ${creator.portfolioCount} cataloged campaign deliverables`
      );
    }
    if (creator.clientRating >= 4.7) {
      verifiedDetails.push(
        `Superb client satisfaction score: ${creator.clientRating}/5.0 across ${creator.reviewsCount} brand reviews`
      );
    }

    // Unverified Details & Gaps
    const unverifiedDetails: string[] = [];
    if (!hasDirectBrandCollab) {
      unverifiedDetails.push(
        `No direct historical partnership with "${input.brandName}" in verified marketplace logs`
      );
    }
    if (!isCategoryExact) {
      unverifiedDetails.push(
        `Category variance: Primary focus is ${creator.category} rather than ${input.category}`
      );
    }
    if (!hasPlatform) {
      unverifiedDetails.push(
        `Requested platform "${input.platform}" is not primary focus (prefers ${creator.platforms.join(", ")})`
      );
    }
    unverifiedDetails.push(
      "Live audience demographic telemetry relies on latest platform audit snapshot (OAuth continuous sync optional)"
    );

    // Contextual Match Explanation
    let matchExplanation = "";
    if (status === "Verified") {
      matchExplanation = `${creator.name} is a high-confidence match for ${input.brandName}'s ${input.productName} campaign. With ${creator.followers} followers and ${creator.engagementRate} engagement in ${creator.category}, they possess verified skills in ${creator.verifiedSkills.slice(0, 3).join(", ")}. Proven track record with brands like ${creator.previousBrandCollabs.slice(0, 2).join(" & ")}.`;
    } else if (status === "Partially Verified") {
      matchExplanation = `${creator.name} demonstrates solid creative competence with ${creator.followers} followers, but exhibits partial alignment. While their content formats and production quality meet criteria, their primary focus (${creator.category}) requires custom messaging adaptation for ${input.productName}.`;
    } else {
      matchExplanation = `${creator.name} is currently not verified for this specific brief due to low domain overlap. Specializing primarily in ${creator.category}, their audience profile and skill set do not align with ${input.brandName}'s target objectives for ${input.productName}.`;
    }

    // Evidence Sources
    const evidenceSources = [
      "Marketplace Creator Identity & KYC Registry",
      `Published Creative Portfolio Audits (${creator.portfolioCount} projects)`,
      `Client Review Archive (${creator.reviewsCount} reviews, ${creator.clientRating}/5.0 rating)`,
      `Verified Social Performance Logs (${creator.followers} audience, ${creator.engagementRate} engagement)`,
    ];

    return {
      accuracyScore: compositeScore,
      verificationStatus: status,
      breakdown: {
        identityAuthenticity: identityScore,
        brandProductRelevance: brandScore,
        audienceNicheRelevance: audienceScore,
        engagementReliability: engagementScore,
        profileCompleteness: completenessScore,
      },
      verifiedDetails,
      unverifiedDetails,
      matchExplanation,
      evidenceSources,
    };
  }

  /**
   * Main verification entrypoint
   */
  async verifyCreators(input: VerifyCreatorsInput): Promise<VerifyCreatorsOutput> {
    return aiLogger.time("VerificationService.verifyCreators", async () => {
      // 1. Validate input schema
      const validatedInput = VerifyCreatorsInputSchema.parse(input);

      // 2. Resolve creator catalog
      const rawCatalog: Creator[] =
        Array.isArray(validatedInput.creators) && validatedInput.creators.length > 0
          ? (validatedInput.creators as Creator[])
          : CREATORS_DATA;

      // Filter catalog strictly to the selected industry / category
      // Requirement: "ప్రతి industryకి చెందిన creators మాత్రమే AI verification తర్వాత కనిపించాలి."
      const categoryLower = validatedInput.category.toLowerCase().trim();

      let targetCatalog = rawCatalog.filter((creator) => {
        const creatorCat = creator.category.toLowerCase().trim();
        if (creatorCat === categoryLower) return true;
        if (creatorCat.includes(categoryLower) || categoryLower.includes(creatorCat)) return true;
        return false;
      });

      // If user typed a custom/Other industry (e.g. "Fintech", "Web3") without exact match:
      if (targetCatalog.length === 0) {
        targetCatalog = rawCatalog.filter((creator) =>
          creator.bio.toLowerCase().includes(categoryLower) ||
          creator.skills.some((s) => s.toLowerCase().includes(categoryLower)) ||
          creator.contentTypes.some((ct) => ct.toLowerCase().includes(categoryLower))
        );
      }

      // If still empty (completely novel industry), adapt top 5 cross-industry creators
      if (targetCatalog.length === 0) {
        targetCatalog = rawCatalog.slice(0, 5);
      }

      // 3. Compute deterministic evidence & scores for targeted creators
      const initialVerifications: CreatorVerificationItem[] = targetCatalog.map((creator) => {
        const social = this.getSocialProfile(creator, validatedInput.platform);
        const evalResult = this.evaluateAccuracyAndEvidence(creator, validatedInput);

        return {
          creatorId: creator.id,
          creatorName: creator.name,
          avatar: creator.avatar,
          professionalTitle: creator.professionalTitle,
          category: creator.category,
          location: creator.location,
          primaryPlatform: social.platform,
          socialHandle: social.handle,
          profileUrl: social.profileUrl,
          followers: creator.followers,
          followersCount: creator.followersCount,
          engagementRate: creator.engagementRate,
          engagementNum: creator.engagementNum,
          accuracyScore: evalResult.accuracyScore,
          verificationStatus: evalResult.verificationStatus,
          breakdown: evalResult.breakdown,
          verifiedDetails: evalResult.verifiedDetails,
          unverifiedDetails: evalResult.unverifiedDetails,
          matchExplanation: evalResult.matchExplanation,
          evidenceSources: evalResult.evidenceSources,
          verificationTimestamp: new Date().toISOString(),
          modelUsed: "Rule-Based Audit Engine",
          isAIAssisted: false,
          isFallback: true,
          engine: "heuristic_fallback",
          portfolioCount: creator.portfolioCount,
          clientRating: creator.clientRating,
          reviewsCount: creator.reviewsCount,
          priceRange: creator.priceRange,
          availability: creator.availability,
          verifiedSkills: creator.verifiedSkills || [],
          isDemo: Boolean(creator.isDemo !== false),
          demoNotice: "Demo Sandbox Profile: Social handles and telemetry are demonstration data. Real-world account verification requires live OAuth API sync.",
          matchScoreLabel: "AI Campaign Match Score",
          authenticityNotice: "This AI score measures campaign requirements matching only. Real account authenticity & identity verification requires separate verified evidence (KYC & Live Platform API).",
        };
      });

      // 4. AI-Enhanced Reasoning if provider is configured
      let engine: "ai_model" | "heuristic_fallback" = "heuristic_fallback";
      let activeProviderName = "Heuristic Audit Engine";
      let isFallback = true;
      let finalVerifications = initialVerifications;

      // Try active provider or fallback provider (e.g. Groq if OpenRouter has 0 credits)
      const providersToTry: AIModelProvider[] = [];
      if (this.provider.isConfigured()) {
        providersToTry.push(this.provider);
      }
      // If primary is OpenRouter and Groq is configured, add Groq as secondary option
      if (this.provider.id === "openrouter") {
        const groq = new GrokProvider();
        if (groq.isConfigured()) {
          providersToTry.push(groq);
        }
      }

      for (const prov of providersToTry) {
        try {
          const topCandidates = initialVerifications.slice(0, 3);
          const prompt = `Review the AI profile verification results for campaign:
Brand: "${validatedInput.brandName}"
Product: "${validatedInput.productName}"
Category: "${validatedInput.category}"
Target Platform: "${validatedInput.platform}"

Creators under evaluation:
${topCandidates
  .map(
    (c) =>
      `- ID: ${c.creatorId}, Name: ${c.creatorName}, Category: ${c.category}, Score: ${c.accuracyScore}%, Status: ${c.verificationStatus}`
  )
  .join("\n")}

For each creator, provide a refined 1-2 sentence evidence-backed explanation of why they are verified, partially verified, or not verified for "${validatedInput.productName}". Return JSON array of objects: [{ "creatorId": string, "matchExplanation": string }]`;

          const systemInstruction =
            "You are a Senior Creator Verification Officer. Provide concise, factual, and strictly evidence-based assessments. Do not fabricate metrics or claims.";

          const aiResult = await prov.generateStructuredJSON<
            Array<{ creatorId: string; matchExplanation: string }>
          >(prompt, systemInstruction);

          if (Array.isArray(aiResult) && aiResult.length > 0) {
            finalVerifications = initialVerifications.map((item) => {
              const matchedAI = aiResult.find((r) => r.creatorId === item.creatorId);
              if (matchedAI && matchedAI.matchExplanation) {
                return {
                  ...item,
                  matchExplanation: matchedAI.matchExplanation,
                  modelUsed: prov.model,
                  isAIAssisted: true,
                  isFallback: false,
                  engine: "ai_model" as const,
                };
              }
              return item;
            });
            engine = "ai_model";
            activeProviderName = prov.name;
            isFallback = false;
            break; // Successfully enhanced
          }
        } catch (err) {
          aiLogger.warn(`AI Provider ${prov.name} verification failed, trying next or fallback`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Sort: Verified first, then by accuracy score descending
      finalVerifications.sort((a, b) => {
        const statusPriority: Record<VerificationStatus, number> = {
          Verified: 3,
          "Partially Verified": 2,
          "Not Verified": 1,
        };
        const priorityDiff = statusPriority[b.verificationStatus] - statusPriority[a.verificationStatus];
        if (priorityDiff !== 0) return priorityDiff;
        return b.accuracyScore - a.accuracyScore;
      });

      const verifiedCount = finalVerifications.filter((c) => c.verificationStatus === "Verified").length;
      const partiallyVerifiedCount = finalVerifications.filter(
        (c) => c.verificationStatus === "Partially Verified"
      ).length;
      const notVerifiedCount = finalVerifications.filter((c) => c.verificationStatus === "Not Verified").length;

      const output: VerifyCreatorsOutput = {
        verifications: finalVerifications,
        verifiedCount,
        partiallyVerifiedCount,
        notVerifiedCount,
        campaignSummary: {
          brandName: validatedInput.brandName,
          productName: validatedInput.productName,
          category: validatedInput.category,
          platform: validatedInput.platform,
        },
        engine,
        provider: activeProviderName,
        timestamp: new Date().toISOString(),
        isAIAssisted: !isFallback,
        isFallback,
      };

      return VerifyCreatorsOutputSchema.parse(output);
    });
  }
}

export const verificationService = new VerificationService();
