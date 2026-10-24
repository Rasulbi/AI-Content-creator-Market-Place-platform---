import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentCreatorProfile } from "@/lib/supabase/auth-helpers";
import { updatePortfolioProjectSchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { profile } = await getCurrentCreatorProfile();
    const body = await request.json();
    const validated = updatePortfolioProjectSchema.parse({ ...body, id });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("portfolio_projects")
      .update({
        title: validated.title,
        description: validated.description,
        content_type: validated.content_type,
        tools_used: validated.tools_used,
        media_url: validated.media_url,
        prompt: validated.prompt,
        process_evidence: validated.process_evidence,
        external_url: validated.external_url,
        linked_skill_ids: validated.linked_skill_ids,
        metrics: validated.metrics,
      })
      .eq("id", id)
      .eq("creator_profile_id", profile.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data, message: "Project updated" });
  } catch (err: any) {
    const status = err.name === "AuthError" ? err.statusCode : 400;
    return NextResponse.json({ error: err?.message || "Update failed" }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { profile } = await getCurrentCreatorProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("portfolio_projects")
      .delete()
      .eq("id", id)
      .eq("creator_profile_id", profile.id)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Portfolio project not found or you do not have permission to delete it" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Project deleted", id });
  } catch (err: any) {
    const status = err.name === "AuthError" ? err.statusCode : 400;
    return NextResponse.json({ error: err?.message || "Delete failed" }, { status });
  }
}
