import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const adminClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("================================================================================");
  console.log("🔍 PHASE 2 DIAGNOSTIC: INSPECTING AUTH.USERS VS PUBLIC.USERS");
  console.log("================================================================================\n");

  const hostname = new URL(url!).hostname;
  const projectRef = hostname.split(".")[0];
  console.log(`Supabase Project Host: ${hostname}`);
  console.log(`Supabase Project Ref : ${projectRef}`);
  console.log(`(Verify that SQL Editor project URL matches: https://${projectRef}.supabase.co)\n`);

  // 1. Fetch Auth Users via Supabase Admin API
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
  if (authError) {
    console.error("❌ Failed to list auth users:", authError.message);
    return;
  }

  const authUsers = authData.users || [];
  console.log(`Total Auth Users (auth.users) found: ${authUsers.length}`);

  // 2. Fetch Public Users
  const { data: publicUsers, error: publicError } = await adminClient
    .from("users")
    .select("id, email, role, full_name, created_at");

  if (publicError) {
    console.error("❌ Failed to fetch public.users:", publicError.message);
    return;
  }
  console.log(`Total Public Profiles (public.users) found: ${publicUsers?.length || 0}`);

  // 3. Fetch Creator Profiles
  const { data: creatorProfiles, error: cpError } = await adminClient
    .from("creator_profiles")
    .select("id, user_id, name, slug, category");

  if (cpError) {
    console.error("❌ Failed to fetch public.creator_profiles:", cpError.message);
    return;
  }
  console.log(`Total Creator Profiles (public.creator_profiles) found: ${creatorProfiles?.length || 0}\n`);

  const publicUserMap = new Map((publicUsers || []).map((u) => [u.id, u]));
  const creatorProfileMap = new Map((creatorProfiles || []).map((cp) => [cp.user_id, cp]));

  // 4. Compare Auth Users vs Public Users
  const missingProfiles: Array<{
    authId: string;
    email: string;
    createdAt: string;
    userMetadata: any;
    appMetadata: any;
  }> = [];

  const syncedProfiles: Array<{
    authId: string;
    email: string;
    role: string;
    hasCreatorProfile: boolean;
  }> = [];

  for (const aUser of authUsers) {
    const pub = publicUserMap.get(aUser.id);
    if (!pub) {
      missingProfiles.push({
        authId: aUser.id,
        email: aUser.email || "(no email)",
        createdAt: aUser.created_at,
        userMetadata: aUser.user_metadata,
        appMetadata: aUser.app_metadata,
      });
    } else {
      syncedProfiles.push({
        authId: aUser.id,
        email: aUser.email || pub.email,
        role: pub.role,
        hasCreatorProfile: creatorProfileMap.has(aUser.id),
      });
    }
  }

  console.log("--------------------------------------------------------------------------------");
  console.log(`STATUS SUMMARY:`);
  console.log(`- Synced Accounts   : ${syncedProfiles.length}`);
  console.log(`- Missing Profiles  : ${missingProfiles.length}`);
  console.log("--------------------------------------------------------------------------------\n");

  if (missingProfiles.length > 0) {
    console.log("ACCOUNTS MISSING IN public.users (Equivalent to LEFT JOIN query):");
    console.log("--------------------------------------------------------------------------------");
    missingProfiles.slice(0, 20).forEach((m, idx) => {
      console.log(`[${idx + 1}] Auth ID   : ${m.authId}`);
      console.log(`    Email     : ${m.email}`);
      console.log(`    Created At: ${m.createdAt}`);
      console.log(`    Role Meta : ${m.userMetadata?.role || "undefined"}`);
      console.log(`    Name Meta : ${m.userMetadata?.full_name || m.userMetadata?.name || "undefined"}`);
      console.log("--------------------------------------------------------------------------------");
    });
  } else {
    console.log("✅ All auth.users accounts currently have matching public.users profile records.\n");
  }

  if (syncedProfiles.length > 0) {
    console.log("EXISTING SYNCED PROFILES:");
    syncedProfiles.forEach((s, idx) => {
      console.log(`[${idx + 1}] ${s.email.padEnd(30)} Role: ${s.role.padEnd(10)} CreatorProfile: ${s.hasCreatorProfile ? "YES" : "NO"}`);
    });
  }
}

main().catch(console.error);
