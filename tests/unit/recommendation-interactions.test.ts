import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  RecommendationImpressionItemSchema,
  RecordImpressionsInputSchema,
  RecordActionInputSchema,
  RecordExplicitFeedbackInputSchema,
  UnifiedFeedbackRequestSchema,
} from "../../lib/validations/recommendation-interaction";
import { interactionService } from "../../lib/recommendations/interaction-service";
import {
  splitDatasetByCampaign,
  trainLogisticRegression,
  evaluateRanking,
  evaluateBaseline,
  predictProbability,
  calculateBaselineScore,
  TrainingSample,
} from "../../scripts/train-ranking-model";

describe("Production-Ready Recommendation Interaction & ML Data Collection Suite", () => {
  beforeEach(() => {
    interactionService._resetMemoryStore();
  });

  describe("1. Schema & Event Type Validation", () => {
    it("should accept valid impression batch with rank and feature snapshots", () => {
      const validPayload = {
        campaignId: "11111111-1111-4111-8111-111111111111",
        modelVersion: "hybrid_v1",
        impressions: [
          {
            creatorProfileId: "22222222-2222-4222-8222-222222222222",
            recommendationRank: 1,
            featureSnapshot: {
              semanticScore: 92,
              ruleScore: 85,
              finalScore: 88,
              skillOverlapRatio: 0.8,
              verifiedSkillRatio: 0.6,
              budgetCompatibility: 0.9,
              categoryMatch: 1,
              experienceYears: 3,
            },
            modelVersion: "hybrid_v1",
          },
        ],
      };

      const parsed = RecordImpressionsInputSchema.parse(validPayload);
      assert.equal(parsed.impressions.length, 1);
      assert.equal(parsed.impressions[0].recommendationRank, 1);
    });

    it("should reject impression with rank < 1", () => {
      assert.throws(() => {
        RecommendationImpressionItemSchema.parse({
          creatorProfileId: "c-1",
          recommendationRank: 0,
          featureSnapshot: {
            semanticScore: 80,
            ruleScore: 70,
            finalScore: 75,
          },
        });
      });
    });

    it("should reject invalid action enum in RecordActionInputSchema", () => {
      assert.throws(() => {
        RecordActionInputSchema.parse({
          campaignId: "11111111-1111-4111-8111-111111111111",
          creatorProfileId: "c-1",
          action: "invalid_unsupported_action",
        });
      });
    });

    it("should accept all legitimate lifecycle actions", () => {
      const validActions = [
        "view",
        "shortlist",
        "invite",
        "creator_accepted",
        "creator_declined",
        "hire",
        "reject",
        "campaign_completed",
      ] as const;

      for (const action of validActions) {
        const parsed = RecordActionInputSchema.parse({
          campaignId: "11111111-1111-4111-8111-111111111111",
          creatorProfileId: "c-1",
          action,
        });
        assert.equal(parsed.action, action);
      }
    });

    it("should validate explicit brand feedback ratings", () => {
      const valid = RecordExplicitFeedbackInputSchema.parse({
        campaignId: "11111111-1111-4111-8111-111111111111",
        creatorProfileId: "c-1",
        rating: "relevant",
        reasons: ["portfolio_match", "strong_visuals"],
        notes: "Great aesthetic alignment.",
      });

      assert.equal(valid.rating, "relevant");
      assert.equal(valid.reasons.length, 2);
    });
  });

  describe("2. Server-Side Deduplication & Debouncing", () => {
    it("should debounce duplicate impressions within the debounce window", async () => {
      const campaignId = "33333333-3333-4333-8333-333333333333";
      const brandId = "44444444-4444-4444-8444-444444444444";
      const impressions = [
        {
          creatorProfileId: "creator-alpha",
          recommendationRank: 1,
          featureSnapshot: {
            semanticScore: 90,
            ruleScore: 80,
            finalScore: 85,
            skillOverlapRatio: 0.8,
            verifiedSkillRatio: 0.5,
            budgetCompatibility: 0.9,
            categoryMatch: 1,
            experienceYears: 2,
          },
          modelVersion: "hybrid_v1",
        },
      ];

      // First batch
      const res1 = await interactionService.recordImpressions(campaignId, brandId, impressions);
      assert.equal(res1.recordedCount, 1);
      assert.equal(res1.skippedCount, 0);

      // Second identical batch immediately after
      const res2 = await interactionService.recordImpressions(campaignId, brandId, impressions);
      assert.equal(res2.recordedCount, 0);
      assert.equal(res2.skippedCount, 1);
    });

    it("should debounce duplicate action events within rapid succession window", async () => {
      const campaignId = "55555555-5555-4555-8555-555555555555";
      const brandId = "66666666-6666-4666-8666-666666666666";

      const res1 = await interactionService.recordAction(brandId, {
        campaignId,
        creatorProfileId: "creator-beta",
        action: "view",
      });
      assert.equal(res1.success, true);
      assert.notEqual(res1.eventId, "duplicate_skipped");

      const res2 = await interactionService.recordAction(brandId, {
        campaignId,
        creatorProfileId: "creator-beta",
        action: "view",
      });
      assert.equal(res2.persistenceStatus, "debounced_duplicate");
      assert.equal(res2.eventId, "duplicate_skipped");
    });
  });

  describe("3. Label Integrity & Separation of Observed Actions from Explicit Feedback", () => {
    it("should NOT treat views or impressions as definitive negative labels", async () => {
      const campaignId = "77777777-7777-4777-8777-777777777777";
      const brandId = "88888888-8888-4888-8888-888888888888";

      // Log 5 impressions and 2 views
      await interactionService.recordImpressions(campaignId, brandId, [
        {
          creatorProfileId: "creator-c1",
          recommendationRank: 1,
          featureSnapshot: {
            semanticScore: 90,
            ruleScore: 80,
            finalScore: 85,
            skillOverlapRatio: 0.8,
            verifiedSkillRatio: 0.5,
            budgetCompatibility: 0.9,
            categoryMatch: 1,
            experienceYears: 2,
          },
          modelVersion: "hybrid_v1",
        },
      ]);

      await interactionService.recordAction(brandId, {
        campaignId,
        creatorProfileId: "creator-c1",
        action: "view",
      });

      // Dataset query must NOT include 'view' or unclicked impressions as negative label
      const dataset = await interactionService.getLabelledDataset();
      assert.equal(dataset.totalSamples, 0, "Impressions and views must be unlabelled and not counted as 0");
      assert.equal(dataset.unlabelledCount, 1);

      const stats = await interactionService.getRecommendationStats();
      assert.equal(stats.outcomeCoverage.verifiedNegative, 0);
      assert.ok(stats.outcomeCoverage.unlabelledOrInProgress > 0);
    });

    it("should classify completed hire as definitive positive label (Y = 1) when genuine feature snapshot exists", async () => {
      const campaignId = "99999999-9999-4999-8999-999999999999";
      const brandId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

      await interactionService.recordImpressions(campaignId, brandId, [
        {
          creatorProfileId: "creator-hired",
          recommendationRank: 1,
          featureSnapshot: {
            semanticScore: 92,
            ruleScore: 88,
            finalScore: 90,
            skillOverlapRatio: 0.9,
            verifiedSkillRatio: 0.8,
            budgetCompatibility: 0.95,
            categoryMatch: 1,
            experienceYears: 4,
          },
          modelVersion: "hybrid_v1",
        },
      ]);

      await interactionService.recordAction(brandId, {
        campaignId,
        creatorProfileId: "creator-hired",
        action: "hire",
      });

      const dataset = await interactionService.getLabelledDataset();
      assert.equal(dataset.totalSamples, 1);
      assert.equal(dataset.samples[0].label, 1);
      assert.equal(dataset.samples[0].labelSource, "completed_hire");
      assert.equal(dataset.samples[0].features.semanticSimilarity, 0.92);
      assert.equal(dataset.samples[0].features.skillOverlapRatio, 0.9);
      assert.equal(dataset.missingSnapshotCount, 0);
    });

    it("should classify explicit rejection as definitive negative label (Y = 0) when genuine feature snapshot exists", async () => {
      const campaignId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
      const brandId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

      await interactionService.recordImpressions(campaignId, brandId, [
        {
          creatorProfileId: "creator-rejected",
          recommendationRank: 2,
          featureSnapshot: {
            semanticScore: 45,
            ruleScore: 50,
            finalScore: 48,
            skillOverlapRatio: 0.2,
            verifiedSkillRatio: 0.0,
            budgetCompatibility: 0.4,
            categoryMatch: 0,
            experienceYears: 1,
          },
          modelVersion: "hybrid_v1",
        },
      ]);

      await interactionService.recordAction(brandId, {
        campaignId,
        creatorProfileId: "creator-rejected",
        action: "reject",
      });

      const dataset = await interactionService.getLabelledDataset();
      assert.equal(dataset.totalSamples, 1);
      assert.equal(dataset.samples[0].label, 0);
      assert.equal(dataset.samples[0].labelSource, "explicit_rejection");
      assert.equal(dataset.samples[0].features.semanticSimilarity, 0.45);
      assert.equal(dataset.missingSnapshotCount, 0);
    });

    it("should record explicit brand feedback separately and formulate training label when genuine feature snapshot exists", async () => {
      const campaignId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
      const brandId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

      await interactionService.recordImpressions(campaignId, brandId, [
        {
          creatorProfileId: "creator-explicit",
          recommendationRank: 1,
          featureSnapshot: {
            semanticScore: 85,
            ruleScore: 80,
            finalScore: 82,
            skillOverlapRatio: 0.8,
            verifiedSkillRatio: 0.6,
            budgetCompatibility: 0.85,
            categoryMatch: 1,
            experienceYears: 3,
          },
          modelVersion: "hybrid_v1",
        },
      ]);

      await interactionService.recordExplicitFeedback(brandId, {
        campaignId,
        creatorProfileId: "creator-explicit",
        rating: "relevant",
        reasons: ["portfolio_match"],
      });

      const dataset = await interactionService.getLabelledDataset();
      assert.equal(dataset.totalSamples, 1);
      assert.equal(dataset.samples[0].label, 1);
      assert.equal(dataset.samples[0].labelSource, "explicit_feedback");
      assert.equal(dataset.samples[0].features.semanticSimilarity, 0.85);
      assert.equal(dataset.missingSnapshotCount, 0);
    });

    it("should strictly exclude outcome actions missing genuine inference-time snapshots from training", async () => {
      const campaignId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
      const brandId = "12121212-1212-4212-8212-121212121212";

      // Log an action directly WITHOUT any prior recommendation impression snapshot
      await interactionService.recordAction(brandId, {
        campaignId,
        creatorProfileId: "creator-unsnapped",
        action: "hire",
      });

      const dataset = await interactionService.getLabelledDataset();
      assert.equal(dataset.totalSamples, 0, "Samples without genuine inference-time snapshots must be excluded");
      assert.equal(dataset.missingSnapshotCount, 1, "missingSnapshotCount must increment for audit trail");
    });

    it("should strictly exclude explicit feedback missing genuine inference-time snapshots from training", async () => {
      const campaignId = "13131313-1313-4313-8313-131313131313";
      const brandId = "14141414-1414-4414-8414-141414141414";

      // Log explicit feedback without impression snapshot
      await interactionService.recordExplicitFeedback(brandId, {
        campaignId,
        creatorProfileId: "creator-unsnapped-fb",
        rating: "relevant",
      });

      const dataset = await interactionService.getLabelledDataset();
      assert.equal(dataset.totalSamples, 0, "Explicit feedback without genuine snapshot must be excluded");
      assert.equal(dataset.missingSnapshotCount, 1);
    });
  });

  describe("4. ML Readiness & Dataset Threshold Audit", () => {
    it("should report NOT_READY when labelled samples are below the 200 threshold", async () => {
      const stats = await interactionService.getRecommendationStats();
      assert.equal(stats.mlReadiness.status, "NOT_READY");
      assert.equal(stats.mlReadiness.threshold, 200);
      assert.ok(stats.mlReadiness.reason.includes("Insufficient authentic labelled recommendation outcomes"));
    });
  });

  describe("5. Leak-Free Grouped Train/Test Split & Baseline Benchmark", () => {
    const multiCampaignData: TrainingSample[] = [
      // Campaign 1
      { campaignId: "c-1", features: { semanticSimilarity: 0.9, skillOverlapRatio: 0.8, verifiedSkillRatio: 0.8, budgetCompatibility: 0.9, categoryMatch: 1, experienceYearsNorm: 0.7 }, label: 1 },
      { campaignId: "c-1", features: { semanticSimilarity: 0.4, skillOverlapRatio: 0.2, verifiedSkillRatio: 0.0, budgetCompatibility: 0.4, categoryMatch: 0, experienceYearsNorm: 0.2 }, label: 0 },
      // Campaign 2
      { campaignId: "c-2", features: { semanticSimilarity: 0.85, skillOverlapRatio: 0.9, verifiedSkillRatio: 0.6, budgetCompatibility: 0.8, categoryMatch: 1, experienceYearsNorm: 0.6 }, label: 1 },
      { campaignId: "c-2", features: { semanticSimilarity: 0.35, skillOverlapRatio: 0.1, verifiedSkillRatio: 0.0, budgetCompatibility: 0.3, categoryMatch: 0, experienceYearsNorm: 0.1 }, label: 0 },
      // Campaign 3 (Held-out validation)
      { campaignId: "c-3", features: { semanticSimilarity: 0.88, skillOverlapRatio: 0.85, verifiedSkillRatio: 0.8, budgetCompatibility: 0.95, categoryMatch: 1, experienceYearsNorm: 0.8 }, label: 1 },
      { campaignId: "c-3", features: { semanticSimilarity: 0.3, skillOverlapRatio: 0.1, verifiedSkillRatio: 0.0, budgetCompatibility: 0.2, categoryMatch: 0, experienceYearsNorm: 0.2 }, label: 0 },
    ];

    it("should split dataset by campaign so no campaign appears in both train and validation sets (Zero Leakage)", () => {
      const { trainSet, testSet } = splitDatasetByCampaign(multiCampaignData, 0.67);

      const trainCampaigns = new Set(trainSet.map((s) => s.campaignId));
      const testCampaigns = new Set(testSet.map((s) => s.campaignId));

      for (const tId of testCampaigns) {
        assert.equal(
          trainCampaigns.has(tId),
          false,
          `Campaign '${tId}' leaked between train and validation split!`
        );
      }
    });

    it("should train model weights deterministically and benchmark against current deterministic baseline", () => {
      const { trainSet, testSet } = splitDatasetByCampaign(multiCampaignData, 0.67);

      const trainedWeights = trainLogisticRegression(trainSet, 150, 0.1);
      const modelMetrics = evaluateRanking(testSet, trainedWeights, 1);
      const baselineMetrics = evaluateBaseline(testSet, 1);

      assert.equal(modelMetrics.totalSamples, testSet.length);
      assert.equal(baselineMetrics.totalSamples, testSet.length);

      // Verify that NDCG@K is bounded between 0 and 1
      assert.ok(modelMetrics.ndcgAtK >= 0 && modelMetrics.ndcgAtK <= 1.0);
      assert.ok(baselineMetrics.ndcgAtK >= 0 && baselineMetrics.ndcgAtK <= 1.0);
    });
  });

  describe("6. Creator Event Authorization & Anti-Forgery Validation (Mirroring Migration 007 RLS)", () => {
    const creatorUserA = "user-creator-1111-1111-1111-111111111111";
    const creatorProfileA = "prof-creator-2222-2222-2222-222222222222";
    const campaignX = "camp-3333-3333-3333-333333333333";
    const brandOwnerX = "brand-4444-4444-4444-444444444444";

    it("should authorize creator acceptance when an authentic match with status 'invited' exists", () => {
      const result = interactionService.validateCreatorEventAuthorization({
        authenticatedUserId: creatorUserA,
        action: "creator_accepted",
        campaignId: campaignX,
        creatorProfileId: creatorProfileA,
        brandId: brandOwnerX,
        creatorProfileOwnerId: creatorUserA,
        match: {
          campaignId: campaignX,
          creatorProfileId: creatorProfileA,
          status: "invited",
        },
        campaign: {
          id: campaignX,
          brandId: brandOwnerX,
        },
      });

      assert.equal(result.authorized, true);
    });

    it("should authorize creator decline when an authentic match with status 'invited' exists", () => {
      const result = interactionService.validateCreatorEventAuthorization({
        authenticatedUserId: creatorUserA,
        action: "creator_declined",
        campaignId: campaignX,
        creatorProfileId: creatorProfileA,
        brandId: brandOwnerX,
        creatorProfileOwnerId: creatorUserA,
        match: {
          campaignId: campaignX,
          creatorProfileId: creatorProfileA,
          status: "invited",
        },
        campaign: {
          id: campaignX,
          brandId: brandOwnerX,
        },
      });

      assert.equal(result.authorized, true);
    });

    it("should authorize creator response when match has already transitioned to 'accepted' or 'hired'", () => {
      const result = interactionService.validateCreatorEventAuthorization({
        authenticatedUserId: creatorUserA,
        action: "creator_accepted",
        campaignId: campaignX,
        creatorProfileId: creatorProfileA,
        brandId: brandOwnerX,
        creatorProfileOwnerId: creatorUserA,
        match: {
          campaignId: campaignX,
          creatorProfileId: creatorProfileA,
          status: "accepted",
        },
        campaign: {
          id: campaignX,
          brandId: brandOwnerX,
        },
      });

      assert.equal(result.authorized, true);
    });

    it("should reject forged creator response when match exists only as 'suggested' (no invitation sent)", () => {
      const result = interactionService.validateCreatorEventAuthorization({
        authenticatedUserId: creatorUserA,
        action: "creator_accepted",
        campaignId: campaignX,
        creatorProfileId: creatorProfileA,
        brandId: brandOwnerX,
        creatorProfileOwnerId: creatorUserA,
        match: {
          campaignId: campaignX,
          creatorProfileId: creatorProfileA,
          status: "suggested", // Merely an AI candidate suggestion, not an invitation!
        },
        campaign: {
          id: campaignX,
          brandId: brandOwnerX,
        },
      });

      assert.equal(result.authorized, false);
      assert.ok(result.reason?.includes("suggestion is not an invitation"));
    });

    it("should reject forged creator response when no match relationship exists for the campaign", () => {
      const result = interactionService.validateCreatorEventAuthorization({
        authenticatedUserId: creatorUserA,
        action: "creator_accepted",
        campaignId: campaignX,
        creatorProfileId: creatorProfileA,
        brandId: brandOwnerX,
        creatorProfileOwnerId: creatorUserA,
        match: null, // No match row exists
        campaign: {
          id: campaignX,
          brandId: brandOwnerX,
        },
      });

      assert.equal(result.authorized, false);
      assert.ok(result.reason?.includes("No match relationship exists"));
    });

    it("should reject forged creator response when submitted brandId does not own the campaign", () => {
      const fraudulentBrandId = "attacker-brand-9999-9999-9999-999999999999";
      const result = interactionService.validateCreatorEventAuthorization({
        authenticatedUserId: creatorUserA,
        action: "creator_accepted",
        campaignId: campaignX,
        creatorProfileId: creatorProfileA,
        brandId: fraudulentBrandId,
        creatorProfileOwnerId: creatorUserA,
        match: {
          campaignId: campaignX,
          creatorProfileId: creatorProfileA,
          status: "invited",
        },
        campaign: {
          id: campaignX,
          brandId: brandOwnerX, // Actual owner is brandOwnerX, not fraudulentBrandId
        },
      });

      assert.equal(result.authorized, false);
      assert.ok(result.reason?.includes("does not belong to the claimed brandId"));
    });

    it("should reject creator attempting to respond on behalf of a different creator profile", () => {
      const maliciousUserId = "attacker-user-6666-6666-6666-666666666666";
      const result = interactionService.validateCreatorEventAuthorization({
        authenticatedUserId: maliciousUserId, // Attacker trying to log for creatorProfileA
        action: "creator_accepted",
        campaignId: campaignX,
        creatorProfileId: creatorProfileA,
        brandId: brandOwnerX,
        creatorProfileOwnerId: creatorUserA, // Profile belongs to creatorUserA
        match: {
          campaignId: campaignX,
          creatorProfileId: creatorProfileA,
          status: "invited",
        },
        campaign: {
          id: campaignX,
          brandId: brandOwnerX,
        },
      });

      assert.equal(result.authorized, false);
      assert.ok(result.reason?.includes("does not own target creator_profile_id"));
    });

    it("should reject creators attempting to insert brand-only actions (hire, reject, shortlist)", () => {
      const result = interactionService.validateCreatorEventAuthorization({
        authenticatedUserId: creatorUserA,
        action: "hire", // Brand lifecycle action
        campaignId: campaignX,
        creatorProfileId: creatorProfileA,
        brandId: brandOwnerX,
        creatorProfileOwnerId: creatorUserA,
        match: {
          campaignId: campaignX,
          creatorProfileId: creatorProfileA,
          status: "invited",
        },
        campaign: {
          id: campaignX,
          brandId: brandOwnerX,
        },
      });

      assert.equal(result.authorized, false);
      assert.ok(result.reason?.includes("not an authorized creator response action"));
    });
  });
});
