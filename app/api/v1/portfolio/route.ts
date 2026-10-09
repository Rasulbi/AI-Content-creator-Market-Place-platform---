import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCreatorProfile } from "@/lib/supabase/auth-helpers";
import { createPortfolioProjectSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get("creatorId");
    const contentType = searchParams.get("contentType");

    const supabase = await createClient();
    let query = supabase
      .from("portfolio_projects")
      .select("*, creator_profiles!inner(name, slug, avatar_url, category)")
      .order("created_at", { ascending: false });

    if (creatorId) {
      query = query.eq("creator_profile_id", creatorId);
    }
    if (contentType) {
      query = query.eq("content_type", contentType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getCurrentCreatorProfile();
    const body = await request.json();
    const validated = createPortfolioProjectSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("portfolio_projects")
      .insert({
        creator_profile_id: profile.id,
        title: validated.title,
        description: validated.description,
        content_type: validated.content_type,
        tools_used: validated.tools_used,
        media_url: validated.media_url,
        prompt: validated.prompt || null,
        process_evidence: validated.process_evidence || null,
        external_url: validated.external_url || null,
        linked_skill_ids: validated.linked_skill_ids,
        metrics: validated.metrics,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data, message: "Project created" }, { status: 201 });
  } catch (err: any) {
    const status = err.name === "AuthError" ? err.statusCode : 400;
    return NextResponse.json({ error: err?.message || "Invalid payload" }, { status });
  }
}
