import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createCampaignSchema,
  inviteCreatorSchema,
  respondMatchSchema,
  hireCreatorSchema,
} from "../../lib/validations";
import {
  inviteCreatorAction,
  hireCreatorAction,
  getBrandCampaignMatchesAction,
} from "../../actions/brand-actions";
import {
  respondToMatchAction,
  getCreatorMatchesAction,
} from "../../actions/creator-actions";

describe("Brand-to-Creator Invitation Persistence & Lifecycle Regression Suite", () => {
  describe("1. Automatic Campaign Creation & Skill Validation", () => {
    it("should accept auto-generated campaign with empty required_skills array", () => {
      const payload = {
        title: "Collab Campaign: Ananya Rao",
        description: "Deliverables: 3x Instagram Reels. Expected timeline: 2 Weeks. Targeted collaboration with Ananya Rao.",
        category: "Beauty & Skincare",
        required_skills: [],
        content_formats: ["Instagram Reels", "UGC Video"],
        budget_min: 25000,
        budget_max: 32500,
        status: "active" as const,
      };

      const result = createCampaignSchema.safeParse(payload);
      assert.equal(result.success, true);
      if (result.success) {
        assert.deepEqual(result.data.required_skills, []);
        assert.equal(result.data.title, payload.title);
      }
    });

    it("should strictly reject display-name string skills where UUIDs are expected", () => {
      const payloadWithStrings = {
        title: "Collab Campaign: Ananya Rao",
        description: "Deliverables: 3x Instagram Reels. Expected timeline: 2 Weeks. Targeted collaboration with Ananya Rao.",
        category: "Beauty & Skincare",
        required_skills: ["Skincare", "Product Reviews", "Reels"], // Display names, not UUIDs
        content_formats: ["Instagram Reels"],
        budget_min: 25000,
        budget_max: 32500,
        status: "active" as const,
      };

      const result = createCampaignSchema.safeParse(payloadWithStrings);
      assert.equal(result.success, false);
      if (!result.success) {
        const skillError = result.error.issues.find((i) => i.path[0] === "required_skills");
        assert.ok(skillError);
        assert.ok(skillError.message.includes("Invalid skill ID"));
      }
    });
  });

  describe("2. Proposal Notes Preservation in Validation Schemas", () => {
    it("should accept respondMatchSchema without proposal_notes (preserving existing)", () => {
      const input = {
        match_id: "c455b51a-7b3c-4b5a-93e5-0c7f20101c01",
        action: "accepted" as const,
      };

      const parsed = respondMatchSchema.safeParse(input);
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.match_id, input.match_id);
        assert.equal(parsed.data.action, "accepted");
        assert.equal(parsed.data.proposal_notes, undefined);
      }
    });

    it("should accept respondMatchSchema with explicit proposal_notes replacement", () => {
      const input = {
        match_id: "c455b51a-7b3c-4b5a-93e5-0c7f20101c01",
        action: "accepted" as const,
        proposal_notes: "Updated terms: agreed on 2 deliverables instead of 3.",
      };

      const parsed = respondMatchSchema.safeParse(input);
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.proposal_notes, input.proposal_notes);
      }
    });

    it("should reject respondMatchSchema with invalid action enum", () => {
      const input = {
        match_id: "c455b51a-7b3c-4b5a-93e5-0c7f20101c01",
        action: "hired", // Only 'accepted' and 'declined' are valid responses from creator
      };

      const parsed = respondMatchSchema.safeParse(input);
      assert.equal(parsed.success, false);
    });
  });

  describe("3. Authorization Boundaries (Brand vs Creator Actions)", () => {
    it("should reject inviteCreatorAction when caller is unauthenticated", async () => {
      const result = await inviteCreatorAction({
        campaign_id: "b455b51a-7b3c-4b5a-93e5-0c7f20101b01",
        creator_profile_id: "c455b51a-7b3c-4b5a-93e5-0c7f20101c01",
        proposal_notes: "Let's collaborate on this brief.",
      });

      assert.equal(result.success, false);
      assert.ok(
        result.error.includes("Authentication required") ||
        result.error.includes("Unauthorized") ||
        result.error.includes("Access denied")
      );
    });

    it("should reject respondToMatchAction when caller is unauthenticated", async () => {
      const result = await respondToMatchAction({
        match_id: "b455b51a-7b3c-4b5a-93e5-0c7f20101b01",
        action: "accepted",
      });

      assert.equal(result.success, false);
      assert.ok(
        result.error.includes("Authentication required") ||
        result.error.includes("Unauthorized") ||
        result.error.includes("Access denied")
      );
    });

    it("should reject hireCreatorAction when caller is unauthenticated", async () => {
      const result = await hireCreatorAction({
        match_id: "b455b51a-7b3c-4b5a-93e5-0c7f20101b01",
      });

      assert.equal(result.success, false);
      assert.ok(
        result.error.includes("Authentication required") ||
        result.error.includes("Unauthorized") ||
        result.error.includes("Access denied")
      );
    });

    it("should reject getBrandCampaignMatchesAction when caller is unauthenticated", async () => {
      const result = await getBrandCampaignMatchesAction();

      assert.equal(result.success, false);
      assert.ok(
        result.error.includes("Authentication required") ||
        result.error.includes("Unauthorized") ||
        result.error.includes("Access denied")
      );
    });

    it("should reject getCreatorMatchesAction when caller is unauthenticated", async () => {
      const result = await getCreatorMatchesAction();

      assert.equal(result.success, false);
      assert.ok(
        result.error.includes("Authentication required") ||
        result.error.includes("Unauthorized") ||
        result.error.includes("Access denied")
      );
    });
  });

  describe("4. State Machine & Transition Rules", () => {
    it("should enforce hireCreatorSchema requires valid UUID match_id", () => {
      const invalid = hireCreatorSchema.safeParse({ match_id: "invalid-id" });
      assert.equal(invalid.success, false);

      const valid = hireCreatorSchema.safeParse({ match_id: "b455b51a-7b3c-4b5a-93e5-0c7f20101b01" });
      assert.equal(valid.success, true);
    });

    it("should enforce inviteCreatorSchema requires valid campaign UUID and non-empty creator ID", () => {
      const invalid = inviteCreatorSchema.safeParse({
        campaign_id: "not-a-uuid",
        creator_profile_id: "",
      });
      assert.equal(invalid.success, false);

      const valid = inviteCreatorSchema.safeParse({
        campaign_id: "b455b51a-7b3c-4b5a-93e5-0c7f20101b01",
        creator_profile_id: "ananya-rao",
        proposal_notes: "Brief notes",
      });
      assert.equal(valid.success, true);
    });
  });
});
