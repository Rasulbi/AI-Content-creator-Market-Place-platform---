import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentCreatorProfile, requireAuth } from "@/lib/supabase/auth-helpers";
import { SKILL_TESTS_CATALOG } from "@/lib/skill-passport-store";
import { getAuthoritativeSkillTest } from "@/lib/server/skill-tests-data";
import { submitSkillTestSchema } from "@/lib/validations/test";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    // 1. Enforce server-side authentication FIRST
    const auth = await requireAuth();

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ data: [] });
    }

    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get("creatorId");

    let profileId: string | null = null;

    if (auth.user.role === "admin") {
      // Admins are authorized to view all submissions or filter by creatorId
      profileId = creatorIdParam;
    } else if (auth.user.role === "creator") {
      // Creators may ONLY access their own submissions
      const { profile } = await getCurrentCreatorProfile();
      if (!profile) {
        return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
      }

      // If client supplied an explicit creatorId, strictly verify ownership
      if (creatorIdParam && creatorIdParam !== profile.id && creatorIdParam !== profile.slug) {
        return NextResponse.json(
          { error: "Access denied. You can only view your own test submissions." },
          { status: 403 }
        );
      }

      profileId = profile.id;
    } else {
      // Brands or unauthorized roles cannot access private test submissions
      return NextResponse.json(
        { error: "Access denied. Test submissions are only accessible to creators and administrators." },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    let query = supabase
      .from("test_submissions")
      .select("*, skill_tests(id, title, difficulty, passing_score, skill_id)")
      .order("submitted_at", { ascending: false });

    if (profileId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId);
      if (isUuid) {
        query = query.eq("creator_profile_id", profileId);
      } else {
        query = query.eq("creator_profiles.slug", profileId);
      }
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    const status = err.name === "AuthError" ? err.statusCode : 500;
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status }
    );
  }
}

export interface SkillTestEvaluationResult {
  authoritativeScore: number;
  quizScorePercent: number;
  practicalScore: number;
  passed: boolean;
  status: "passed" | "failed";
  feedback: string;
}

