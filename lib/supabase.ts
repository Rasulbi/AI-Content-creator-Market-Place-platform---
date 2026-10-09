/**
 * Supabase Client Configuration & Adapter
 * 
 * Provides typed access to Supabase with automatic resilience:
 * - If Supabase credentials are provided in `.env.local`, connects to live Supabase backend.
 * - If credentials are placeholders or absent, gracefully informs callers and provides fallback demo behavior.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Check if credentials are genuine (not placeholder strings)
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("paste-") &&
  !supabaseUrl.includes("your-project") &&
  !supabaseAnonKey.includes("paste-") &&
  !supabaseAnonKey.includes("your-supabase")
);

// Singleton Supabase Client
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Returns active Supabase client or null
 */
export function getSupabase(): SupabaseClient | null {
  return supabase;
}

/**
 * Health check helper for the Supabase connection
 */
export async function checkSupabaseStatus(): Promise<{
  connected: boolean;
  message: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      message: "Supabase credentials not configured in .env.local (Running in resilient demo/local store mode).",
    };
  }

  try {
    const { error } = await supabase.from("creators").select("id").limit(1);
    if (error && error.code !== "PGRST116") {
      return {
        connected: false,
        message: `Supabase reachable but query returned: ${error.message}`,
      };
    }
    return {
      connected: true,
      message: "Connected to Supabase PostgreSQL database.",
    };
  } catch (err) {
    return {
      connected: false,
      message: `Supabase connection failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
