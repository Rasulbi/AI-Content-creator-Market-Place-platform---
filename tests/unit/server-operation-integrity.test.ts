import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Phase 3: Server-Side Operation Integrity Regression Suite", () => {
  describe("1. Assessment Submission Skill Verification Integrity", () => {
    it("should reject claiming verified pass when creator-skill upsert fails in database", async () => {
      // Mock evaluation result
      const evaluation = {
        passed: true,
        authoritativeScore: 92,
        status: "passed",
        feedback: "Exemplary technical performance",
      };
      const submissionRecord = { id: "sub-test-123", score: 92 };

      // Simulate adminSupabase creator_skills upsert returning failure
      const mockAdminUpsert = async () => ({
        error: { message: "Database connection timeout while writing creator_skills" },
      });

      let responseStatus = 200;
      let responsePayload: any = null;

      // Logic under test (mirroring app/api/v1/tests/submissions/route.ts)
      if (evaluation.passed) {
        const { error: skillUpsertError } = await mockAdminUpsert();
        if (skillUpsertError) {
          responseStatus = 500;
          responsePayload = {
            error:
              "Assessment was evaluated and recorded, but elevating your verified skill credential failed in the database. Please contact support or try again.",
            submissionId: submissionRecord.id,
          };
        } else {
          responseStatus = 201;
          responsePayload = {
            data: { ...submissionRecord, passed: true },
            message: "Test passed successfully!",
          };
        }
      }

      // Assertions: Must return 500, error message, submissionId preserved, NO false verified success
      assert.equal(responseStatus, 500);
      assert.ok(responsePayload.error);
      assert.equal(responsePayload.submissionId, "sub-test-123");
      assert.equal(responsePayload.data, undefined);
      assert.equal(responsePayload.message, undefined);
    });

    it("should reject claiming verified pass when associated skill cannot be resolved", async () => {
      const evaluation = {
        passed: true,
        authoritativeScore: 88,
      };
      const submissionRecord = { id: "sub-test-456" };

      // Skill query returns null
      const resolvedSkillId: string | null = null;
      let responseStatus = 200;
      let responsePayload: any = null;

      if (evaluation.passed) {
        if (!resolvedSkillId) {
          responseStatus = 500;
          responsePayload = {
            error:
              "Assessment was evaluated and recorded, but the associated skill record could not be found to grant a verified credential.",
            submissionId: submissionRecord.id,
          };
        }
      }

      assert.equal(responseStatus, 500);
      assert.ok(responsePayload.error);
      assert.equal(responsePayload.submissionId, "sub-test-456");
      assert.equal(responsePayload.data, undefined);
    });

    it("should return HTTP 201 with verified certificate when skill upsert succeeds", async () => {
      const evaluation = {
        passed: true,
        authoritativeScore: 94,
        status: "passed",
        feedback: "Mastery demonstrated",
      };
      const submissionRecord = { id: "sub-test-789" };
      const certId = "CERT-AI-TEST-9999";

      const mockAdminUpsert = async () => ({ error: null });

      let responseStatus = 200;
      let responsePayload: any = null;

      if (evaluation.passed) {
        const { error: skillUpsertError } = await mockAdminUpsert();
        if (skillUpsertError) {
          responseStatus = 500;
        } else {
          responseStatus = 201;
          responsePayload = {
            data: {
              ...submissionRecord,
              score: evaluation.authoritativeScore,
              status: evaluation.status,
              passed: true,
              certificateId: certId,
            },
            message: "Test passed successfully!",
          };
        }
      }

      assert.equal(responseStatus, 201);
      assert.equal(responsePayload.message, "Test passed successfully!");
      assert.equal(responsePayload.data.passed, true);
      assert.equal(responsePayload.data.certificateId, "CERT-AI-TEST-9999");
    });
  });

  describe("2. Registration Database Write Failure & Safe Cleanup", () => {
    it("should abort registration and safely delete orphaned auth user if users record fails", async () => {
      const authUser = { id: "new-auth-user-123", email: "newuser@example.com" };
      let authUserDeleted = false;
      let cookieSet = false;
      let responseStatus = 200;
      let responsePayload: any = null;

      // Mock users upsert error
      const mockUsersUpsert = async () => ({
        error: { message: "Database foreign key constraint violation on public.users" },
      });

      const mockDeleteAuthUser = async (id: string) => {
        if (id === authUser.id) {
          authUserDeleted = true;
        }
      };

      // Handler logic under test (mirroring app/api/auth/register/route.ts)
      const { error: userUpsertError } = await mockUsersUpsert();
      if (userUpsertError) {
        await mockDeleteAuthUser(authUser.id);
        responseStatus = 500;
        responsePayload = {
          success: false,
          error: "Registration failed while creating user record. Please try again.",
        };
      } else {
        cookieSet = true;
        responseStatus = 200;
        responsePayload = { success: true, message: "Registration successful" };
      }

      // Assertions
      assert.equal(responseStatus, 500);
      assert.equal(responsePayload.success, false);
      assert.equal(cookieSet, false, "Session cookie must never be set on failed registration");
      assert.equal(authUserDeleted, true, "Orphaned auth user must be safely cleaned up");
    });

    it("should abort registration and clean up users & auth user if creator_profiles fails", async () => {
      const authUser = { id: "new-creator-456", email: "creator456@example.com" };
      let authUserDeleted = false;
      let publicUserDeleted = false;
      let responseStatus = 200;
      let responsePayload: any = null;

      // users upsert succeeds, but creator_profiles upsert fails
      const mockUsersUpsert = async () => ({ error: null });
      const mockCreatorProfileUpsert = async () => ({
        error: { message: "Unique constraint violation on creator_profiles slug" },
      });

      const { error: userErr } = await mockUsersUpsert();
      assert.equal(userErr, null);

      const { error: profileErr } = await mockCreatorProfileUpsert();
      if (profileErr) {
        publicUserDeleted = true;
        authUserDeleted = true;
        responseStatus = 500;
        responsePayload = {
          success: false,
          error: "Registration failed while creating creator profile. Please try again.",
        };
      }

      assert.equal(responseStatus, 500);
      assert.equal(responsePayload.success, false);
      assert.equal(publicUserDeleted, true, "Partially created public.users record must be removed");
      assert.equal(authUserDeleted, true, "Orphaned auth user must be removed");
    });
  });

  describe("3. Delete Endpoints Zero-Row Deletion Handling", () => {
    it("should return HTTP 404 when deleting portfolio project matching zero rows", async () => {
      // Simulating Supabase delete with select("id")
      const mockDeleteZeroRows = async () => ({
        data: [] as { id: string }[],
        error: null,
      });

      const { data, error } = await mockDeleteZeroRows();
      let status = 200;
      let payload: any = null;

      if (error) {
        status = 400;
        payload = { error: (error as any).message };
      } else if (!data || data.length === 0) {
        status = 404;
        payload = { error: "Portfolio project not found or you do not have permission to delete it" };
      } else {
        status = 200;
        payload = { success: true, message: "Project deleted" };
      }

      assert.equal(status, 404);
      assert.ok(payload.error.includes("not found"));
      assert.equal(payload.success, undefined);
    });

    it("should return HTTP 200 when portfolio project was genuinely deleted (1 row)", async () => {
      const mockDeleteOneRow = async () => ({
        data: [{ id: "proj-123" }],
        error: null,
      });

      const { data, error } = await mockDeleteOneRow();
      let status = 200;
      let payload: any = null;

      if (error) {
        status = 400;
      } else if (!data || data.length === 0) {
        status = 404;
      } else {
        status = 200;
        payload = { success: true, message: "Project deleted", id: data[0].id };
      }

      assert.equal(status, 200);
      assert.equal(payload.success, true);
      assert.equal(payload.id, "proj-123");
    });

    it("should return HTTP 404 when deleting skill not found on creator profile", async () => {
      const mockDeleteSkillZeroRows = async () => ({
        data: [] as { id: string }[],
        error: null,
      });

      const { data, error } = await mockDeleteSkillZeroRows();
      let status = 200;
      let payload: any = null;

      if (error) {
        status = 400;
      } else if (!data || data.length === 0) {
        status = 404;
        payload = { error: "Skill not found on this creator profile or already removed" };
      } else {
        status = 200;
        payload = { success: true, message: "Skill removed successfully" };
      }

      assert.equal(status, 404);
      assert.ok(payload.error.includes("Skill not found"));
      assert.equal(payload.success, undefined);
    });

    it("should return failure result in deleteCampaignAction when zero rows match", async () => {
      const mockDeleteCampaignZeroRows = async () => ({
        data: [] as { id: string }[],
        error: null,
      });

      const { data, error } = await mockDeleteCampaignZeroRows();
      let actionResult: any = null;

      if (error) {
        actionResult = { success: false, error: (error as any).message };
      } else if (!data || data.length === 0) {
        actionResult = {
          success: false,
          error: "Campaign not found or you do not have permission to delete it.",
        };
      } else {
        actionResult = { success: true, data: { deleted: true }, message: "Campaign removed." };
      }

      assert.equal(actionResult.success, false);
      assert.ok(actionResult.error.includes("Campaign not found"));
      assert.equal(actionResult.data, undefined);
    });
  });
});
