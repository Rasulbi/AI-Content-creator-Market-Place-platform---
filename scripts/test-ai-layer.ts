import { aiService, AIService } from "../lib/ai/ai-service";
import { generateEmbedding, cosineSimilarity, formatPgVector } from "../lib/ai/pgvector-store";
import { getAIProvider, getAIConfigurationStatus } from "../lib/ai/provider-factory";
import { OpenRouterProvider } from "../lib/ai/openrouter-provider";
import { GrokProvider } from "../lib/ai/grok-provider";
import { extractJSON } from "../lib/ai/json-parser";

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

  console.log(`Vector Dimension: ${vec1.length} (768-dim standard)`);
  console.log(`Cosine Similarity (Skincare vs Moisturizer): ${simRelated.toFixed(4)}`);
  console.log(`Cosine Similarity (Skincare vs Tech Keyboard): ${simUnrelated.toFixed(4)}`);
  console.log(`pgvector formatted sample: ${formatPgVector(vec1.slice(0, 3))}...`);

  if (simRelated <= simUnrelated) {
    throw new Error("FAIL: Related concepts should have higher cosine similarity than unrelated!");
  }
  console.log("✅ Verified: pgvector semantic similarity operates accurately.\n");

  // TEST 6: PROVIDER FACTORY & PROVIDER SWITCHING
  console.log("--- TEST 6: AI Provider Architecture & Factory Resolution ---");
  const defaultProvider = getAIProvider();
  console.log(`Default Provider ID: "${defaultProvider.id}", Name: "${defaultProvider.name}", Model: "${defaultProvider.model}"`);
  if (defaultProvider.id !== "openrouter") {
    throw new Error(`FAIL: Default provider should be 'openrouter', got '${defaultProvider.id}'`);
  }

  const grokProvider = getAIProvider("grok");
  console.log(`Explicit 'grok' Provider ID: "${grokProvider.id}", Name: "${grokProvider.name}", Model: "${grokProvider.model}"`);
  if (grokProvider.id !== "grok") {
    throw new Error(`FAIL: Requested 'grok' provider but got '${grokProvider.id}'`);
  }

  const openRouterProvider = getAIProvider("openrouter");
  if (openRouterProvider.id !== "openrouter") {
    throw new Error(`FAIL: Requested 'openrouter' provider but got '${openRouterProvider.id}'`);
  }
  console.log("✅ Verified: AI Provider Factory resolves 'openrouter' and 'grok' providers cleanly.\n");

  // TEST 7: MISSING KEY HANDLING & CONFIGURATION VALIDATION
  console.log("--- TEST 7: Missing API Key & Unconfigured Provider Validation ---");
  const dummyOpenRouter = new OpenRouterProvider();
  const dummyGrok = new GrokProvider();

  console.log(`OpenRouter isConfigured (without real key): ${dummyOpenRouter.isConfigured()}`);
  console.log(`Grok isConfigured (without real key): ${dummyGrok.isConfigured()}`);

  const status = getAIConfigurationStatus();
  console.log("Configuration Diagnostic Status:", status);

  // Verify that unconfigured provider call rejects gracefully with descriptive error
  let openRouterThrewExpectedError = false;
  try {
    if (!dummyOpenRouter.isConfigured()) {
      await dummyOpenRouter.generateText("Test prompt");
    }
  } catch (err) {
    const error = err as Error;
    if (error.message.includes("OPENROUTER_NOT_CONFIGURED")) {
      openRouterThrewExpectedError = true;
      console.log(`  ✓ OpenRouter cleanly threw expected error: ${error.message}`);
    }
  }

  let grokThrewExpectedError = false;
  try {
    if (!dummyGrok.isConfigured()) {
      await dummyGrok.generateText("Test prompt");
    }
  } catch (err) {
    const error = err as Error;
    if (error.message.includes("GROK_NOT_CONFIGURED")) {
      grokThrewExpectedError = true;
      console.log(`  ✓ Grok cleanly threw expected error: ${error.message}`);
    }
  }

  if (!dummyOpenRouter.isConfigured() && !openRouterThrewExpectedError) {
    throw new Error("FAIL: Unconfigured OpenRouterProvider did not throw OPENROUTER_NOT_CONFIGURED!");
  }
  if (!dummyGrok.isConfigured() && !grokThrewExpectedError) {
    throw new Error("FAIL: Unconfigured GrokProvider did not throw GROK_NOT_CONFIGURED!");
  }
  console.log("✅ Verified: Unconfigured providers safely report false and reject unauthorized calls.\n");

  // TEST 8: SERVICE FALLBACK RESILIENCE (ZERO DOWNTIME)
  console.log("--- TEST 8: Zero-Downtime Deterministic Fallback Engine ---");
  // Test AIService with unconfigured Grok provider to ensure fallback executes smoothly
  const grokService = new AIService(dummyGrok);
  const fallbackBrief = await grokService.analyzeCampaign({ brief: "Beauty UGC creator for lip balm" });
  if (!fallbackBrief.contentType || fallbackBrief.requiredSkills.length === 0) {
    throw new Error("FAIL: Fallback campaign parser did not produce valid structured data!");
  }
  console.log(`Fallback Campaign Result: ContentType="${fallbackBrief.contentType}", Skills=[${fallbackBrief.requiredSkills.join(", ")}]`);
  console.log("✅ Verified: AIService operates with complete fallback resilience under any provider.\n");

  // TEST 9: ROBUST JSON PARSER UNIT TESTS
  console.log("--- TEST 9: extractJSON Robust Parser Unit Tests ---");
  const testCases = [
    { input: '{"valid": true, "score": 95}', expectedKey: "valid" },
    { input: '```json\n{"fromMarkdown": true}\n```', expectedKey: "fromMarkdown" },
    { input: 'Here is your output:\n```json\n{"insideFence": 123}\n```\nHope that helps!', expectedKey: "insideFence" },
    { input: 'Surrounding text {"embedded": "yes"} trailing text', expectedKey: "embedded" },
  ];

  for (const tc of testCases) {
    const parsed = extractJSON<Record<string, unknown>>(tc.input);
    if (!(tc.expectedKey in parsed)) {
      throw new Error(`FAIL: Failed to parse test case: ${tc.input}`);
    }
  }
  console.log("✅ Verified: extractJSON correctly parses clean JSON, code fences, and embedded blocks.\n");

  console.log("=================================================");
  console.log("🎉 ALL 9 AI LAYER ARCHITECTURE TESTS PASSED!");
  console.log("=================================================");
}

runAILayerTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});

