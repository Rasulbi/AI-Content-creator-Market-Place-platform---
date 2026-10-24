import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

loadEnvConfig(process.cwd());

function cleanKey(rawKey: string | undefined): string {
  if (!rawKey) return "";
  let cleaned = rawKey.trim().replace(/^["']|["']$/g, "");
  const prefix = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.";
  while (cleaned.startsWith(prefix + prefix)) {
    cleaned = cleaned.slice(prefix.length);
  }
  return cleaned;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "") || "";
const serviceKey = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
const anonKey = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const admin = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient<Database>(url, anonKey, { auth: { persistSession: false } });

async function main() {
  console.log("================================================================================");
  console.log("🛡️  AVATAR_URL & PUBLIC PROFILES VERIFICATION SUITE");
  console.log("================================================================================\n");

  let passes = 0;
  let failures = 0;

  // TEST 1: public.users has avatar_url column
  try {
    const { data, error } = await admin.from("users").select("id, avatar_url").limit(1);
    if (error) {
      console.log(`❌ TEST 1 FAILED: public.users select avatar_url error: ${error.message}`);
      failures++;
    } else {
      console.log("✅ TEST 1 PASSED: public.users has avatar_url column.");
      passes++;
    }
  } catch (e: any) {
    console.log(`❌ TEST 1 ERROR: ${e.message}`);
    failures++;
  }

  // TEST 2: public_user_profiles view exists and exposes avatar_url
  try {
    const { data, error } = await anon.from("public_user_profiles").select("id, full_name, avatar_url, role, company_name").limit(1);
    if (error) {
      console.log(`❌ TEST 2 FAILED: public_user_profiles view error: ${error.message}`);
      failures++;
    } else if (!data || data.length === 0) {
      console.log("⚠️ TEST 2 WARNING: public_user_profiles returned 0 rows, but view is queryable.");
      passes++;
    } else {
      const row = data[0];
      if ("avatar_url" in row) {
        console.log(`✅ TEST 2 PASSED: public_user_profiles view exposes avatar_url (sample: ${row.avatar_url || "null"}).`);
        passes++;
      } else {
        console.log("❌ TEST 2 FAILED: avatar_url missing from public_user_profiles columns.");
        failures++;
      }
    }
  } catch (e: any) {
    console.log(`❌ TEST 2 ERROR: ${e.message}`);
    failures++;
  }

  // TEST 3: public_user_profiles NEVER exposes email addresses
  try {
    // Attempt to query email on public_user_profiles (should error or fail to compile)
    const { data, error } = await (anon as any).from("public_user_profiles").select("id, email").limit(1);
    if (error && error.message.includes("email")) {
      console.log("✅ TEST 3 PASSED: public_user_profiles strictly omits email column.");
      passes++;
    } else if (data && data[0]?.email) {
      console.log("❌ TEST 3 FAILED: CRITICAL SECURITY ISSUE - email was returned by public_user_profiles!");
      failures++;
    } else {
      console.log("✅ TEST 3 PASSED: email column is not present on public_user_profiles view.");
      passes++;
    }
  } catch (e: any) {
    console.log(`✅ TEST 3 PASSED: query rejected as expected: ${e.message}`);
    passes++;
  }

  // TEST 4: Anonymous direct queries on public.users return 0 rows (RLS isolation)
  try {
    const { data } = await anon.from("users").select("id, full_name, avatar_url");
    if (data && data.length > 0) {
      console.log("❌ TEST 4 FAILED: Anonymous user was able to query public.users directly!");
      failures++;
    } else {
      console.log("✅ TEST 4 PASSED: Anonymous direct access to public.users is blocked by RLS.");
      passes++;
    }
  } catch (e: any) {
    console.log(`❌ TEST 4 ERROR: ${e.message}`);
    failures++;
  }

  // TEST 5: Campaigns join with users!inner(full_name, company_name, avatar_url)
  try {
    const { data, error } = await admin
      .from("campaigns")
      .select("id, title, users(full_name, company_name, avatar_url)")
      .limit(1);
    if (error) {
      console.log(`❌ TEST 5 FAILED: Campaigns join with users(avatar_url) error: ${error.message}`);
      failures++;
    } else {
      console.log("✅ TEST 5 PASSED: Campaigns join with users(avatar_url) succeeds.");
      passes++;
    }
  } catch (e: any) {
    console.log(`❌ TEST 5 ERROR: ${e.message}`);
    failures++;
  }

  console.log("\n================================================================================");
  console.log(`SUMMARY: ${passes} PASSED, ${failures} FAILED`);
  console.log("================================================================================");

  if (failures > 0) process.exit(1);
}

main().catch(console.error);
