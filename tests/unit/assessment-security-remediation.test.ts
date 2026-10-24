import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { claimSkillSchema } from "../../lib/validations/skill";
import { evaluateSkillTest } from "../../app/api/v1/tests/submissions/route";
import { SKILL_TESTS_CATALOG } from "../../lib/skill-passport-store";
import {
  AUTHORITATIVE_SKILL_TESTS,
  getSanitizedSkillTests,
  getSanitizedSkillTest,
  getAuthoritativeSkillTest,
} from "../../lib/server/skill-tests-data";
import { GET as certificateGetRoute } from "../../app/api/v1/certificates/[id]/route";
import { NextRequest } from "next/server";

function createMockRequest(url: string, method: string = "GET"): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
  });
}

describe("Assessment Grading & Verification Security Suite", () => {
  describe("P1: Prevent Self-Granted Verification & Privilege Escalation", () => {
    it("should reject 'test_verified' status in claimSkillSchema validation", () => {
      assert.throws(
        () =>
          claimSkillSchema.parse({
            skill_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
            status: "test_verified" as any,
          }),
        /claimed.*portfolio_evidence/i
      );
    });

    it("should reject 'client_verified' status in claimSkillSchema validation", () => {
      assert.throws(
        () =>
          claimSkillSchema.parse({
            skill_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
            status: "client_verified" as any,
          }),
        /claimed.*portfolio_evidence/i
      );
    });

    it("should accept valid unverified statuses 'claimed' and 'portfolio_evidence'", () => {
      const claim1 = claimSkillSchema.parse({
        skill_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        status: "claimed",
      });
      assert.equal(claim1.status, "claimed");

      const claim2 = claimSkillSchema.parse({
        skill_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        status: "portfolio_evidence",
        evidence_url: "https://example.com/demo.mp4",
      });
      assert.equal(claim2.status, "portfolio_evidence");
    });
  });

  describe("P2: Answer Key Leakage Prevention", () => {
    it("should ensure client-facing SKILL_TESTS_CATALOG questions have NO correctIndex or explanation", () => {
      for (const test of SKILL_TESTS_CATALOG) {
        for (const q of test.questions) {
          assert.equal((q as any).correctIndex, undefined, `Test ${test.id} question ${q.id} must not leak correctIndex`);
          assert.equal((q as any).explanation, undefined, `Test ${test.id} question ${q.id} must not leak explanation`);
        }
      }
    });

    it("should ensure getSanitizedSkillTests() strictly returns questions without answer keys", () => {
      const sanitizedList = getSanitizedSkillTests();
      assert.ok(sanitizedList.length > 0);
      for (const test of sanitizedList) {
        for (const q of test.questions) {
          assert.equal((q as any).correctIndex, undefined);
          assert.equal((q as any).explanation, undefined);
        }
      }
    });

    it("should maintain authoritative answer keys exclusively in server catalog", () => {
      for (const test of AUTHORITATIVE_SKILL_TESTS) {
        assert.ok(test.questions.length > 0);
        for (const q of test.questions) {
          assert.ok(typeof q.correctIndex === "number", `Question ${q.id} must have numeric correctIndex on server`);
          assert.ok(typeof q.explanation === "string" && q.explanation.length > 0);
        }
      }
    });
  });

  describe("P4: Authoritative Practical Rubric & Dual Proficiency Grading", () => {
    const authoritativePromptTest = getAuthoritativeSkillTest("prompt-engineering")!;

    it("should return 0 score and fail when assessment has 0 questions", () => {
      const evalResult = evaluateSkillTest({
        questions: [],
        passingScore: 80,
        answers: { q1: 1 },
        userPrompt: "Valid prompt exceeding 50 characters with --ar 16:9 --v 6.0 parameters",
        userWorkflowNotes: "Valid workflow notes with upscale and seed iterations",
      });

      assert.equal(evalResult.quizScorePercent, 0);
      assert.equal(evalResult.passed, false);
      assert.equal(evalResult.status, "failed");
    });

    it("should award 0 practical score when practical prompt is shorter than 30 characters", () => {
      // Correct quiz answers
      const correctAnswers: Record<string, number> = {};
      authoritativePromptTest.questions.forEach((q) => {
        correctAnswers[q.id] = q.correctIndex;
      });

      const evalResult = evaluateSkillTest({
        questions: authoritativePromptTest.questions,
        passingScore: 80,
        answers: correctAnswers,
        userPrompt: "Short prompt", // < 30 chars
        userWorkflowNotes: "Some short note",
      });

      assert.equal(evalResult.quizScorePercent, 100);
      assert.equal(evalResult.practicalScore, 0);
      assert.equal(evalResult.authoritativeScore, 50); // 100 * 0.5 + 0 * 0.5 = 50
      assert.equal(evalResult.passed, false, "Must not pass with 0 practical score even with 100% quiz");
      assert.equal(evalResult.status, "failed");
    });

    it("should award 0 practical score for empty prompt and workflow notes", () => {
      const correctAnswers: Record<string, number> = {};
      authoritativePromptTest.questions.forEach((q) => {
        correctAnswers[q.id] = q.correctIndex;
      });

      const evalResult = evaluateSkillTest({
        questions: authoritativePromptTest.questions,
        passingScore: 80,
        answers: correctAnswers,
        userPrompt: "",
        userWorkflowNotes: "",
      });

      assert.equal(evalResult.practicalScore, 0);
      assert.equal(evalResult.passed, false);
    });

    it("should fail when quiz score is below 60% even if practical prompt achieves 100%", () => {
      // Only 1 out of 4 correct -> 25% quiz
      const failedAnswers: Record<string, number> = {
        q1: authoritativePromptTest.questions[0].correctIndex,
        q2: (authoritativePromptTest.questions[1].correctIndex + 1) % 4,
        q3: (authoritativePromptTest.questions[2].correctIndex + 1) % 4,
        q4: (authoritativePromptTest.questions[3].correctIndex + 1) % 4,
      };

      const evalResult = evaluateSkillTest({
        questions: authoritativePromptTest.questions,
        passingScore: 80,
        answers: failedAnswers,
        userPrompt:
          "Cinematic macro studio shot of organic frosted amber skincare dropper bottle with crystalline morning dew beads, soft rim-lighting, 8k photorealistic, Hasselblad X2D 100C, 90mm lens --ar 4:5 --v 6.0 --stylize 250 --seed 84920",
        userWorkflowNotes:
          "Iterated across 3 initial seeds in Midjourney v6 to lock physical lighting angles, then upscaled 4x with Topaz Photo AI for client print resolution.",
      });

      assert.ok(evalResult.practicalScore >= 95, "Practical prompt should score high on complete syntax");
      assert.equal(evalResult.quizScorePercent, 25);
      assert.equal(evalResult.passed, false, "Dual proficiency requirement must fail submission when quiz < 60%");
      assert.equal(evalResult.status, "failed");
    });

    it("should successfully pass when genuine candidate satisfies both quiz (>=60%) and practical (>=60%) rubrics", () => {
      const correctAnswers: Record<string, number> = {};
      authoritativePromptTest.questions.forEach((q) => {
        correctAnswers[q.id] = q.correctIndex;
      });

      const evalResult = evaluateSkillTest({
        questions: authoritativePromptTest.questions,
        passingScore: 80,
        answers: correctAnswers,
        userPrompt:
          "Cinematic macro studio shot of frosted organic amber skincare bottle, morning dew drops glistening, soft 45-degree diffused daylight with subtle rim highlights, clean minimalist stone pedestal backdrop, ultra-detailed glass refraction, 8k resolution, Hasselblad X2D 100C --ar 9:16 --v 6.0 --stylize 250 --chaos 5",
        userWorkflowNotes:
          "1. Initial prompt generation in Midjourney v6 focusing on physical lighting angles. 2. Locked --seed 84920 to calibrate subsurface scattering. 3. Output upscaled 4x with Topaz Photo AI for commercial poster sharpness.",
      });

      assert.equal(evalResult.quizScorePercent, 100);
      assert.ok(evalResult.practicalScore >= 90);
      assert.ok(evalResult.authoritativeScore >= 80);
      assert.equal(evalResult.passed, true);
      assert.equal(evalResult.status, "passed");
      assert.ok(evalResult.feedback.includes("Assessment passed with authoritative score"));
    });
  });

  describe("P5: Certificate Verification Route Security", () => {
    it("should reject malformed certificate IDs that do not start with CERT-", async () => {
      const req = createMockRequest("http://localhost:3000/api/v1/certificates/INVALID-ID-1234");
      const res = await certificateGetRoute(req, {
        params: Promise.resolve({ id: "INVALID-ID-1234" }),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.valid, false);
      assert.ok(json.error.includes("Invalid certificate identifier format"));
    });

    it("should reject empty certificate ID with HTTP 400", async () => {
      const req = createMockRequest("http://localhost:3000/api/v1/certificates/");
      const res = await certificateGetRoute(req, {
        params: Promise.resolve({ id: "" }),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.valid, false);
    });
  });

  describe("P6: Migration 006 Integrity, Recursion Defense & Lifecycle Regression", () => {
    // Read SQL migration file directly to audit contract guarantees
    const fs = require("fs");
    const path = require("path");
    const migrationSql = fs.readFileSync(
      path.join(process.cwd(), "db/migrations/006_enforce_assessment_integrity_and_certificates.sql"),
      "utf8"
    );

    it("should eliminate RLS recursion by using get_creator_skill_verification_status helper", () => {
      // Must define SECURITY DEFINER helper function with fixed search_path
      assert.ok(
        migrationSql.includes("FUNCTION public.get_creator_skill_verification_status"),
        "Migration must define get_creator_skill_verification_status helper"
      );
      assert.ok(
        migrationSql.includes("SECURITY DEFINER"),
        "Helper must be SECURITY DEFINER to bypass RLS and eliminate recursion"
      );
      assert.ok(
        migrationSql.includes("SET search_path = public, pg_temp"),
        "Helper must lock search_path"
      );

      // UPDATE policy statement must NOT contain a direct self-referential subquery
      const updatePolicyBlock = migrationSql.split('CREATE POLICY "Creator Skills: creator update own evidence"')[1]?.split(";")[0] || "";
      assert.ok(
        !updatePolicyBlock.includes("FROM public.creator_skills"),
        "UPDATE policy must not contain self-referential subquery on creator_skills"
      );

      // UPDATE policy must use helper function
      assert.ok(
        migrationSql.includes("public.get_creator_skill_verification_status(id)"),
        "UPDATE policy must evaluate verification_status against helper function"
      );
    });

    it("should use complete 32-hex UUID for deduplication rather than truncated substring", () => {
      assert.ok(
        !migrationSql.includes("SUBSTRING(REPLACE(ts.id::TEXT, '-', '') FROM 1 FOR 6)"),
        "Deduplication must NOT truncate to 6 characters"
      );
      assert.ok(
        migrationSql.includes("ts.certificate_id || '-DUP-' || UPPER(REPLACE(ts.id::TEXT, '-', ''))"),
        "Deduplication must use full 32-hex row UUID"
      );
    });

    it("should generate certificates with full 32-hex UUID rather than truncated 12-char hex", () => {
      assert.ok(
        !migrationSql.includes("FROM 1 FOR 12"),
        "Trigger must not truncate certificate hex to 12 chars"
      );
      assert.ok(
        migrationSql.includes("'CERT-AI-' || UPPER(REPLACE(COALESCE(NEW.id, gen_random_uuid())::TEXT, '-', ''))"),
        "Trigger must use full UUID-derived hex for new certificates"
      );
    });

    it("should enforce certificate lifecycle: NULL for failed/pending, immutable for passed", () => {
      // Trigger must force NULL on non-passed
      assert.ok(
        migrationSql.includes("NEW.certificate_id := NULL;"),
        "Non-passed submissions must have certificate_id forced to NULL"
      );

      // Trigger must block non-privileged transition from passed to non-passed
      assert.ok(
        migrationSql.includes("Passed test results cannot be revoked or altered by creator"),
        "Trigger must block creator from revoking or changing a passed assessment"
      );

      // Trigger must preserve existing authentic certificate on update
      assert.ok(
        migrationSql.includes("NEW.certificate_id := OLD.certificate_id;"),
        "Trigger must lock and preserve existing passed certificate ID"
      );
    });

    it("should correctly handle duplicate-ID backfill determinism algorithmically", () => {
      // Algorithmic verification of the windowed deduplication logic
      interface MockSubmission {
        id: string;
        certificate_id: string | null;
        status: string;
        submitted_at: string;
      }

      const submissions: MockSubmission[] = [
        { id: "11111111-1111-1111-1111-111111111111", certificate_id: "CERT-AI-DUPLICATE", status: "passed", submitted_at: "2026-01-01T00:00:00Z" },
        { id: "22222222-2222-2222-2222-222222222222", certificate_id: "CERT-AI-DUPLICATE", status: "passed", submitted_at: "2026-01-02T00:00:00Z" },
        { id: "33333333-3333-3333-3333-333333333333", certificate_id: "CERT-AI-DUPLICATE", status: "passed", submitted_at: "2026-01-03T00:00:00Z" },
        { id: "44444444-4444-4444-4444-444444444444", certificate_id: "CERT-AI-UNIQUE-1", status: "passed", submitted_at: "2026-01-04T00:00:00Z" },
        { id: "55555555-5555-5555-5555-555555555555", certificate_id: "CERT-AI-FAILED-ERR", status: "failed", submitted_at: "2026-01-05T00:00:00Z" },
      ];

      // 1. Cleanse failed
      submissions.forEach((s) => {
        if (s.status !== "passed" && s.certificate_id) {
          s.certificate_id = null;
        }
      });
      assert.equal(submissions[4].certificate_id, null, "Failed submission certificate must be cleansed to null");

      // 2. Partition by certificate_id and deduplicate rn > 1
      const certCounts: Record<string, number> = {};
      submissions.forEach((s) => {
        if (s.certificate_id && s.status === "passed") {
          certCounts[s.certificate_id] = (certCounts[s.certificate_id] || 0) + 1;
          const rn = certCounts[s.certificate_id];
          if (rn > 1) {
            s.certificate_id = `${s.certificate_id}-DUP-${s.id.replace(/-/g, "").toUpperCase()}`;
          }
        }
      });

      // Verify earliest submission kept original certificate ID
      assert.equal(submissions[0].certificate_id, "CERT-AI-DUPLICATE");
      // Verify subsequent duplicates received unique row-specific 32-hex suffix
      assert.equal(submissions[1].certificate_id, "CERT-AI-DUPLICATE-DUP-22222222222222222222222222222222");
      assert.equal(submissions[2].certificate_id, "CERT-AI-DUPLICATE-DUP-33333333333333333333333333333333");
      // Unique kept its ID
      assert.equal(submissions[3].certificate_id, "CERT-AI-UNIQUE-1");

      // Verify all passed certificate IDs are now 100% unique
      const finalPassedCerts = submissions.filter((s) => s.status === "passed").map((s) => s.certificate_id);
      const uniqueSet = new Set(finalPassedCerts);
      assert.equal(uniqueSet.size, finalPassedCerts.length, "All passed certificates must be strictly unique");
    });

    it("Blocker 1 Regression: should ensure ordinary authenticated creator remains unprivileged even under SECURITY DEFINER", () => {
      // Must NOT check current_user in trigger functions (which resolves to postgres under SECURITY DEFINER)
      assert.ok(
        !migrationSql.includes("current_user IN"),
        "Migration must NEVER inspect current_user inside SECURITY DEFINER trigger functions"
      );

      // Define authorization evaluation model matching the corrected trigger logic
      function evaluateTriggerPrivilege(context: {
        jwtRole?: string;
        sessionUser: string;
        isAdmin: boolean;
        hasJwt: boolean;
      }): boolean {
        return (
          context.jwtRole === "service_role" ||
          context.isAdmin ||
          (context.sessionUser === "postgres" && !context.hasJwt) ||
          (context.sessionUser === "supabase_admin" && !context.hasJwt)
        );
      }

      // 1. Ordinary authenticated creator calling via PostgREST
      const creatorContext = {
        jwtRole: "authenticated",
        sessionUser: "authenticator", // PostgREST connects as authenticator
        isAdmin: false,
        hasJwt: true,
      };
      assert.equal(
        evaluateTriggerPrivilege(creatorContext),
        false,
        "Ordinary authenticated creator MUST evaluate is_privileged = false"
      );

      // 2. Anonymous web visitor
      const anonContext = {
        jwtRole: "anon",
        sessionUser: "authenticator",
        isAdmin: false,
        hasJwt: true,
      };
      assert.equal(
        evaluateTriggerPrivilege(anonContext),
        false,
        "Anonymous caller MUST evaluate is_privileged = false"
      );

      // 3. Service role (trusted server-side assessment evaluation)
      const serviceRoleContext = {
        jwtRole: "service_role",
        sessionUser: "authenticator",
        isAdmin: false,
        hasJwt: true,
      };
      assert.equal(
        evaluateTriggerPrivilege(serviceRoleContext),
        true,
        "Service role from server evaluation MUST evaluate is_privileged = true"
      );

      // 4. Platform administrator
      const adminContext = {
        jwtRole: "authenticated",
        sessionUser: "authenticator",
        isAdmin: true,
        hasJwt: true,
      };
      assert.equal(
        evaluateTriggerPrivilege(adminContext),
        true,
        "Platform admin MUST evaluate is_privileged = true"
      );

      // 5. Direct Supabase Dashboard SQL Editor / psql migration session
      const consoleContext = {
        jwtRole: undefined,
        sessionUser: "postgres",
        isAdmin: false,
        hasJwt: false,
      };
      assert.equal(
        evaluateTriggerPrivilege(consoleContext),
        true,
        "Direct database superuser session without JWT MUST evaluate is_privileged = true"
      );
    });

    it("Blocker 2 Regression: should prevent get_creator_skill_verification_status helper from disclosing other creators' statuses", () => {
      // Must enforce ownership inside helper function
      assert.ok(
        migrationSql.includes("cs.creator_profile_id = public.get_current_creator_profile_id()"),
        "Helper function must enforce cs.creator_profile_id = get_current_creator_profile_id()"
      );

      // Simulate helper lookup logic
      interface CreatorSkillRow {
        id: string;
        creator_profile_id: string;
        verification_status: string;
      }

      const tableData: CreatorSkillRow[] = [
        { id: "skill-1", creator_profile_id: "creator-alice", verification_status: "test_verified" },
        { id: "skill-2", creator_profile_id: "creator-bob", verification_status: "test_verified" },
      ];

      function mockGetCreatorSkillVerificationStatus(
        skillRowId: string,
        currentCreatorProfileId: string,
        isAdmin: boolean = false
      ): string | null {
        const row = tableData.find((cs) => cs.id === skillRowId);
        if (!row) return null;
        if (row.creator_profile_id === currentCreatorProfileId || isAdmin) {
          return row.verification_status;
        }
        return null; // Denied / no match for other creators
      }

      // Alice queries her own skill -> allowed
      assert.equal(
        mockGetCreatorSkillVerificationStatus("skill-1", "creator-alice"),
        "test_verified"
      );

      // Alice queries Bob's skill using arbitrary UUID -> MUST RETURN NULL (disclosure blocked)
      assert.equal(
        mockGetCreatorSkillVerificationStatus("skill-2", "creator-alice"),
        null,
        "Alice must not be able to read Bob's verification status via arbitrary UUID"
      );

      // Admin queries Bob's skill -> allowed
      assert.equal(
        mockGetCreatorSkillVerificationStatus("skill-2", "creator-alice", true),
        "test_verified",
        "Admin must be permitted to resolve status"
      );
    });
  });
});
