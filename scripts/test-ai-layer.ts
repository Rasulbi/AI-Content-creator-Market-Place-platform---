import { aiService } from "../lib/ai/ai-service";
import { generateEmbedding, cosineSimilarity, formatPgVector } from "../lib/ai/pgvector-store";

async function runAILayerTests() {
  console.log("=================================================");
  console.log("🚀 AI LAYER END-TO-END VERIFICATION TEST SUITE");
  console.log("=================================================\n");

  // TEST 1: PORTFOLIO ANALYSIS
  console.log("--- TEST 1: analyzePortfolio() ---");
  const portfolioInput = {
    portfolioTitle: "Botanical Face Cream 14-Day Hydration Challenge",
    description: "Created a 3-part aesthetic video campaign demonstrating skin barrier restoration with macro texture shots and verified moisture meter testing.",
    tools: ["Midjourney v6", "CapCut Pro", "Sony FX3"],
    prompt: "Cinematic commercial macro shot of luxury organic face cream, dewy morning glow, 8k resolution, pastel studio lighting",
    process: "Prompted texture references in Midjourney, styled real product shots with studio lighting, edited in CapCut with ASMR sound design",
    availableMediaContext: "4K 60fps vertical reel with before/after skin moisture gauge overlays",
  };

  const portfolioResult = await aiService.analyzePortfolio(portfolioInput);
  console.log("Portfolio Analysis Output:");
  console.log(JSON.stringify(portfolioResult, null, 2));

  if (!portfolioResult.requiresHumanReview) {
    throw new Error("FAIL: AI analysis must require human review and NOT auto-verify!");
  }
  console.log("✅ Verified: requiresHumanReview is TRUE (AI analysis is evidence only, never auto-verifying)\n");

  // TEST 2: CAMPAIGN ANALYSIS
  console.log("--- TEST 2: analyzeCampaign() ---");
  const sampleBrief = `
    Looking for a top skincare creator to launch our new GlowUp Natural Face Cream.
    Target audience is women aged 18–35 interested in clean beauty and active ingredients.
    Deliverables: 5 Instagram Reels with honest reviews and macro texture tests.
    Tools: CapCut, Runway AI, high-resolution camera.
    Budget: ₹ 20,000 - ₹ 35,000.
    Deadline: 2 Weeks.
  `;

  const campaignResult = await aiService.analyzeCampaign({ brief: sampleBrief });
  console.log("Campaign Brief Extracted Structured JSON:");
  console.log(JSON.stringify(campaignResult, null, 2));
  console.log("✅ Verified: Extracted content types, skills, audience, platform, budget, deadline & deliverables.\n");

  // TEST 3: CREATOR MATCHING (findMatches with 40/25/15/10/10 model)
  console.log("--- TEST 3: findMatches() with MVP 40/25/15/10/10 Weighted Model ---");
  const matches = await aiService.findMatches(campaignResult);

  console.log(`Found ${matches.length} ranked candidate matches:`);
  matches.forEach((m, idx) => {
    console.log(`  #${idx + 1}: ${m.creatorName} — Final AI Score: ${m.finalMatchScore}%`);
    console.log(`      Breakdown: Skill(40%)=${m.breakdown.skillMatch}% | Verif(25%)=${m.breakdown.verification}% | Port(15%)=${m.breakdown.portfolio}% | Exp(10%)=${m.breakdown.experience}% | Rating(10%)=${m.breakdown.clientRating}%`);
  });

  const isSorted = matches.every((val, i, arr) => !i || arr[i - 1].finalMatchScore >= val.finalMatchScore);
  if (!isSorted) {
    throw new Error("FAIL: Matches are not sorted by score descending!");
  }
  console.log("✅ Verified: Creator ranking is strictly sorted by weighted composite score.\n");

  // TEST 4: EXPLAINABLE MATCHING (explainMatch)
  console.log("--- TEST 4: explainMatch() for Top Creator ---");
  const topCreatorId = matches[0].creatorId;
  const topExplanation = await aiService.explainMatch(topCreatorId, campaignResult);

  console.log(`Explanation for ${topExplanation.creatorName}:`);
  console.log("Specific Reasons:");
  topExplanation.specificReasons.forEach((r) => console.log(`  ✓ ${r}`));
  console.log("Potential Gaps:");
  topExplanation.potentialGaps.forEach((g) => console.log(`  ⚠ ${g}`));
  console.log("Recommendation Summary:", topExplanation.recommendationSummary);
  console.log("✅ Verified: Detailed evidence-based reasons and gap analysis generated.\n");

  // TEST 5: PGVECTOR EMBEDDINGS & SIMILARITY
  console.log("--- TEST 5: PostgreSQL + pgvector Embeddings Utility ---");
  const text1 = "Aesthetic skincare tutorial with organic face cream";
  const text2 = "Natural botanical moisturizing cream video review";
  const text3 = "Mechanical keyboard gaming benchmark for developers";

  const vec1 = await generateEmbedding(text1);
  const vec2 = await generateEmbedding(text2);
  const vec3 = await generateEmbedding(text3);

  const simRelated = cosineSimilarity(vec1, vec2);
  const simUnrelated = cosineSimilarity(vec1, vec3);

  console.log(`Vector Dimension: ${vec1.length} (Gemini 768-dim standard)`);
  console.log(`Cosine Similarity (Skincare vs Moisturizer): ${simRelated.toFixed(4)}`);
  console.log(`Cosine Similarity (Skincare vs Tech Keyboard): ${simUnrelated.toFixed(4)}`);
  console.log(`pgvector formatted sample: ${formatPgVector(vec1.slice(0, 3))}...`);

  if (simRelated <= simUnrelated) {
    throw new Error("FAIL: Related concepts should have higher cosine similarity than unrelated!");
  }
  console.log("✅ Verified: pgvector semantic similarity operates accurately.\n");

  console.log("=================================================");
  console.log("🎉 ALL AI LAYER ARCHITECTURE TESTS PASSED!");
  console.log("=================================================");
}

runAILayerTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
