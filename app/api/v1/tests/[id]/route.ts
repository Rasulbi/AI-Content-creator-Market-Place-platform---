import { NextRequest, NextResponse } from "next/server";
import { getSanitizedSkillTest } from "@/lib/server/skill-tests-data";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const testId = (id || "").trim();

    if (!testId) {
      return NextResponse.json({ error: "Test ID is required" }, { status: 400 });
    }

    // 1. First check server authoritative catalog
    const catalogTest = getSanitizedSkillTest(testId);
    if (catalogTest) {
      return NextResponse.json({ data: catalogTest });
    }

    // 2. If not found in catalog and Supabase is configured, check database
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testId);

      let query = supabase
        .from("skill_tests")
        .select("id, title, description, difficulty, passing_score, duration_minutes, questions, skills(name, category)");

      if (isUuid) {
        query = query.eq("id", testId);
      } else {
        query = query.ilike("title", `%${testId}%`);
      }

      const { data: dbTest, error } = await query.maybeSingle();
      if (!error && dbTest) {
        // Sanitize database questions to strictly strip correctIndex and explanation
        const rawQuestions = Array.isArray(dbTest.questions) ? dbTest.questions : [];
        const sanitizedQuestions = rawQuestions.map((q: any) => ({
          id: String(q.id || ""),
          question: String(q.question || ""),
          options: Array.isArray(q.options) ? q.options.map(String) : [],
        }));

        const sanitized = {
          id: dbTest.id,
          title: dbTest.title,
          category: (dbTest.skills as any)?.category || "AI Benchmark",
          description: dbTest.description,
          difficulty: dbTest.difficulty,
          durationMinutes: dbTest.duration_minutes,
          passingScore: Number(dbTest.passing_score) || 80,
          associatedSkill: (dbTest.skills as any)?.name || "AI Skill",
          questions: sanitizedQuestions,
        };

        return NextResponse.json({ data: sanitized });
      }
    }

    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load assessment challenge" },
      { status: 500 }
    );
  }
}
