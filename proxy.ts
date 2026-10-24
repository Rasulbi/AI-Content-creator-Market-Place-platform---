import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/types/database.types";

/**
 * Checks if genuine Supabase credentials have been configured in environment
 */
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  if (
    url.includes("your-project-id") ||
    url.includes("placeholder") ||
    url.includes("paste-") ||
    url.includes("example.com")
  ) {
    return false;
  }
  if (
    key.includes("your-anon-key") ||
    key.includes("placeholder") ||
    key.includes("paste-") ||
    key.length < 20
  ) {
    return false;
  }
  return true;
}

/**
 * Next.js 16 Proxy / Middleware Route Guard
 * Authoritatively verifies real Supabase Auth sessions on the server
 * and enforces strict role-based access control.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Protected route categories
  const isBrandRoute = pathname.startsWith("/brand");
  const isCreatorRoute = pathname.startsWith("/creator");

  // Only intercept protected dashboard/internal routes
  if (!isBrandRoute && !isCreatorRoute) {
    return NextResponse.next();
  }

  const nextParam = encodeURIComponent(pathname + search);

  // 1. If Supabase credentials are not configured or invalid, FAIL CLOSED.
  // Never allow unauthenticated bypass into protected dashboard routes.
  if (!isSupabaseConfigured()) {
    const targetLogin = isBrandRoute ? "/login/brand" : "/login/influencer";
    const redirectUrl = new URL(`${targetLogin}?next=${nextParam}&error=auth_unavailable`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

  // Initialize server client with cookie forwarding for edge/proxy
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Authoritative server-verified Supabase session verification
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  // 2. Unauthenticated requests: Redirect immediately to appropriate login page
  if (authError || !authUser) {
    const targetLogin = isBrandRoute ? "/login/brand" : "/login/influencer";
    const redirectUrl = new URL(`${targetLogin}?next=${nextParam}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Server-side role resolution from trusted server source
  // SECURITY: Never trust client-controlled user_metadata.role for route authorization.
  let userRole: "brand" | "creator" | "admin";

  if (authUser.app_metadata?.role === "admin") {
    userRole = "admin";
  } else {
    // Query authoritative public.users database table
    const { data: dbUser, error: dbError } = await supabase
      .from("users")
      .select("role")
      .eq("id", authUser.id)
      .maybeSingle();

    // If authoritative database lookup fails or user record is missing, FAIL CLOSED
    if (dbError || !dbUser?.role) {
      const targetLogin = isBrandRoute ? "/login/brand" : "/login/influencer";
      const redirectUrl = new URL(`${targetLogin}?next=${nextParam}&error=missing_role`, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    const rawRole = dbUser.role;
    if (rawRole !== "brand" && rawRole !== "creator" && rawRole !== "admin") {
      // Invalid role stored in database: FAIL CLOSED
      const targetLogin = isBrandRoute ? "/login/brand" : "/login/influencer";
      const redirectUrl = new URL(`${targetLogin}?next=${nextParam}&error=invalid_role`, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    userRole = rawRole;
  }

  // 4. Admin role can access all dashboard areas
  if (userRole === "admin") {
    return response;
  }

  // 4. Role authorization: Cross-role route access prevention
  // Protect sensitive brand campaign management from unauthorized creator access
  if (isBrandRoute && userRole !== "brand") {
    // Creator attempting to access brand area is redirected to creator dashboard
    const redirectRes = NextResponse.redirect(new URL("/creator/dashboard", request.url));
    response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value));
    return redirectRes;
  }

  // Authenticated brand users and creators are both authorized to view creator dashboard
  // (enables "Switch to Creator View" without redirect loops)

  return response;
}

// Support both proxy and middleware naming for test suites and Next.js 16
export { proxy as middleware };

export const config = {
  matcher: [
    /*
     * Match all protected dashboard paths:
     * - /brand/:path*
     * - /creator/:path*
     */
    "/brand/:path*",
    "/creator/:path*",
  ],
};
