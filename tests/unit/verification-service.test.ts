import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { verificationService, VerificationService } from "../../lib/ai/verification-service";
import {
  VerifyCreatorsInputSchema,
  VerifyCreatorsOutputSchema,
  AccuracyScoreBreakdownSchema,
  CreatorVerificationItemSchema,
} from "../../lib/ai/verification-types";
import { CREATORS_DATA } from "../../lib/creators-data";

describe("AI Profile Verification Service & Evidence Engine", () => {
  const sampleInput = {
    brandName: "GlowUp Skincare",
    productName: "Hydra-Glow Vitamin C Serum",
    category: "Beauty & Skincare",
    platform: "Instagram",
    targetAudience: "Women 20-35 interested in clean beauty & skincare routines",
    contentTypes: ["Reels", "Product Review", "UGC"],
    budget: "₹ 20,000 - ₹ 35,000",
    deadline: "2 Weeks",
    notes: "Aesthetic natural morning lighting, clean background, focus on ingredient breakdown.",
  };

  describe("Schema Validation", () => {
    it("should validate a complete campaign verification brief", () => {
      const parsed = VerifyCreatorsInputSchema.parse(sampleInput);
      assert.equal(parsed.brandName, "GlowUp Skincare");
      assert.equal(parsed.productName, "Hydra-Glow Vitamin C Serum");
      assert.equal(parsed.category, "Beauty & Skincare");
    });

    it("should reject inputs with empty or invalid brand name", () => {
      assert.throws(() => {
        VerifyCreatorsInputSchema.parse({
          ...sampleInput,
          brandName: "A", // too short
        });
      });
    });

    it("should reject inputs missing product name", () => {
      assert.throws(() => {
        VerifyCreatorsInputSchema.parse({
          ...sampleInput,
          productName: "",
        });
      });
    });
  });

  describe("5-Factor Accuracy Scoring & Evidence Evaluation", () => {
    it("should evaluate Beauty creator with high accuracy for Skincare campaign", () => {
      const ananya = CREATORS_DATA.find((c) => c.id === "ananya-rao");
      assert.ok(ananya, "Ananya Rao should exist in dataset");

      const result = verificationService.evaluateAccuracyAndEvidence(ananya!, sampleInput);

      // 5-factor breakdown must be present and bounded 0-100
      assert.ok(result.breakdown.identityAuthenticity >= 70);
      assert.ok(result.breakdown.brandProductRelevance >= 50);
      assert.ok(result.breakdown.audienceNicheRelevance >= 70);
      assert.ok(result.breakdown.engagementReliability >= 70);
      assert.ok(result.breakdown.profileCompleteness >= 70);

      // Composite accuracy score should be high (>= 75)
      assert.ok(result.accuracyScore >= 75);
      assert.equal(result.verificationStatus, "Verified");

      // Verified details should highlight direct brand collab & verified skills
      assert.ok(result.verifiedDetails.length > 0);
      assert.ok(result.verifiedDetails.some((d) => d.includes("GlowUp Skincare") || d.includes("Identity verified")));

      // Evidence sources must be populated
      assert.ok(result.evidenceSources.length >= 3);
      assert.ok(result.evidenceSources.some((s) => s.includes("Portfolio")));
    });

    it("should mark mismatched category creator as Not Verified or with lower score", () => {
      const techCreator = CREATORS_DATA.find((c) => c.category === "Technology");
      assert.ok(techCreator, "Tech creator should exist in dataset");

      const result = verificationService.evaluateAccuracyAndEvidence(techCreator!, sampleInput);

      // Tech creator for Beauty serum should have low category relevance (< 50) and status Not Verified
      assert.ok(result.breakdown.audienceNicheRelevance <= 50);
      assert.equal(result.verificationStatus, "Not Verified");
      assert.ok(result.accuracyScore < 70);

      // Unverified notices should report category variance
      assert.ok(result.unverifiedDetails.some((u) => u.includes("Category variance")));
    });

    it("should correctly identify Fashion creator as Partially Verified for Beauty campaign", () => {
      const fashionCreator = CREATORS_DATA.find((c) => c.category === "Fashion");
      assert.ok(fashionCreator, "Fashion creator should exist in dataset");

      const result = verificationService.evaluateAccuracyAndEvidence(fashionCreator!, sampleInput);

      // Fashion is adjacent to Beauty, so partially verified
      assert.ok(result.accuracyScore >= 45);
      assert.equal(result.verificationStatus, "Partially Verified");
    });
  });

  describe("Full verifyCreators() Execution", () => {
    it("should verify creators, sort Verified first, and return structured output", async () => {
      const output = await verificationService.verifyCreators(sampleInput);

      // Output adheres to schema
      VerifyCreatorsOutputSchema.parse(output);

      assert.ok(output.verifications.length > 0);
      assert.ok(output.verifiedCount >= 1);
      assert.equal(output.campaignSummary.brandName, "GlowUp Skincare");
      assert.equal(output.campaignSummary.productName, "Hydra-Glow Vitamin C Serum");

      // Verified creators should appear at the top
      assert.equal(output.verifications[0].verificationStatus, "Verified");
      assert.ok(output.verifications[0].accuracyScore >= 75);

      // Each creator verification item should have clickable profile URL and social handle
      for (const item of output.verifications) {
        CreatorVerificationItemSchema.parse(item);
        assert.ok(item.socialHandle.startsWith("@"));
        assert.ok(item.profileUrl.startsWith("/creators/") || item.profileUrl.startsWith("https://"));
        assert.ok(item.accuracyScore >= 0 && item.accuracyScore <= 100);
        assert.ok(["Verified", "Partially Verified", "Not Verified"].includes(item.verificationStatus));
        assert.ok(item.verifiedDetails.length >= 0);
        assert.ok(item.unverifiedDetails.length >= 0);
        assert.ok(item.evidenceSources.length >= 1);
        assert.ok(item.matchExplanation.length > 10);
        assert.equal(item.isDemo, true);
        assert.ok(item.authenticityNotice.length > 0);
      }
    });

    it("should handle custom target platform (YouTube) correctly", async () => {
      const youtubeInput = {
        ...sampleInput,
        category: "Technology",
        platform: "YouTube",
        brandName: "Nothing Tech",
        productName: "Ear (3) Wireless Buds",
      };

      const output = await verificationService.verifyCreators(youtubeInput);
      const topCreator = output.verifications[0];

      assert.ok(topCreator);
      assert.equal(topCreator.verificationStatus, "Verified");
      assert.equal(topCreator.primaryPlatform, "YouTube");
      assert.ok(topCreator.profileUrl.startsWith("/creators/"));
    });

    it("should strictly return creators matching selected category", async () => {
      const gamingOutput = await verificationService.verifyCreators({
        ...sampleInput,
        category: "Gaming",
        productName: "RTX Gaming Setup",
      });

      assert.ok(gamingOutput.verifications.length > 0);
      for (const item of gamingOutput.verifications) {
        assert.equal(item.category, "Gaming");
        assert.equal(item.isDemo, true);
        assert.ok(item.authenticityNotice.toLowerCase().includes("campaign"));
      }
    });
  });
});
