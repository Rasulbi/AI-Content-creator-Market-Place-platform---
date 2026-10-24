import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/lib/auth-server";
import { isSupabaseConfigured, createAdminClient } from "@/lib/supabase/server";
import { z, ZodError } from "zod";

const RegisterSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  role: z.enum(["brand", "influencer"] as const),
  companyName: z.string().trim().optional(),
  category: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RegisterSchema.parse(body);

    const email = validated.email.toLowerCase().trim();

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Database service is not configured. Please configure Supabase credentials.",
        },
        { status: 503 }
      );
    }

    const adminSupabase = createAdminClient();

    // 1. Prevent duplicate registrations: check if user already exists
    const { data: existingUser } = await adminSupabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email address already exists. Please log in or use a different email.",
        },
        { status: 409 }
      );
    }

    // 2. Default avatar based on role
    const avatarUrl =
      validated.role === "brand"
        ? "/images/brand-user.jpg"
        : "/images/anjali.jpg";

    // 3. Register user directly via Supabase Auth
    const { data: authUser, error: authErr } = await adminSupabase.auth.admin.createUser({
      email,
      password: validated.password,
      email_confirm: true,
      user_metadata: {
        full_name: validated.fullName.trim(),
        role: validated.role === "brand" ? "brand" : "creator",
        company_name: validated.companyName?.trim() || null,
        avatar_url: avatarUrl,
      },
    });

    if (authErr || !authUser?.user) {
      const errMsg = authErr?.message?.toLowerCase() || "";
      if (
        errMsg.includes("already registered") ||
        errMsg.includes("already exists") ||
        errMsg.includes("unique") ||
        (authErr as any)?.status === 422
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this email address already exists. Please log in or use a different email.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: authErr?.message || "Registration failed. Please try again.",
        },
        { status: 400 }
      );
    }

    // 4. Ensure public.users record is created/upserted
    const { error: userUpsertError } = await adminSupabase.from("users").upsert({
      id: authUser.user.id,
      email,
      role: validated.role === "brand" ? "brand" : "creator",
      full_name: validated.fullName.trim(),
      avatar_url: avatarUrl,
      company_name: validated.companyName?.trim() || null,
    });

    if (userUpsertError) {
      console.error("[Register] Failed to persist public.users record:", userUpsertError.message);
      // Safe cleanup: clean up newly created auth user so they are not left in an orphaned/unusable state
      try {
        await adminSupabase.auth.admin.deleteUser(authUser.user.id);
      } catch (cleanupErr) {
        console.error("[Register] Failed to clean up orphaned auth user:", cleanupErr);
      }
      return NextResponse.json(
        {
          success: false,
          error: "Registration failed while creating user record. Please try again.",
        },
        { status: 500 }
      );
    }

    // 5. If influencer/creator, ensure creator_profiles is created/upserted
    if (validated.role === "influencer") {
      const rawSlug =
        validated.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
        "creator";
      const slug = `${rawSlug}-${authUser.user.id.slice(0, 8)}`;
      const { error: profileUpsertError } = await adminSupabase.from("creator_profiles").upsert(
        {
          user_id: authUser.user.id,
          name: validated.fullName.trim(),
          slug,
          category: validated.category || "General AI",
        },
        { onConflict: "user_id" }
      );

      if (profileUpsertError) {
        console.error("[Register] Failed to persist creator_profiles record:", profileUpsertError.message);
        // Clean up public.users and auth user so user does not get stuck in a broken creator state
        try {
          await adminSupabase.from("users").delete().eq("id", authUser.user.id);
          await adminSupabase.auth.admin.deleteUser(authUser.user.id);
        } catch (cleanupErr) {
          console.error("[Register] Failed to clean up partially created creator records:", cleanupErr);
        }
        return NextResponse.json(
          {
            success: false,
            error: "Registration failed while creating creator profile. Please try again.",
          },
          { status: 500 }
        );
      }
    }

    // 6. Return sanitized user profile (never exposing password or sensitive tokens)
    const userProfile = {
      id: authUser.user.id,
      email,
      name: validated.fullName.trim(),
      role: validated.role as UserRole,
      companyName: validated.companyName?.trim() || (validated.role === "brand" ? "My Brand" : undefined),
      category: validated.category || "Beauty & Skincare",
      avatarUrl,
      verified: true,
      createdAt: authUser.user.created_at || new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      message: "Registration successful",
      user: userProfile,
    });

    // Set secure cookie for session persistence
    response.cookies.set("ai_user_session", JSON.stringify(userProfile), {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
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
          details: err.flatten(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during registration",
      },
      { status: 500 }
    );
  }
}
