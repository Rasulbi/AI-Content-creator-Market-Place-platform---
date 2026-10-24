import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentBrandUser, getAuthenticatedUser } from "@/lib/supabase/auth-helpers";
import { createCampaignSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status") || "active";
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const offset = (page - 1) * limit;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        data: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        },
        notice: "Supabase database credentials not configured. Running in demo mode.",
      });
    }

    const adminSupabase = createAdminClient();
    let query = adminSupabase
      .from("campaigns")
      .select("*, users!inner(full_name, company_name, avatar_url)", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    const auth = await getAuthenticatedUser();
    const isAdmin = auth?.user.role === "admin";
    const currentUserId = auth?.authId;

    // Strict Authorization Parity (mirroring DB RLS):
    // Active campaigns are public; any non-active status is strictly restricted to owner or admin.
    if (isAdmin) {
      if (status !== "all") {
        query = query.eq("status", status as any);
      }
    } else if (currentUserId) {
      if (status === "active") {
        query = query.eq("status", "active");
      } else if (status === "all") {
        query = query.or(`status.eq.active,brand_id.eq.${currentUserId}`);
      } else {
        // Restricted status (draft, completed, cancelled) is scoped exclusively to caller's brand
        query = query.eq("status", status as any).eq("brand_id", currentUserId);
      }
    } else {
      // Unauthenticated callers can strictly ONLY see active marketplace campaigns
      query = query.eq("status", "active");
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
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: "Database service is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to persist campaigns.",
        },
        { status: 503 }
      );
    }

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
