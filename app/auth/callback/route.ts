import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { isTrustedOrigin } from "@/lib/auth";

/**
 * Validates whether a redirect path is safe (internal/relative).
 * Prevents open-redirect attacks to untrusted external URLs.
 */
export function isSafeRedirectPath(path: string | null): boolean {
  if (!path) return false;
  // Must start with '/' and not '//' or '/\'
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return false;
  }
  // Disallow colon, backslash, protocol schemes
  if (path.includes(":") || path.includes("\\") || path.includes("///")) {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const rawOrigin = requestUrl.origin;
  const origin = isTrustedOrigin(rawOrigin)
    ? rawOrigin
    : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const searchParams = requestUrl.searchParams;

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const roleParam = searchParams.get("role")?.toLowerCase().trim();
  const nextParam = searchParams.get("next");
  const typeParam = searchParams.get("type")?.toLowerCase().trim();

  // Determine if this is a password recovery callback
  const isRecovery =
    typeParam === "recovery" ||
    nextParam === "/reset-password" ||
    Boolean(nextParam?.startsWith("/reset-password"));

  // Determine fallback login page based on role parameter or recovery state
  const isInfluencer = roleParam === "influencer" || roleParam === "creator";
  const defaultLoginRoute = isRecovery
    ? "/forgot-password"
    : isInfluencer
    ? "/login/influencer"
    : "/login/brand";

  // 1. Handle OAuth cancellation or provider error from Google / Supabase
  if (error) {
    const redirectUrl = new URL(defaultLoginRoute, origin);
    redirectUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Handle missing authorization code safely
  if (!code) {
    const tokenHash = searchParams.get("token_hash");
    if (tokenHash && isRecovery) {
      const supabase = await createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });
      if (!verifyError) {
        const targetPath = nextParam && isSafeRedirectPath(nextParam) ? nextParam : "/reset-password";
        const resetUrl = new URL(targetPath, origin);
        const response = NextResponse.redirect(resetUrl);
        try {
          const cookieStore = await cookies();
          cookieStore.getAll().forEach((c) => {
            response.cookies.set(c.name, c.value, {
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          });
        } catch {}
        return response;
      }
    }

    if (isRecovery) {
      // In Supabase implicit grant recovery flow, tokens are passed in the URL hash fragment
      // (#access_token=...&type=recovery). Browsers do not send hash fragments in HTTP requests.
      // Serving a client-side bridge preserves the fragment and immediately navigates
      // the browser to /reset-password where the client Supabase SDK extracts the tokens.
      const targetPath = nextParam && isSafeRedirectPath(nextParam) ? nextParam : "/reset-password";
      const bridgeHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting to Password Reset...</title>
  </head>
  <body>
    <script>
      (function() {
        var hash = window.location.hash || "";
        var search = window.location.search || "";
        var target = "${targetPath}" + hash + (hash ? "" : search);
        window.location.replace(target);
      })();
    </script>
    <noscript>
      <meta http-equiv="refresh" content="0;url=${targetPath}">
    </noscript>
  </body>
</html>`;
      return new NextResponse(bridgeHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    const redirectUrl = new URL(defaultLoginRoute, origin);
    redirectUrl.searchParams.set("error", "Missing OAuth authorization code.");
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Verify Supabase configuration
  if (!isSupabaseConfigured()) {
    const redirectUrl = new URL(defaultLoginRoute, origin);
    redirectUrl.searchParams.set("error", "Authentication service is not configured.");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // 4. Exchange authorization code for authenticated session via Supabase SSR client
    const supabase = await createClient();
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !sessionData?.user) {
      const redirectUrl = new URL(defaultLoginRoute, origin);
      redirectUrl.searchParams.set(
        "error",
        isRecovery
          ? "Password reset link is invalid or has expired. Please request a new one."
          : exchangeError?.message || "Failed to exchange authorization code for session."
      );
      return NextResponse.redirect(redirectUrl);
    }

    // 5. IF RECOVERY CALLBACK: Route directly to /reset-password with session cookies attached
    if (isRecovery) {
      const targetPath = nextParam && isSafeRedirectPath(nextParam) ? nextParam : "/reset-password";
      const resetUrl = new URL(targetPath, origin);
      const response = NextResponse.redirect(resetUrl);

      // Forward any session cookies from cookieStore to ensure tokens are persisted in browser
      try {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        allCookies.forEach((c) => {
          response.cookies.set(c.name, c.value, {
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        });
      } catch {
        // Handled safely
      }

      return response;
    }

    const authUser = sessionData.user;
    const adminSupabase = createAdminClient();

    // 6. Look up existing profile in public.users (OAuth flow only)
    let { data: dbUser } = await adminSupabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    // 6. Safe idempotent profile provisioning if new user
    if (!dbUser) {
      // STRICT SECURITY: Never grant admin role from OAuth query param or client metadata
      const assignedRole: "brand" | "creator" = isInfluencer ? "creator" : "brand";

      const fullName =
        authUser.user_metadata?.full_name?.trim() ||
        authUser.user_metadata?.name?.trim() ||
        authUser.email?.split("@")[0] ||
        "Google User";

      const avatarUrl =
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        (assignedRole === "brand" ? "/images/brand-user.jpg" : "/images/anjali.jpg");

      const companyName =
        assignedRole === "brand"
          ? authUser.user_metadata?.company_name?.trim() || "My Brand"
          : null;

      const { data: createdUser, error: createErr } = await adminSupabase
        .from("users")
        .upsert(
          {
            id: authUser.id,
            email: authUser.email || `${authUser.id}@placeholder.email`,
            role: assignedRole,
            full_name: fullName,
            avatar_url: avatarUrl,
            company_name: companyName,
          },
          { onConflict: "id" }
        )
        .select()
        .maybeSingle();

      if (createErr) {
        console.warn("[OAuth Callback] Profile upsert notice:", createErr.message);
      }

      dbUser = createdUser || {
        id: authUser.id,
        email: authUser.email || "",
        role: assignedRole,
        full_name: fullName,
        avatar_url: avatarUrl,
        company_name: companyName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // If creator, ensure creator_profiles is created
      if (assignedRole === "creator") {
        const rawSlug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "creator";
        const slug = `${rawSlug}-${authUser.id.slice(0, 8)}`;
        await adminSupabase.from("creator_profiles").upsert(
          {
            user_id: authUser.id,
            name: fullName,
            slug,
            category: "General AI",
          },
          { onConflict: "user_id" }
        );
      }
    }

    // 7. Determine safe destination URL (prevent open redirects)
    let targetPath: string;
    if (nextParam && isSafeRedirectPath(nextParam)) {
      targetPath = nextParam;
    } else {
      const activeRole = dbUser?.role === "brand" ? "brand" : "creator";
      targetPath = activeRole === "brand" ? "/brand/dashboard" : "/creator/dashboard";
    }

    // 8. Build sanitized user profile for session synchronization
    const resolvedRole = dbUser?.role === "brand" ? "brand" : "influencer";
    const userProfile = {
      id: authUser.id,
      email: authUser.email || dbUser?.email || "",
      name: dbUser?.full_name || authUser.user_metadata?.full_name || "Google User",
      role: resolvedRole,
      companyName: dbUser?.company_name || undefined,
      avatarUrl: dbUser?.avatar_url || (resolvedRole === "brand" ? "/images/brand-user.jpg" : "/images/anjali.jpg"),
      verified: true,
      createdAt: dbUser?.created_at || new Date().toISOString(),
    };

    const finalRedirectUrl = new URL(targetPath, origin);
    const response = NextResponse.redirect(finalRedirectUrl);

    // Forward any session cookies from cookieStore to ensure tokens are persisted
    try {
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      allCookies.forEach((c) => {
        response.cookies.set(c.name, c.value);
      });
    } catch {
      // Handled safely
    }

    // Set secure httpOnly session cookie
    response.cookies.set("ai_user_session", JSON.stringify(userProfile), {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err: any) {
    console.error("[OAuth Callback] Unexpected error:", err);
    const redirectUrl = new URL(defaultLoginRoute, origin);
    redirectUrl.searchParams.set("error", "An unexpected error occurred during Google sign-in.");
    return NextResponse.redirect(redirectUrl);
  }
}
