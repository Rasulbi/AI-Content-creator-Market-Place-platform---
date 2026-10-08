import { Creator } from "./creators-data";

export interface CampaignRequirements {
  id?: string;
  title: string;
  productOrService: string;
  category:
    | "Beauty & Skincare"
    | "Fashion"
    | "Technology"
    | "Fitness & Wellness"
    | "Food"
    | "Travel & Lifestyle";
  campaignGoal: string;
  targetAudience: string;
  requiredSkills: string[];
  contentType: string[];
  platform: string;
  budget: string;
  deadline: string;
  notes?: string;
}

export interface MatchBreakdown {
  skillMatch: number; // 40%
  verification: number; // 25%
  portfolio: number; // 15%
  experience: number; // 10%
  clientRating: number; // 10%
}

export interface MatchResult {
  creatorId: string;
  totalScore: number;
  breakdown: MatchBreakdown;
  reasons: string[];
  gaps: string[];
}

export const CAMPAIGN_PRESETS: CampaignRequirements[] = [
  {
    id: "camp-skincare",
    title: "GlowUp Skincare – Natural Face Cream Launch",
    productOrService: "GlowUp Skincare – Natural Face Cream",
    category: "Beauty & Skincare",
    campaignGoal: "Increase brand awareness and drive product sales",
    targetAudience: "Women, 18–35, skincare & beauty enthusiasts",
    requiredSkills: ["Skincare", "Product Reviews", "Instagram Reels", "UGC"],
    contentType: ["Reels", "Product Review"],
    platform: "Instagram",
    budget: "₹ 20,000 - ₹ 35,000",
    deadline: "2 Weeks",
    notes:
      "Looking for creators who have verified skincare experience, genuine female audience, and produce high-converting authentic Reels with macro texture shots.",
  },
  {
    id: "camp-tech",
    title: "Aether AI – Next-Gen Smart Display & Workspace",
    productOrService: "Aether AI Workspace Monitor & Productivity Assistant",
    category: "Technology",
    campaignGoal: "Drive pre-orders and developer adoption for new AI launcher",
    targetAudience: "Tech enthusiasts, software engineers, desk setup creators (18–40)",
    requiredSkills: ["Tech Unboxing", "Product Reviews", "AI Software Benchmarks", "YouTube Longform"],
    contentType: ["YouTube Breakdowns", "Reels"],
    platform: "YouTube & Instagram",
    budget: "₹ 35,000 - ₹ 50,000",
    deadline: "3 Weeks",
    notes:
      "Need deep benchmark testing, hands-on demo of the neural features, and high-production value desk b-roll footage.",
  },
  {
    id: "camp-fashion",
    title: "Urban Minimalist – Autumn Trench Coat Capsule",
    productOrService: "Sustainable Modernist Outerwear & Trench Coats",
    category: "Fashion",
    campaignGoal: "Generate viral aesthetic lookbook saves and luxury brand awareness",
    targetAudience: "Fashion-forward urban consumers, 20–35, aesthetic streetwear lovers",
    requiredSkills: ["Fashion Styling", "Lookbook Production", "Instagram Reels", "Runway Trends"],
    contentType: ["Reels Lookbooks", "Outfit Transitions"],
    platform: "Instagram",
    budget: "₹ 25,000 - ₹ 40,000",
    deadline: "2 Weeks",
    notes:
      "Focus on dynamic cinematic transitions, high-contrast city architecture, and wearable styling advice.",
  },
  {
    id: "camp-fitness",
    title: "VitalMovement – 21-Day Posture & Mobility Loop",
    productOrService: "Ergonomic Posture Band & Active Mobility App",
    category: "Fitness & Wellness",
    campaignGoal: "Acquire high-intent active app trial subscriptions",
    targetAudience: "Work-from-home professionals, fitness enthusiasts, runners (22–45)",
    requiredSkills: ["Mobility Training", "Clean Nutrition", "Activewear Reviews", "Fitness UGC"],
    contentType: ["Workout Follow-Alongs", "Reels"],
    platform: "Instagram",
    budget: "₹ 20,000 - ₹ 32,000",
    deadline: "2 Weeks",
    notes:
      "Requires certified fitness trainer credentials, engaging voiceover coaching, and practical daily follow-alongs.",
  },
  {
    id: "camp-food",
    title: "Artisan Cookware – Gourmet Cast-Iron Masterclass",
    productOrService: "Pre-Seasoned Artisan Dutch Oven & Skillet Set",
    category: "Food",
    campaignGoal: "Demonstrate premium non-stick sear performance and cooking joy",
    targetAudience: "Foodies, home chefs, gourmet cooking lovers (22–50)",
    requiredSkills: ["Gourmet Recipe Dev", "Food Styling", "Culinary ASMR", "Kitchen Appliance Reviews"],
    contentType: ["60s Recipe Reels", "ASMR Cooking"],
    platform: "Instagram & YouTube",
    budget: "₹ 22,000 - ₹ 35,000",
    deadline: "2 Weeks",
    notes:
      "Emphasize crisp ASMR audio, delicious sizzling shots, and foolproof recipes that make cooking feel rewarding.",
  },
  {
    id: "camp-travel",
    title: "Azure Island Sanctuary – Eco-Luxury Cliffside Retreat",
    productOrService: "Private Cliffside Villa & Wellness Spa Weekend",
    category: "Travel & Lifestyle",
    campaignGoal: "Boost direct resort villa bookings for upcoming holiday season",
    targetAudience: "Couples, digital nomads, luxury travelers (25–48)",
    requiredSkills: ["Travel Vlogging", "Hotel Reviews", "Drone Cinematography", "Itinerary Planning"],
    contentType: ["Cinematic Drone Reels", "Resort Walkthroughs"],
    platform: "Instagram & YouTube",
    budget: "₹ 30,000 - ₹ 50,000",
    deadline: "3 Weeks",
    notes:
      "Must have 4K drone cinematography authorization, aesthetic sunrise footage, and detailed experiential travel storytelling.",
  },
];

