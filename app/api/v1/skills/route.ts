import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentCreatorProfile } from "@/lib/supabase/auth-helpers";
import { claimSkillSchema } from "@/lib/validations/skill";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get("creatorId");

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        skills: [],
        creatorSkills: [],
        notice: "Supabase not configured",
      });
    }

    const supabase = await createClient();

    // 1. Fetch catalog of all active skills
    const { data: skills, error: skillsErr } = await supabase
      .from("skills")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (skillsErr) {
      return NextResponse.json({ error: skillsErr.message }, { status: 500 });
    }

    // 2. If creator specified or user logged in, fetch creator's claimed/verified skills
    let creatorSkills: any[] = [];
    let targetProfileId = creatorId;

    if (!targetProfileId) {
      try {
        const { profile } = await getCurrentCreatorProfile();
        targetProfileId = profile?.id;
      } catch (_e) {
        // Unauthenticated or not creator
      }
    }

    if (targetProfileId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetProfileId);
      let query = supabase
        .from("creator_skills")
        .select("*, skills!inner(name, category, description, weight)");

      if (isUuid) {
        query = query.eq("creator_profile_id", targetProfileId);
      } else {
        query = query.eq("creator_profiles.slug", targetProfileId);
      }

      const { data: cSkills } = await query;
      if (cSkills) {
        creatorSkills = cSkills;
      }
    }

    return NextResponse.json({
      skills: skills || [],
      creatorSkills,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { profile } = await getCurrentCreatorProfile();
    const body = await request.json();
    const parseResult = claimSkillSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid skill data" },
        { status: 400 }
      );
    }
    const validated = parseResult.data;

    const supabase = await createClient();
    let skillId = validated.skill_id;

    // If skill_id not provided, find or create skill by name
    if (!skillId) {
      if (!validated.skill_name) {
        return NextResponse.json({ error: "Either skill_id or skill_name is required" }, { status: 400 });
      }

      const { data: existingSkill } = await supabase
        .from("skills")
        .select("id")
        .ilike("name", validated.skill_name.trim())
        .maybeSingle();

      if (existingSkill) {
        skillId = existingSkill.id;
      } else {
        const { data: newSkill, error: createSkillErr } = await supabase
          .from("skills")
          .insert({
            name: validated.skill_name.trim(),
            category: validated.category,
            description: `AI skill in ${validated.category}`,
            weight: 1.0,
            is_active: true,
          })
          .select()
          .single();

        if (createSkillErr) {
          return NextResponse.json({ error: createSkillErr.message }, { status: 400 });
        }
        skillId = newSkill.id;
      }
    }

    // Check if skill already exists for this creator to prevent regressing verified status or score
    const { data: existingSkillRow } = await supabase
      .from("creator_skills")
      .select("id, verification_status, score")
      .eq("creator_profile_id", profile.id)
      .eq("skill_id", skillId)
      .maybeSingle();

    const isAlreadyVerified =
      existingSkillRow?.verification_status === "test_verified" ||
      existingSkillRow?.verification_status === "client_verified";

    // If already verified by official assessment or client, strictly preserve verified status and authoritative score
    const targetStatus = isAlreadyVerified
      ? existingSkillRow.verification_status
      : validated.evidence_url
      ? "portfolio_evidence"
      : "claimed";

    const targetScore = isAlreadyVerified
      ? Number(existingSkillRow.score) || 85.0
      : targetStatus === "portfolio_evidence"
      ? 75.0
      : 50.0;

    const { data: creatorSkill, error: csErr } = await supabase
      .from("creator_skills")
      .upsert(
        {
          creator_profile_id: profile.id,
          skill_id: skillId,
          verification_status: targetStatus,
          score: targetScore,
          evidence_text: validated.evidence_text || null,
          evidence_url: validated.evidence_url || null,
        },
        { onConflict: "creator_profile_id,skill_id" }
      )
      .select("*, skills(name, category)")
      .single();

    if (csErr) {
      return NextResponse.json({ error: csErr.message }, { status: 400 });
    }

    return NextResponse.json({ data: creatorSkill, message: "Skill registered successfully" }, { status: 201 });
  } catch (err: any) {
    const status = err.name === "AuthError" ? err.statusCode : 400;
    return NextResponse.json({ error: err?.message || "Failed to register skill" }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { profile } = await getCurrentCreatorProfile();
    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get("skillId");

    if (!skillId) {
      return NextResponse.json({ error: "skillId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    let targetSkillId: string | null = skillId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(skillId);

    if (!isUuid) {
      const { data: matchedSkill } = await supabase
        .from("skills")
        .select("id")
        .ilike("name", skillId.trim())
        .maybeSingle();

      if (!matchedSkill) {
        return NextResponse.json(
          { error: "Skill not found in catalog or creator profile" },
          { status: 404 }
        );
      }
      targetSkillId = matchedSkill.id;
    }

    const { data: deletedRows, error } = await supabase
      .from("creator_skills")
      .delete()
      .eq("creator_profile_id", profile.id)
      .eq("skill_id", targetSkillId)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json(
        { error: "Skill not found on this creator profile or already removed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Skill removed successfully" });
  } catch (err: any) {
    const status = err.name === "AuthError" ? err.statusCode : 400;
    return NextResponse.json({ error: err?.message || "Failed to delete skill" }, { status });
  }
}
