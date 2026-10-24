import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

let browserClient: SupabaseClient<Database> | null = null;

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
 * Creates or retrieves a client-side Supabase client.
 * In browser runtimes, persists sessions to document.cookie.
 * In non-browser runtimes (Next.js pre-rendering / SSR / tests), provides an in-memory
 * cookie adapter to prevent @supabase/ssr cookie initialization errors during PKCE flows.
 */
export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  const supabaseUrl = resolveSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = resolveSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (typeof window === "undefined" || typeof document === "undefined") {
    const memoryCookies = new Map<string, string>();
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return Array.from(memoryCookies.entries()).map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            memoryCookies.set(name, value);
          });
        },
      },
    });
  }

  if (browserClient) return browserClient;

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

/**
 * Checks whether client-side Supabase environment variables are configured
 */
export function isSupabaseClientConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  if (url.includes("placeholder") || url.includes("your-project-id")) return false;
  if (key.includes("placeholder") || key.length < 20) return false;
  return true;
}

/**
 * Test helper: Overrides the browser Supabase client with a mock client for unit testing.
 */
export function setBrowserClientForTesting(client: any): void {
  browserClient = client;
}
