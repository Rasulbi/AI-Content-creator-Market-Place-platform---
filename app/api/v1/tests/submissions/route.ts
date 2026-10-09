import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCreatorProfile } from "@/lib/supabase/auth-helpers";
import { submitSkillTestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getCurrentCreatorProfile();
    const body = await request.json();
    const validated = submitSkillTestSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("test_submissions")
      .insert({
        test_id: validated.test_id,
        creator_profile_id: profile.id,
        answers: validated.answers,
        evidence_media_urls: validated.evidence_media_urls,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { data, message: "Test submitted successfully for evaluation." },
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