export function evaluateSkillTest({
  questions,
  passingScore = 80,
  answers = {},
  userPrompt = "",
  userWorkflowNotes = "",
}: {
  questions: any[];
  passingScore?: number;
  answers?: Record<string, any>;
  userPrompt?: string | null;
  userWorkflowNotes?: string | null;
}): SkillTestEvaluationResult {
  // 1. Calculate Quiz Score from questions answer key
  let correctCount = 0;
  const questionCount = Array.isArray(questions) ? questions.length : 0;
  if (questionCount > 0) {
    questions.forEach((q: any) => {
      if (
        answers &&
        answers[q.id] !== undefined &&
        q.correctIndex !== undefined &&
        Number(answers[q.id]) === Number(q.correctIndex)
      ) {
        correctCount++;
      }
    });
  }
  const quizScorePercent = questionCount > 0
    ? Math.round((correctCount / questionCount) * 100)
    : 0;

  // 2. Authoritative Practical Rubric Evaluation (0 to 100)
  const promptText = String(userPrompt || answers?.userPrompt || "").trim();
  const workflowNotes = String(userWorkflowNotes || answers?.userWorkflowNotes || "").trim();

  let practicalScore = 0;

  // Empty or placeholder responses receive 0
  if (promptText.length >= 30) {
    // Dimension A: Prompt Composition & Descriptive Granularity (up to 30 pts)
    if (promptText.length >= 70) {
      practicalScore += 30;
    } else {
      practicalScore += 15;
    }

    // Dimension B: Model Parameters & Technical Syntax Calibration (up to 35 pts)
    const lowerPrompt = promptText.toLowerCase();
    // 1. Aspect ratio / resolution syntax (10 pts)
    if (
      lowerPrompt.includes("--ar") ||
      lowerPrompt.includes("16:9") ||
      lowerPrompt.includes("9:16") ||
      lowerPrompt.includes("4:5") ||
      lowerPrompt.includes("1:1") ||
      lowerPrompt.includes("1080p") ||
      lowerPrompt.includes("4k") ||
      lowerPrompt.includes("fps")
    ) {
      practicalScore += 10;
    }

    // 2. Model version / engine architecture flag (10 pts)
    if (
      lowerPrompt.includes("--v") ||
      lowerPrompt.includes("v6") ||
      lowerPrompt.includes("flux") ||
      lowerPrompt.includes("kling") ||
      lowerPrompt.includes("runway") ||
      lowerPrompt.includes("gen-3") ||
      lowerPrompt.includes("elevenlabs") ||
      lowerPrompt.includes("comfyui") ||
      lowerPrompt.includes("luma")
    ) {
      practicalScore += 10;
    }

    // 3. Guidance, styling, seed, or latent controls (15 pts)
    if (
      lowerPrompt.includes("--stylize") ||
      lowerPrompt.includes("--s") ||
      lowerPrompt.includes("--chaos") ||
      lowerPrompt.includes("--c") ||
      lowerPrompt.includes("--seed") ||
      lowerPrompt.includes("--cfg") ||
      lowerPrompt.includes("stability") ||
      lowerPrompt.includes("denoise") ||
      lowerPrompt.includes("controlnet") ||
      lowerPrompt.includes("depth") ||
      lowerPrompt.includes("negative")
    ) {
      practicalScore += 15;
    }

    // Dimension C: Workflow Iteration & Production Notes (up to 35 pts)
    if (workflowNotes.length >= 50) {
      const lowerNotes = workflowNotes.toLowerCase();
      const hasTechnicalWorkflow =
        lowerNotes.includes("seed") ||
        lowerNotes.includes("upscale") ||
        lowerNotes.includes("lighting") ||
        lowerNotes.includes("pass") ||
        lowerNotes.includes("refine") ||
        lowerNotes.includes("render") ||
        lowerNotes.includes("export") ||
        lowerNotes.includes("iteration") ||
        lowerNotes.includes("sample") ||
        lowerNotes.includes("mask") ||
        lowerNotes.includes("audio") ||
        lowerNotes.includes("model");
      practicalScore += hasTechnicalWorkflow ? 35 : 20;
    } else if (workflowNotes.length >= 20) {
      practicalScore += 15;
    }
  }

  practicalScore = Math.min(practicalScore, 100);

  // 3. Authoritative Overall Score (50% quiz + 50% practical)
  const authoritativeScore = Math.round(quizScorePercent * 0.5 + practicalScore * 0.5);

  // Passing criteria:
  // - Questions must exist
  // - Combined score >= passingScore (default 80%)
  // - Quiz score must be at least 60%
  // - Practical score must be at least 60%
  const passed =
    questionCount > 0 &&
    authoritativeScore >= passingScore &&
    quizScorePercent >= 60 &&
    practicalScore >= 60;

  const status: "passed" | "failed" = passed ? "passed" : "failed";
  const feedback = passed
    ? `Exemplary technical performance! Assessment passed with authoritative score ${authoritativeScore}% (Quiz: ${quizScorePercent}%, Practical: ${practicalScore}%). Technical parameter syntax and workflow execution meet verified benchmark requirements.`
    : `Assessment score ${authoritativeScore}% is below passing threshold of ${passingScore}% (Quiz: ${quizScorePercent}%, Practical: ${practicalScore}%). Both quiz and practical prompt execution require minimum 60% proficiency. Review parameter syntax and retake assessment.`;

  return {
    authoritativeScore,
    quizScorePercent,
    practicalScore,
    passed,
    status,
    feedback,
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Enforce creator authentication FIRST
    const { profile } = await getCurrentCreatorProfile();

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database service (Supabase) is not configured." },
        { status: 503 }
      );
    }
    const body = await request.json();

    const normalizedBody = {
      test_id: String(body.test_id || body.testId || ""),
      answers: body.answers || {},
      evidence_media_urls: Array.isArray(body.evidence_media_urls)
        ? body.evidence_media_urls
        : Array.isArray(body.evidenceMediaUrls)
        ? body.evidenceMediaUrls
        : [],
      score: typeof body.score === "number" ? body.score : null,
      status: body.status === "passed" ? "passed" : body.status === "failed" ? "failed" : "pending",
      feedback: body.feedback || null,
    };

    const parseResult = submitSkillTestSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid test submission data" },
        { status: 400 }
      );
    }

    const validated = parseResult.data;
    const rawTestId = validated.test_id;
    const answers = validated.answers;
    const evidenceUrls = validated.evidence_media_urls;
    const score = validated.score ?? null;
    const status = validated.status || "pending";
    const feedback = validated.feedback || null;

    const supabase = await createClient();

    // Resolve or Auto-Provision skill_test record
    let resolvedTestId: string | null = null;
    let catalogItem: (typeof SKILL_TESTS_CATALOG)[number] | undefined = undefined;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawTestId);

    if (isUuid) {
      resolvedTestId = rawTestId;
    } else {
      // Find preset definition from catalog (do NOT fallback to random test)
      catalogItem = SKILL_TESTS_CATALOG.find(
        (t) => t.id === rawTestId || t.title.toLowerCase().includes(rawTestId.toLowerCase())
      );

      if (!catalogItem) {
        return NextResponse.json(
          { error: `Invalid test ID or unknown catalog slug: ${rawTestId}` },
          { status: 400 }
        );
      }

      // Check if skill_test already exists with this title
      const { data: existingTest } = await supabase
        .from("skill_tests")
        .select("id")
        .eq("title", catalogItem.title)
        .maybeSingle();

      if (existingTest) {
        resolvedTestId = existingTest.id;
      } else {
        // Ensure skill exists
        let skillId: string | null = null;
        const { data: existingSkill } = await supabase
          .from("skills")
          .select("id")
          .ilike("name", catalogItem.associatedSkill)
          .maybeSingle();

        if (existingSkill) {
          skillId = existingSkill.id;
        } else {
          const { data: newSkill } = await supabase
            .from("skills")
            .insert({
              name: catalogItem.associatedSkill,
              category: catalogItem.category,
              description: `Standardized skill for ${catalogItem.associatedSkill}`,
              weight: 1.0,
              is_active: true,
            })
            .select()
            .single();
          skillId = newSkill?.id || null;
        }

        if (skillId) {
          const { data: createdTest } = await supabase
            .from("skill_tests")
            .insert({
              skill_id: skillId,
              title: catalogItem.title,
              description: catalogItem.description,
              difficulty: catalogItem.difficulty.toLowerCase() === "master" ? "expert" : "intermediate",
              passing_score: catalogItem.passingScore,
              duration_minutes: catalogItem.durationMinutes,
              questions: (catalogItem.questions || []) as any,
              rubric: {},
              is_active: true,
            })
            .select()
            .single();

          resolvedTestId = createdTest?.id || null;
        }
      }
    }

    if (!resolvedTestId) {
      return NextResponse.json({ error: "Could not resolve valid skill test" }, { status: 400 });
    }

    // Server-side authoritative grading and evaluation
    let testQuestions: any[] = [];
    let passingScore = 80;
    let skillIdForTest: string | null = null;
    let testTitle = "";

    if (catalogItem) {
      const authoritativeCatalog = getAuthoritativeSkillTest(rawTestId);
      testQuestions = authoritativeCatalog?.questions || catalogItem.questions || [];
      passingScore = authoritativeCatalog?.passingScore ?? catalogItem.passingScore ?? 80;
      testTitle = authoritativeCatalog?.title || catalogItem.title;
    } else if (resolvedTestId) {
      const { data: dbTest } = await supabase
        .from("skill_tests")
        .select("title, questions, passing_score, skill_id")
        .eq("id", resolvedTestId)
        .maybeSingle();
      if (dbTest) {
        testQuestions = (dbTest.questions as any[]) || [];
        passingScore = Number(dbTest.passing_score) || 80;
        skillIdForTest = dbTest.skill_id;
        testTitle = dbTest.title;
      }
    }

    // Server-side authoritative grading and evaluation using evaluateSkillTest
    const evaluation = evaluateSkillTest({
      questions: testQuestions,
      passingScore,
      answers,
      userPrompt: String(validated.user_prompt || body.user_prompt || body.userPrompt || answers?.userPrompt || ""),
      userWorkflowNotes: String(validated.user_workflow_notes || body.user_workflow_notes || body.userWorkflowNotes || answers?.userWorkflowNotes || ""),
    });

    const testSlug = (catalogItem?.id || resolvedTestId).substring(0, 4).toUpperCase();
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    const certId = evaluation.passed ? `CERT-AI-${testSlug}-${randomHex}` : null;

    const answersPayload = {
      ...(answers || {}),
      ...(certId
        ? {
            __certificate: {
              certificateId: certId,
              issuedAt: new Date().toISOString(),
              score: evaluation.authoritativeScore,
              testTitle: testTitle || catalogItem?.title || "Standardized AI Skill Benchmark",
            },
          }
        : {}),
    };

    const { data, error } = await supabase
      .from("test_submissions")
      .insert({
        test_id: resolvedTestId,
        creator_profile_id: profile.id,
        answers: answersPayload,
        evidence_media_urls: evidenceUrls,
        score: evaluation.authoritativeScore,
        status: evaluation.status,
        feedback: evaluation.feedback,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // If passed, elevate skill verification status in creator_skills using privileged admin client
    if (evaluation.passed) {
      let sId = skillIdForTest;
      if (!sId && catalogItem) {
        const { data: sk, error: skErr } = await supabase
          .from("skills")
          .select("id")
          .ilike("name", catalogItem.associatedSkill)
          .maybeSingle();

        if (skErr) {
          console.error("[Assessment] Error querying skill by name:", skErr.message);
        }
        sId = sk?.id || null;
      }

      if (!sId) {
        console.error(
          `[Assessment] Could not resolve associated skill record for benchmark: "${catalogItem?.associatedSkill || resolvedTestId}". Verification elevation aborted.`
        );
        return NextResponse.json(
          {
            error:
              "Assessment was evaluated and recorded, but the associated skill record could not be found to grant a verified credential.",
            submissionId: data.id,
          },
          { status: 500 }
        );
      }

      const adminSupabase = createAdminClient();
      const { error: skillUpsertError } = await adminSupabase.from("creator_skills").upsert(
        {
          creator_profile_id: profile.id,
          skill_id: sId,
          verification_status: "test_verified",
          score: evaluation.authoritativeScore,
          verified_at: new Date().toISOString(),
          evidence_text: `Official Assessment Passed (${evaluation.authoritativeScore}%). Certificate: ${certId}`,
        },
        { onConflict: "creator_profile_id,skill_id" }
      );

      if (skillUpsertError) {
        console.error(
          "[Assessment] Failed to elevate creator skill verification status in database:",
          skillUpsertError.message
        );
        return NextResponse.json(
          {
            error:
              "Assessment was evaluated and recorded, but elevating your verified skill credential failed in the database. Please contact support or try again.",
            submissionId: data.id,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        data: {
          ...data,
          score: evaluation.authoritativeScore,
          status: evaluation.status,
          passed: evaluation.passed,
          quizScore: evaluation.quizScorePercent,
          promptScore: evaluation.practicalScore,
          feedback: evaluation.feedback,
          certificateId: certId,
          testName: testTitle || catalogItem?.title || "AI Benchmark Test",
        },
        message: evaluation.passed ? "Test passed successfully!" : "Test evaluated. Score did not meet passing threshold.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    const status = err.name === "AuthError" ? err.statusCode : 400;
    return NextResponse.json(
      { error: err?.message || "Invalid submission payload" },
      { status }
    );
  }
}
