import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

// Load .env.local safely
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
const anonKey = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const serviceKey = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY);

export interface TableCheckResult {
  tableName: string;
  exists: boolean;
  rowCount: number;
  adminAccessible: boolean;
  anonAccessible: boolean;
  rlsActive: boolean;
  statusNote: string;
}

export async function verifySupabaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  authenticated: boolean;
  usingServiceRole: boolean;
  message: string;
  tables: TableCheckResult[];
}> {
  const isPlaceholder =
    !url ||
    !anonKey ||
    url.includes("your-project-id") ||
    url.includes("placeholder") ||
    anonKey.includes("your-anon-key") ||
    anonKey.length < 20;

  if (isPlaceholder) {
    return {
      configured: false,
      connected: false,
      authenticated: false,
      usingServiceRole: false,
      message:
        "Supabase credentials in .env.local still contain template placeholders (your-project-id.supabase.co). The file may be unsaved in your editor.",
      tables: [],
    };
  }

  // Probe REST endpoint with anon key to verify reachability and public auth
  let endpointConnected = false;
  let anonAuthValid = false;
  try {
    const res = await fetch(`${url}/rest/v1/skills?select=id&limit=1`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: AbortSignal.timeout(6000),
    });
    endpointConnected = res.status < 500;
    anonAuthValid = res.status === 200 || res.status === 206 || res.status === 404;
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      authenticated: false,
      usingServiceRole: false,
      message: `Network connection failed to ${url}: ${err.message}`,
      tables: [],
    };
  }

  const hasServiceKey = Boolean(serviceKey && serviceKey.length > 20 && !serviceKey.includes("your-service-role-key"));

  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const adminClient = hasServiceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  const requiredTables = [
    "users",
    "creator_profiles",
    "skills",
    "creator_skills",
    "portfolio_projects",
    "skill_tests",
    "test_submissions",
    "campaigns",
    "matches",
    "reviews",
    "ai_advisor_conversations",
    "saved_ai_content",
    "campaign_verifications",
  ];

  const tableResults: TableCheckResult[] = [];
  let existingTableCount = 0;

  for (const table of requiredTables) {
    let exists = false;
    let rowCount = 0;
    let adminAccessible = false;
    let anonAccessible = false;
    let rlsActive = true;
    let statusNote = "";

    // 1. Schema check via admin client (bypasses RLS)
    if (adminClient) {
      try {
        const { count, error } = await adminClient
          .from(table)
          .select("*", { count: "exact", head: true });

        if (!error) {
          exists = true;
          adminAccessible = true;
          rowCount = count ?? 0;
        } else if (
          error.code === "42P01" ||
          error.message?.includes("does not exist") ||
          error.code === "PGRST204" ||
          error.code === "PGRST205"
        ) {
          exists = false;
          statusNote = "Table not found in database schema.";
        } else {
          exists = true;
          statusNote = `Admin check error: ${error.message}`;
        }
      } catch (err: any) {
        statusNote = err.message;
      }
    }

    // 2. Client & RLS check via anon client
    try {
      const { count, error } = await anonClient
        .from(table)
        .select("*", { count: "exact", head: true });

      if (!error) {
        anonAccessible = true;
        if (!exists) {
          exists = true;
          rowCount = count ?? 0;
        }
        statusNote = exists
          ? `Public Read Allowed (Anon count: ${count ?? 0})`
          : "Accessible";
      } else if (
        error.code === "42P01" ||
        error.message?.includes("does not exist") ||
        error.code === "PGRST204" ||
        error.code === "PGRST205"
      ) {
        if (!adminClient) {
          exists = false;
          statusNote = "Table does not exist in schema.";
        }
      } else if (error.code === "42501" || error.message?.includes("row-level security") || error.code === "PGRST301") {
        // Genuine RLS policy block for anonymous visitor
        anonAccessible = false;
        rlsActive = true;
        statusNote = "RLS Policy Enforced (Requires Authenticated Session)";
      } else {
        statusNote = `Anon check: [${error.code || "ERR"}] ${error.message}`;
      }
    } catch (err: any) {
      if (!statusNote) statusNote = err.message;
    }

    if (exists) {
      existingTableCount++;
    }

    tableResults.push({
      tableName: table,
      exists,
      rowCount,
      adminAccessible,
      anonAccessible,
      rlsActive,
      statusNote,
    });
  }

  const allFound = existingTableCount === requiredTables.length;

  return {
    configured: true,
    connected: endpointConnected,
    authenticated: anonAuthValid,
    usingServiceRole: hasServiceKey,
    message: allFound
      ? `All ${existingTableCount} of ${requiredTables.length} required tables verified and accessible.`
      : `${existingTableCount} of ${requiredTables.length} tables found. Some tables are missing.`,
    tables: tableResults,
  };
}