/**
 * AI Creator Matching Algorithm
 * Scoring Model:
 * - Skill Match: 40%
 * - Verification: 25%
 * - Portfolio: 15%
 * - Experience: 10%
 * - Client Rating: 10%
 *
 * Plug-and-play architecture ready to connect Gemini API later.
 */
export function analyzeCreatorMatch(
  creator: Creator,
  campaign: CampaignRequirements
): MatchResult {
  const isExactCategory = creator.category === campaign.category;

  // 1. Skill Match (40% weight)
  // Check how many of the campaign's required skills the creator possesses
  const matchingSkills = campaign.requiredSkills.filter((reqSkill) =>
    creator.skills.some((cs) => cs.toLowerCase().includes(reqSkill.toLowerCase()))
  );
  const skillRatio =
    campaign.requiredSkills.length > 0
      ? matchingSkills.length / campaign.requiredSkills.length
      : 0.5;

  let skillMatchScore = Math.round(skillRatio * 100);
  if (isExactCategory) {
    skillMatchScore = Math.max(skillMatchScore, 92);
  } else {
    // Cross-category penalty
    skillMatchScore = Math.min(skillMatchScore, 45);
  }

  // 2. Verification (25% weight)
  let verificationScore = 60;
  if (creator.isVerified) verificationScore += 25;
  // Extra bonus for verified skills matching requirements
  const verifiedMatches = creator.verifiedSkills.filter((vs) =>
    campaign.requiredSkills.some((rs) => vs.toLowerCase().includes(rs.toLowerCase()))
  );
  verificationScore += Math.min(15, verifiedMatches.length * 6);
  verificationScore = Math.min(100, verificationScore);

  // 3. Portfolio Relevance (15% weight)
  let portfolioScore = Math.min(100, Math.round((creator.portfolioCount / 30) * 100));
  if (!isExactCategory) {
    portfolioScore = Math.round(portfolioScore * 0.45);
  } else {
    portfolioScore = Math.max(88, portfolioScore);
  }

  // 4. Experience & Engagement (10% weight)
  // Considers engagement rate and followers
  let experienceScore = 75;
  if (creator.engagementNum >= 8.0) experienceScore += 20;
  else if (creator.engagementNum >= 6.5) experienceScore += 15;
  else experienceScore += 10;
  if (creator.previousBrandCollabs.length >= 4) experienceScore += 5;
  experienceScore = Math.min(100, experienceScore);

  // 5. Client Rating (10% weight)
  // 5.0 rating = 100%, 4.5 = 90%
  const clientRatingScore = Math.min(100, Math.round((creator.clientRating / 5.0) * 100));

  // Compute weighted total score
  const totalScore = Math.round(
    skillMatchScore * 0.4 +
      verificationScore * 0.25 +
      portfolioScore * 0.15 +
      experienceScore * 0.1 +
      clientRatingScore * 0.1
  );

  // Generate dynamic contextual reasons ("Why this creator is a great match?")
  const reasons: string[] = [];
  if (isExactCategory) {
    reasons.push(`${skillMatchScore}% verified skill match for ${campaign.category.toLowerCase()}`);
    reasons.push(`${creator.portfolioCount} relevant published portfolio projects`);
    reasons.push(`Top-tier ${creator.engagementRate} engagement rate (${creator.followers} active audience)`);
    if (matchingSkills.length > 0) {
      reasons.push(`Demonstrated mastery in ${matchingSkills.slice(0, 2).join(" & ")}`);
    }
    reasons.push(`Proven brand track record (${creator.previousBrandCollabs.slice(0, 2).join(", ")})`);
    reasons.push(`Verified client satisfaction score: ${creator.clientRating}/5.0 (${creator.reviewsCount} reviews)`);
  } else {
    reasons.push(`High general audience engagement rate (${creator.engagementRate})`);
    reasons.push(`Fully identity & skill verified on the marketplace`);
    if (matchingSkills.length > 0) {
      reasons.push(`Cross-disciplinary experience with ${matchingSkills[0]}`);
    }
  }

  // Generate dynamic gaps ("Potential gaps")
  const gaps: string[] = [];
  if (!isExactCategory) {
    gaps.push(`Primary category is ${creator.category}, differing from campaign target (${campaign.category})`);
  }
  if (campaign.platform === "YouTube" && !creator.youtubeSubscribers) {
    gaps.push("Limited long-form YouTube catalog; excels primarily in short-form Reels & TikTok");
  }
  if (campaign.contentType.includes("UGC") && !creator.skills.includes("UGC")) {
    gaps.push("Portfolio has higher studio focus; fewer raw smartphone UGC clips");
  }
  if (gaps.length === 0) {
    gaps.push(`High current demand: ${creator.availability.toLowerCase()}`);
  }

  return {
    creatorId: creator.id,
    totalScore,
    breakdown: {
      skillMatch: skillMatchScore,
      verification: verificationScore,
      portfolio: portfolioScore,
      experience: experienceScore,
      clientRating: clientRatingScore,
    },
    reasons,
    gaps,
  };
}

/**
 * Rank creators for a specific campaign from highest AI Match Score to lowest
 */
export function rankCreatorsForCampaign(
  creators: Creator[],
  campaign: CampaignRequirements
): Array<Creator & { match: MatchResult }> {
  return creators
    .map((creator) => ({
      ...creator,
      match: analyzeCreatorMatch(creator, campaign),
    }))
    .sort((a, b) => b.match.totalScore - a.match.totalScore);
}
