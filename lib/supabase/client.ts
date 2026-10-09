import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

let browserClient: SupabaseClient<Database> | null = null;

function resolveSupabaseUrl(url: string | undefined): string {
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    return url;
  }
  return "https://placeholder-project.supabase.co";
}

function resolveSupabaseKey(key: string | undefined): string {
  if (key && !key.startsWith("paste-") && key.length > 20) {
    return key;
  }
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-key";
}

/**
 * Creates or retrieves a singleton client-side Supabase client for browser components.
 */
export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  const supabaseUrl = resolveSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = resolveSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
