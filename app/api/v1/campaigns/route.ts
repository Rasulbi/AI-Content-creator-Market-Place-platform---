import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrandUser } from "@/lib/supabase/auth-helpers";
import { createCampaignSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status") || "active";
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const offset = (page - 1) * limit;

    const supabase = await createClient();
    let query = supabase
      .from("campaigns")
      .select("*, users!inner(full_name, company_name, avatar_url)", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }
    if (status !== "all") {
      query = query.eq("status", status as any);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentBrandUser();
    const body = await request.json();
    const validated = createCampaignSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        brand_id: user.id,
        title: validated.title,
        description: validated.description,
        category: validated.category,
        target_audience: validated.target_audience || null,
        required_skills: validated.required_skills,
        content_formats: validated.content_formats,
        budget_min: validated.budget_min,
        budget_max: validated.budget_max,
        status: validated.status,
        deadline: validated.deadline || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data, message: "Campaign created successfully" }, { status: 201 });
  } catch (err: any) {
    const status = err.name === "AuthError" ? err.statusCode : 400;
    return NextResponse.json(
      { error: err?.message || "Invalid campaign payload" },
      { status }
    );
  }
}
