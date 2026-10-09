import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrandUser } from "@/lib/supabase/auth-helpers";
import { updateCampaignSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("campaigns")
      .select("*, users!inner(full_name, company_name, avatar_url), matches(*, creator_profiles(*))")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = await getCurrentBrandUser();
    const body = await request.json();
    const validated = updateCampaignSchema.parse({ ...body, id });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("campaigns")
      .update({
        title: validated.title,
        description: validated.description,
        category: validated.category,
        target_audience: validated.target_audience,
        required_skills: validated.required_skills,
        content_formats: validated.content_formats,
        budget_min: validated.budget_min,
        budget_max: validated.budget_max,
        status: validated.status,
        deadline: validated.deadline,
      })
      .eq("id", id)
      .eq("brand_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data, message: "Campaign updated" });
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
    const { user } = await getCurrentBrandUser();
    const supabase = await createClient();

    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", id)
      .eq("brand_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (err: any) {
    const status = err.name === "AuthError" ? err.statusCode : 400;
    return NextResponse.json({ error: err?.message || "Delete failed" }, { status });
  }
}