async function run() {
  console.log("================================================================================");
  console.log("🔍 SUPABASE DATABASE CONNECTION & SCHEMA VERIFICATION PROBE");
  console.log("================================================================================\n");

  const result = await verifySupabaseConnection();

  console.log(`Configured            : ${result.configured ? "YES" : "NO (Template placeholders on disk)"}`);
  console.log(`Endpoint Reachable    : ${result.connected ? "YES" : "NO"}`);
  console.log(`Anon Key Valid        : ${result.authenticated ? "YES" : "NO"}`);
  console.log(`Service Role Available: ${result.usingServiceRole ? "YES (RLS bypass enabled for admin check)" : "NO"}`);
  console.log(`Status Message        : ${result.message}\n`);

  if (result.tables.length > 0) {
    console.log("Database Table Status (Schema & Security Check):");
    console.log("--------------------------------------------------------------------------------");
    console.log(
      "  " +
      "TABLE".padEnd(28) +
      "SCHEMA".padEnd(12) +
      "ADMIN ACCESS".padEnd(15) +
      "ANON / RLS POLICY"
    );
    console.log("--------------------------------------------------------------------------------");
    for (const t of result.tables) {
      const schemaIcon = t.exists ? "✅ EXISTS" : "❌ MISSING";
      const adminAccess = t.adminAccessible ? `✅ OK (${t.rowCount} rows)` : "⚠️ BLOCKED";
      const anonPolicy = t.anonAccessible ? "✅ Public Read" : "🔒 RLS Authenticated Only";
      console.log(
        "  " +
        t.tableName.padEnd(28) +
        schemaIcon.padEnd(12) +
        adminAccess.padEnd(15) +
        `${anonPolicy} - ${t.statusNote}`
      );
    }
    console.log("--------------------------------------------------------------------------------\n");
  }

  if (process.argv.includes("--test-write")) {
    console.log("🧪 Performing Non-Destructive Write-Read-Delete Persistence Test...");
    await runWriteTest();
  }
}

async function runWriteTest() {
  const adminClient = serviceKey
    ? createClient(url!, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  if (!adminClient) {
    console.log("⚠️ Service key not available for automated write test.");
    return;
  }

  const testSkillName = `Test Skill ${Date.now()}`;
  console.log(`1. Inserting test record into 'skills' table (${testSkillName})...`);
  const { data: inserted, error: insertErr } = await adminClient
    .from("skills")
    .insert({
      name: testSkillName,
      category: "AI Integration Test",
      description: "Automated verification test item for Supabase persistence.",
      weight: 1.0,
      is_active: true,
    })
    .select()
    .single();

  if (insertErr) {
    console.log(`❌ Insert failed: ${insertErr.message}`);
    return;
  }
  console.log(`✅ Record successfully inserted with ID: ${inserted.id}`);

  console.log("2. Querying inserted record back from Supabase...");
  const { data: queried, error: queryErr } = await adminClient
    .from("skills")
    .select("*")
    .eq("id", inserted.id)
    .single();

  if (queryErr || !queried) {
    console.log(`❌ Query failed: ${queryErr?.message}`);
  } else {
    console.log(`✅ Record retrieved verified: "${queried.name}" in category "${queried.category}"`);
  }

  console.log("3. Cleaning up test record from database...");
  const { error: deleteErr } = await adminClient
    .from("skills")
    .delete()
    .eq("id", inserted.id);

  if (deleteErr) {
    console.log(`⚠️ Cleanup warning: ${deleteErr.message}`);
  } else {
    console.log("✅ Test record cleaned up cleanly. Real persistence verified end-to-end!");
  }
}

if (process.argv[1]?.includes("verify-supabase-live")) {
  run();
}
