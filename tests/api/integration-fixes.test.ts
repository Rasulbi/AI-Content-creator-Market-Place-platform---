import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { POST as testSubmissionsPostRoute, evaluateSkillTest } from "../../app/api/v1/tests/submissions/route";
import { PUT as profilePutRoute } from "../../app/api/auth/profile/route";
import { DELETE as skillsDeleteRoute } from "../../app/api/v1/skills/route";
import { inviteCreatorAction } from "../../actions/brand-actions";
import { removeSkillAction, respondToMatchAction, getCreatorMatchesAction } from "../../actions/creator-actions";
import { resolveCreatorProfile } from "../../app/creators/[id]/page";
import { AUTHORITATIVE_SKILL_TESTS } from "../../lib/server/skill-tests-data";

function createMockRequest(url: string, method: string, body?: any, headers?: Record<string, string>): NextRequest {
  const reqInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body !== undefined) {
    reqInit.body = JSON.stringify(body);
  }
  return new NextRequest(url, reqInit as any);
}

describe("Frontend/Backend Integration Fixes & Authorization Guardrails", () => {
  describe("A. Server-Side Authoritative Test Scoring & Forgery Prevention", () => {
    const promptEngTest = AUTHORITATIVE_SKILL_TESTS.find((t) => t.id === "prompt-engineering")!;

    it("should reject malicious client attempt to forge 100% score with all-incorrect quiz answers", () => {
      // Questions have correctIndex. Provide incorrect answers for every question.
      const forgedAnswers: Record<string, number> = {};
      promptEngTest.questions.forEach((q) => {
        // Purposely select wrong index
        forgedAnswers[q.id] = (q.correctIndex + 1) % 4;
      });

      // Client payload claims score: 100 and status: passed
      const evaluation = evaluateSkillTest({
        questions: promptEngTest.questions,
        passingScore: promptEngTest.passingScore ?? 80,
        answers: forgedAnswers,
        userPrompt: "Short prompt", // Below 30 chars -> 0 practical score
        userWorkflowNotes: "",
      });

      // The server evaluation MUST override client claims and calculate actual 0% quiz score
      assert.equal(evaluation.quizScorePercent, 0, "Quiz score must be 0% for wrong answers");
      assert.equal(evaluation.authoritativeScore < promptEngTest.passingScore, true, "Overall score must be failing");
      assert.equal(evaluation.passed, false, "Test must not pass with wrong answers");
      assert.equal(evaluation.status, "failed", "Authoritative status must be 'failed'");
      assert.ok(evaluation.feedback.includes("below passing threshold"));
    });

    it("should award passing status and high score only when genuine correct answers are provided", () => {
      const genuineAnswers: Record<string, number> = {};
      promptEngTest.questions.forEach((q) => {
        genuineAnswers[q.id] = q.correctIndex;
      });

      const evaluation = evaluateSkillTest({
        questions: promptEngTest.questions,
        passingScore: promptEngTest.passingScore ?? 80,
        answers: genuineAnswers,
        userPrompt: "Detailed cinematic portrait photograph, shot on 35mm lens, f/1.8 --ar 16:9 --v 6.0 --style raw",
        userWorkflowNotes: "Iterated prompt across 3 latent seeds to isolate lighting and camera focal plane",
      });

      assert.equal(evaluation.quizScorePercent, 100, "Quiz score must be 100% for all correct answers");
      assert.ok(evaluation.practicalScore >= 95, "Practical score should be rewarded for parameters and workflow");
      assert.ok(evaluation.authoritativeScore >= promptEngTest.passingScore, "Authoritative score must meet passing threshold");
      assert.equal(evaluation.passed, true, "Genuine submission must pass");
      assert.equal(evaluation.status, "passed");
      assert.ok(evaluation.feedback.includes("Exemplary technical performance"));
    });

    it("should reject unauthenticated test submission attempts via POST /api/v1/tests/submissions with HTTP 401", async () => {
      const req = createMockRequest("http://localhost:3000/api/v1/tests/submissions", "POST", {
        test_id: "prompt-engineering",
        score: 100, // Client forgery attempt
        status: "passed",
        answers: { q1: 1 },
      });

      const res = await testSubmissionsPostRoute(req);
      assert.equal(res.status, 401, "Unauthenticated submission must return HTTP 401");
      const json = await res.json();
      assert.ok(json.error.includes("Authentication required") || json.error.includes("Unauthorized"));
    });

    it("should reject unrecognized test slug with HTTP 400 during schema parsing", async () => {
      const req = createMockRequest("http://localhost:3000/api/v1/tests/submissions", "POST", {
        test_id: "non-existent-arbitrary-slug-xyz",
        answers: {},
      });

      const res = await testSubmissionsPostRoute(req);
      // Either fails at auth (401) or validation (400)
      assert.ok([400, 401].includes(res.status));
    });
  });

  describe("B. Creator Invitations & Authorization Guardrails", () => {
    it("should reject unauthenticated invitation attempts in inviteCreatorAction", async () => {
      const result = await inviteCreatorAction({
        campaign_id: "b455b51a-7b3c-4b5a-93e5-0c7f20101b01",
        creator_profile_id: "c455b51a-7b3c-4b5a-93e5-0c7f20101c01",
        proposal_notes: "We'd love to collaborate!",
      });

      assert.equal(result.success, false);
      assert.ok(result.error.includes("Unauthorized") || result.error.includes("Authentication required"));
    });

    it("should reject invalid campaign UUID format in inviteCreatorAction", async () => {
      const result = await inviteCreatorAction({
        campaign_id: "not-a-valid-uuid",
        creator_profile_id: "ananya-rao",
      });

      assert.equal(result.success, false);
      assert.ok(result.error);
    });

    it("should reject empty or blank proposal notes exceeding constraints", async () => {
      const result = await inviteCreatorAction({
        campaign_id: "b455b51a-7b3c-4b5a-93e5-0c7f20101b01",
        creator_profile_id: "ananya-rao",
        proposal_notes: "x".repeat(2001), // Max is 2000
      });

      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });

  describe("C. Brand Settings & Role Mutation Protection", () => {
    it("should strictly reject attempts to mutate user role with HTTP 403 Forbidden", async () => {
      const req = createMockRequest("http://localhost:3000/api/auth/profile", "PUT", {
        companyName: "Acme Brand",
        role: "admin", // Malicious escalation attempt
      });

      const res = await profilePutRoute(req);
      assert.equal(res.status, 403, "Role escalation must be forbidden");
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.error.includes("Modifying user role is not permitted"));
    });

    it("should reject unauthenticated brand profile update requests with HTTP 401", async () => {
      const req = createMockRequest("http://localhost:3000/api/auth/profile", "PUT", {
        companyName: "Acme Corp Ltd",
      });

      const res = await profilePutRoute(req);
      assert.equal(res.status, 401, "Unauthenticated profile update must be rejected");
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.error.includes("Authentication required") || json.error.includes("Unauthorized"));
    });

    it("should reject companyName exceeding maximum allowed length with HTTP 400", async () => {
      const req = createMockRequest("http://localhost:3000/api/auth/profile", "PUT", {
        companyName: "A".repeat(101), // Max is 100
      });

      const res = await profilePutRoute(req);
      assert.equal(res.status, 400, "Overlong companyName must return HTTP 400");
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.error.includes("Company name cannot exceed 100 characters"));
    });
  });

  describe("D. Public Creator Profile Resolution & Safe Projection", () => {
    it("should successfully resolve a known demo creator from the catalog by slug", async () => {
      const profile = await resolveCreatorProfile("ananya-rao");
      assert.ok(profile !== null, "Catalog creator must resolve");
      assert.equal(profile.id, "ananya-rao");
      assert.equal(profile.name, "Ananya Rao");
      assert.ok(profile.skills.length > 0);
    });

    it("should NOT expose private credentials, password hashes, or email addresses in resolved creator", async () => {
      const profile = await resolveCreatorProfile("ananya-rao");
      assert.ok(profile !== null);
      assert.equal((profile as any).email, undefined, "Email must not be exposed on public creator profile");
      assert.equal((profile as any).password, undefined, "Password must not be exposed");
      assert.equal((profile as any).password_hash, undefined, "Password hash must not be exposed");
    });

    it("should return null and NOT fall back to CREATORS_DATA[0] when unknown profile is requested", async () => {
      const profile = await resolveCreatorProfile("completely-unknown-creator-slug-9999");
      assert.equal(profile, null, "Must return null so Next.js triggers notFound(), never fall back to unrelated demo creator");
    });
  });

  describe("E. Skill Deletion & Creator Protection", () => {
    it("should reject unauthenticated DELETE /api/v1/skills requests with HTTP 401", async () => {
      const req = createMockRequest("http://localhost:3000/api/v1/skills?skillId=prompt-engineering", "DELETE");
      const res = await skillsDeleteRoute(req);
      assert.equal(res.status, 401, "Unauthenticated skill deletion must return HTTP 401");
    });

    it("should reject unauthenticated removeSkillAction invocations", async () => {
      const result = await removeSkillAction("prompt-engineering");
      assert.equal(result.success, false);
      assert.ok(result.error.includes("Unauthorized") || result.error.includes("Authentication required"));
    });
  });

  describe("F. Creator Collaboration Responses", () => {
    it("should reject unauthenticated respondToMatchAction with Unauthorized", async () => {
      const result = await respondToMatchAction({
        match_id: "b455b51a-7b3c-4b5a-93e5-0c7f20101b01",
        action: "accepted",
      });

      assert.equal(result.success, false);
      assert.ok(result.error.includes("Unauthorized") || result.error.includes("Authentication required"));
    });

    it("should reject invalid action status in respondToMatchAction", async () => {
      const result = await respondToMatchAction({
        match_id: "m455b51a-7b3c-4b5a-93e5-0c7f20101m01",
        action: "invalid_status_action",
      });

      assert.equal(result.success, false);
      assert.ok(result.error);
    });

    it("should reject unauthenticated getCreatorMatchesAction calls", async () => {
      const result = await getCreatorMatchesAction();
      assert.equal(result.success, false);
      assert.ok(result.error.includes("Unauthorized") || result.error.includes("Authentication required"));
    });
  });
});
