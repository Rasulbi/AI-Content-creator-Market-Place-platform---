import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { Database } from "@/types/database.types";

function resolveSupabaseUrl(url: string | undefined): string {
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    return url.trim().replace(/\/+$/, "");
  }
  return "https://placeholder-project.supabase.co";
}

function resolveSupabaseKey(key: string | undefined): string {
  if (!key) return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-key";
  let cleaned = key.trim().replace(/^["']|["']$/g, "");
  const prefix = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.";
  if (cleaned.startsWith(prefix + prefix)) {
    cleaned = cleaned.slice(prefix.length);
  }
  if (!cleaned.startsWith("paste-") && cleaned.length > 20) {
    return cleaned;
  }
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-key";
}

/**
 * Checks if genuine Supabase credentials have been configured in .env.local
 */
export function isSupabaseConfigured(): boolean {
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
 * Creates a server-side Supabase client for Server Components,
 * Server Actions, and Route Handlers with automatic Next.js cookie forwarding.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  let cookieStore: any = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Handled safely when called outside Next.js request context (e.g. unit testing or background scripts)
  }

  const supabaseUrl = resolveSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = resolveSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!cookieStore) {
    return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored when invoked in Server Components where headers cannot be mutated
        }
      },
    },
  });
}

/**
 * Creates an elevated Supabase client with the Service Role key.
 * Bypasses Row Level Security (RLS) for server-side evaluation, automated grading,
 * and administrative operations.
 * 
 * NEVER expose this client to the browser.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = resolveSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = resolveSupabaseKey(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
