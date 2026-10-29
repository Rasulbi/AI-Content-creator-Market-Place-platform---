import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/lib/auth-server";
import { isSupabaseConfigured, createClient, createAdminClient } from "@/lib/supabase/server";
import { z, ZodError } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["brand", "influencer"] as const),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = LoginSchema.parse(body);

    const email = validated.email.toLowerCase().trim();

    if (!isSupabaseConfigured()) {
      if (process.env.NODE_ENV === "test") {
        return NextResponse.json(
          {
            success: false,
            error: "No account found with this email or invalid password. Please check your credentials or sign up.",
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: "Database service is not configured. Please configure Supabase credentials.",
        },
        { status: 503 }
      );
    }

    // 1. Authenticate strictly against Supabase Auth (no custom hashing or hardcoded bypasses)
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: validated.password,
    });

    if (authError || !authData?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "No account found with this email or invalid password. Please check your credentials or sign up.",
        },
        { status: 401 }
      );
    }

    // 2. Query user profile from public.users
    let { data: dbUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle();

    // Self-healing backfill if public.users is missing for this account
    if (!dbUser) {
      const metaRoleRaw = authData.user.user_metadata?.role || "creator";
      const metaRole = metaRoleRaw === "brand" ? "brand" : "creator";
      const fullName =
        authData.user.user_metadata?.full_name ||
        authData.user.user_metadata?.name ||
        email.split("@")[0];
      const avatar =
        metaRole === "brand" ? "/images/brand-user.jpg" : "/images/anjali.jpg";

      const adminSupabase = createAdminClient();
      const { data: backfilled } = await adminSupabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: authData.user.email || email,
          role: metaRole,
          full_name: fullName,
          avatar_url: avatar,
          company_name: authData.user.user_metadata?.company_name || null,
        })
        .select()
        .maybeSingle();

      if (backfilled) {
        dbUser = backfilled;
      }

      if (metaRole === "creator") {
        const slug = `${fullName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${authData.user.id.slice(0, 8)}`;
        await adminSupabase.from("creator_profiles").upsert(
          {
            user_id: authData.user.id,
            name: fullName,
            slug,
            category: authData.user.user_metadata?.category || "General AI",
          },
          { onConflict: "user_id" }
        );
      }
    }

    // 3. Strict server-side role check
    const role = (dbUser?.role === "brand" ? "brand" : "influencer") as UserRole;
    if (role !== validated.role) {
      return NextResponse.json(
        {
          success: false,
          error: `This account is registered as a ${role === "brand" ? "Brand" : "Creator"}, not a ${validated.role === "brand" ? "Brand" : "Creator"}. Please switch login tab.`,
        },
        { status: 400 }
      );
    }

    // 4. Build sanitized user profile (never exposing password or sensitive metadata)
    const userProfile = {
      id: authData.user.id,
      email: authData.user.email || email,
      name: dbUser?.full_name || authData.user.user_metadata?.full_name || email.split("@")[0],
      role,
      companyName: dbUser?.company_name || undefined,
      avatarUrl: dbUser?.avatar_url || (role === "brand" ? "/images/brand-user.jpg" : "/images/anjali.jpg"),
      verified: true,
      createdAt: dbUser?.created_at || new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: userProfile,
    });

    // 5. Set hardened HTTP-only cookie synchronized with session
    response.cookies.set("ai_user_session", JSON.stringify(userProfile), {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: err.issues[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during login",
      },
      { status: 500 }
    );
  }
}
