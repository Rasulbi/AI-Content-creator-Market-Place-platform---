import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  try {
    // 1. Supabase Auth is the single authoritative source of truth
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: authData, error: authErr } = await supabase.auth.getUser();

        if (!authErr && authData?.user) {
          const adminSupabase = createAdminClient();
          let { data: dbUser } = await adminSupabase
            .from("users")
            .select("*")
            .eq("id", authData.user.id)
            .maybeSingle();

          // Self-healing backfill if public.users record is missing for this verified account (e.g. Google OAuth)
          if (!dbUser) {
            const rawRole = authData.user.user_metadata?.role;
            const metaRole = rawRole === "brand" ? "brand" : "creator";
            const fullName =
              authData.user.user_metadata?.full_name ||
              authData.user.user_metadata?.name ||
              authData.user.email?.split("@")[0] ||
              "Google User";
            const avatar =
              authData.user.user_metadata?.avatar_url ||
              authData.user.user_metadata?.picture ||
              (metaRole === "brand" ? "/images/brand-user.jpg" : "/images/anjali.jpg");

            const { data: backfilled } = await adminSupabase
              .from("users")
              .upsert(
                {
                  id: authData.user.id,
                  email: authData.user.email || `${authData.user.id}@placeholder.email`,
                  role: metaRole,
                  full_name: fullName,
                  avatar_url: avatar,
                  company_name: authData.user.user_metadata?.company_name || null,
                },
                { onConflict: "id" }
              )
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

          if (dbUser) {
            const userProfile = {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.full_name,
              role: dbUser.role === "brand" ? "brand" : dbUser.role === "admin" ? "admin" : "influencer",
              companyName: dbUser.company_name || undefined,
              avatarUrl: dbUser.avatar_url || (dbUser.role === "brand" ? "/images/brand-user.jpg" : "/images/anjali.jpg"),
              verified: true,
              createdAt: dbUser.created_at,
            };

            const response = NextResponse.json({
              authenticated: true,
              user: userProfile,
              source: "supabase",
            });

            // Keep httpOnly cookie synchronized with verified server session
            response.cookies.set("ai_user_session", JSON.stringify(userProfile), {
              path: "/",
              httpOnly: true,
              maxAge: 60 * 60 * 24 * 7,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });

            return response;
          }
        }
      } catch (sbErr) {
        console.warn("[Auth Me] Supabase session check error:", sbErr);
      }
    }

    // Unauthenticated or Supabase not configured
    return NextResponse.json({ authenticated: false, user: null });
  } catch (_e) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

export async function POST(_req: NextRequest) {
  // Sign out of Supabase Auth if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (_e) {
      // Ignore signOut network error
    }
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  // Cleanly invalidate and delete session cookie with identical security flags
  response.cookies.delete("ai_user_session");
  response.cookies.set("ai_user_session", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
