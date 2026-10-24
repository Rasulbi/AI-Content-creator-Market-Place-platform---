import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { evaluateTestSubmissionSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database service (Supabase) is not configured." },
        { status: 503 }
      );
    }

    const { user } = await requireAdmin();
    const body = await request.json();
    const validated = evaluateTestSubmissionSchema.parse(body);

    const adminSupabase = createAdminClient();

    // 1. Fetch submission details
    const { data: submission, error: sError } = await adminSupabase
      .from("test_submissions")
      .select("id, test_id, creator_profile_id, skill_tests(skill_id)")
      .eq("id", validated.submission_id)
      .single();

    if (sError || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // 2. Update evaluation
    const { data: updatedSub, error: uError } = await adminSupabase
      .from("test_submissions")
      .update({
        score: validated.score,
        status: validated.status,
        feedback: validated.feedback,
        evaluated_by: user.id,
        evaluated_at: new Date().toISOString(),
      })
      .eq("id", validated.submission_id)
      .select()
      .single();

    if (uError) {
      return NextResponse.json({ error: uError.message }, { status: 500 });
    }

    // 3. Elevate skill on pass
    const skillId = (submission.skill_tests as any)?.skill_id;
    if (validated.status === "passed" && skillId) {
      await adminSupabase.from("creator_skills").upsert(
        {
          creator_profile_id: submission.creator_profile_id,
          skill_id: skillId,
          verification_status: "test_verified",
          score: validated.score,
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        },
        { onConflict: "creator_profile_id,skill_id" }
      );

      // Recalculate passport score
      const { data: allSkills } = await adminSupabase
        .from("creator_skills")
        .select("score")
        .eq("creator_profile_id", submission.creator_profile_id);

      if (allSkills && allSkills.length > 0) {
        const avgScore =
          allSkills.reduce((acc, curr) => acc + Number(curr.score), 0) /
          allSkills.length;
        await adminSupabase
          .from("creator_profiles")
          .update({
            passport_score: Math.round(avgScore * 10) / 10,
            is_verified: true,
          })
          .eq("id", submission.creator_profile_id);
      }
    }

    return NextResponse.json({
      data: updatedSub,
      message: `Submission graded as ${validated.status}`,
    });
  } catch (err: any) {
    const status = err.name === "AuthError" ? err.statusCode : 400;
    return NextResponse.json(
      { error: err?.message || "Evaluation failed" },
      { status }
    );
  }
}
