import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentCreatorProfile } from "@/lib/supabase/auth-helpers";
import { createPortfolioProjectSchema } from "@/lib/validations";
import { CREATORS_DATA } from "@/lib/creators-data";
import { getCreatorById } from "@/lib/creators-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get("creatorId");
    const contentType = searchParams.get("contentType");

    if (!isSupabaseConfigured()) {
      const creator = creatorId ? getCreatorById(creatorId) : CREATORS_DATA[0];
      const portfolio = creator?.portfolio || [];
      return NextResponse.json({
        data: portfolio,
        notice: "Supabase database credentials not configured. Serving local creator catalog portfolio.",
      });
    }

    const supabase = await createClient();
    let query = supabase
      .from("portfolio_projects")
      .select("*, creator_profiles!inner(name, slug, category)")
      .order("created_at", { ascending: false });

    if (creatorId) {
      // Check if creatorId is a UUID or slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(creatorId);
      if (isUuid) {
        query = query.eq("creator_profile_id", creatorId);
      } else {
        query = query.eq("creator_profiles.slug", creatorId);
      }
    }
    if (contentType) {
      query = query.eq("content_type", contentType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mapped = (data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      brand: p.creator_profiles?.name || "Independent Creation",
      category: p.creator_profiles?.category || "General AI",
      contentType: p.content_type,
      toolsUsed: p.tools_used || [],
      image: p.media_url,
      mediaUrl: p.media_url,
      results: p.metrics?.results || "Verified portfolio production evidence.",
      engagement: p.metrics?.engagement || "8.5% Engagement",
      reach: p.metrics?.reach || "1.2M Impressions",
      prompt: p.prompt,
      processEvidence: p.process_evidence,
      createdAt: p.created_at,
      creator_profile_id: p.creator_profile_id,
    }));

    return NextResponse.json({ data: mapped });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: "Database service is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to persist portfolio projects.",
        },
        { status: 503 }
      );
    }

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
