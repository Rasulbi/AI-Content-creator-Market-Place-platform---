import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  saveAIContentAction,
  getSavedAIContentAction,
  deleteSavedAIContentAction,
  saveCampaignVerificationAction,
  getCampaignVerificationsAction,
} from "../../actions/ai-actions";

describe("Database Persistence & Server Actions", () => {
  describe("Saved AI Content Persistence", () => {
    it("should reject saving AI content when required fields are missing", async () => {
      const res = await saveAIContentAction({
        title: "",
        concept: "Testing",
        hook: "Hook",
      });

      assert.equal(res.success, false);
      assert.ok(res.error);
    });

    it("should save AI content, assign an ID, and report transparent persistence", async () => {
      const payload = {
        title: "5 Skin Cycling Rules Every Dermatologist Follows",
        concept: "Educational breakdown of the 4-night skin cycling method.",
        hook: "If you are applying retinol every night, you might be ruining your skin barrier.",
        caption: "Here is the exact 4-night routine that changed my skin completely.",
        hashtags: ["#skincycling", "#skincare", "#dermatologytips"],
        callToAction: "Save this routine and comment 'ROUTINE' for the product guide.",
        niche: "Beauty & Skincare",
        platform: "Instagram Reels",
        userId: "test-user-persist-1",
      };

      const res = await saveAIContentAction(payload);
      assert.equal(res.success, true);
      if (!res.success) return;
      assert.ok(res.data);
      assert.equal(res.data.title, payload.title);
      assert.equal(res.data.hook, payload.hook);
      assert.ok(res.data.id);
    });

    it("should retrieve saved AI content for the specific user", async () => {
      const userId = "test-user-persist-1";
      const res = await getSavedAIContentAction(userId);

      assert.equal(res.success, true);
      if (!res.success) return;
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.length >= 1);
      assert.equal(res.data[0].title, "5 Skin Cycling Rules Every Dermatologist Follows");
    });

    it("should delete a saved AI content item cleanly", async () => {
      const userId = "test-user-persist-1";
      const listRes = await getSavedAIContentAction(userId);
      assert.equal(listRes.success, true);
      if (!listRes.success) return;
      const targetId = listRes.data[0].id;

      const deleteRes = await deleteSavedAIContentAction(targetId, userId);
      assert.equal(deleteRes.success, true);

      const afterDeleteRes = await getSavedAIContentAction(userId);
      assert.equal(afterDeleteRes.success, true);
      if (!afterDeleteRes.success) return;
      const exists = afterDeleteRes.data.some((item: any) => item.id === targetId);
      assert.equal(exists, false);
    });
  });

  describe("Campaign Verification Audit Persistence", () => {
    it("should reject verification audit when brandName or productName is missing", async () => {
      const res = await saveCampaignVerificationAction({
        brandName: "",
        productName: "Serum",
        category: "Beauty",
      });

      assert.equal(res.success, false);
      assert.ok(res.error);
    });

    it("should save a verification audit report and retrieve it by brandId", async () => {
      const brandId = "brand-persist-test-42";
      const payload = {
        brandId,
        brandName: "GlowLab Skincare",
        productName: "Barrier Restore Cream",
        category: "Beauty & Skincare",
        platform: "Instagram",
        targetAudience: "Adults 20-40 looking for ceramide barrier repair",
        budget: "₹ 25,000 - ₹ 35,000",
        deadline: "2 Weeks",
        verificationsCount: 2,
        verificationsData: {
          verifiedCount: 2,
          provider: "Automated AI Audit Engine",
          verifications: [
            { creatorId: "ananya-rao", accuracyScore: 98, status: "Verified" },
            { creatorId: "priya-verma", accuracyScore: 94, status: "Verified" },
          ],
        },
      };

      const saveRes = await saveCampaignVerificationAction(payload);
      assert.equal(saveRes.success, true);
      if (!saveRes.success) return;
      assert.ok(saveRes.data.id);

      const fetchRes = await getCampaignVerificationsAction(brandId);
      assert.equal(fetchRes.success, true);
      if (!fetchRes.success) return;
      assert.ok(Array.isArray(fetchRes.data));
      assert.ok(fetchRes.data.length >= 1);
      assert.equal(fetchRes.data[0].product_name, "Barrier Restore Cream");
      assert.equal(fetchRes.data[0].brand_name, "GlowLab Skincare");
    });
  });

  describe("Supabase Connection & Health Check (checkSupabaseStatus)", () => {
    it("should report connected: true and target valid schema table", async () => {
      const { checkSupabaseStatus } = await import("../../lib/supabase");
      const status = await checkSupabaseStatus();

      assert.equal(typeof status.connected, "boolean");
      assert.equal(typeof status.message, "string");
      // Must never return the legacy table error
      assert.equal(status.message.includes("public.creators"), false);

      if (status.connected) {
        assert.equal(status.message, "Connected to Supabase PostgreSQL database.");
      }
    });
  });
});
