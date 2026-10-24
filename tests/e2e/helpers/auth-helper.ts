import { createAdminClient, isSupabaseConfigured } from "../../../lib/supabase/server";

export interface TestCreatorAccount {
  email: string;
  password: string;
  userId?: string;
  isEphemeral: boolean;
}

export interface SetupCreatorResult {
  account: TestCreatorAccount | null;
  blockedReason: string | null;
}

/**
 * Provides an authenticated test creator account for Playwright E2E browser tests.
 * 
 * Safety constraints enforced:
 * 1. Checks for explicitly configured E2E test credentials (E2E_TEST_CREATOR_EMAIL/PASSWORD).
 * 2. If not provided, safely provisions an ephemeral, non-production test creator account
 *    with a unique timestamped email and email_confirm: true.
 * 3. Never writes or mutates production records.
 * 4. Cleans up all provisioned test records after test suite execution.
 * 5. Returns a detailed blockedReason if Supabase environment is unavailable or unconfigured.
 */
export async function setupTestCreator(): Promise<SetupCreatorResult> {
  // Option A: Explicitly configured test credentials in environment
  const envEmail = process.env.E2E_TEST_CREATOR_EMAIL?.trim();
  const envPassword = process.env.E2E_TEST_CREATOR_PASSWORD?.trim();

  if (envEmail && envPassword) {
    return {
      account: {
        email: envEmail,
        password: envPassword,
        isEphemeral: false,
      },
      blockedReason: null,
    };
  }

  // Option B: Provision ephemeral test account if Supabase is configured
  if (!isSupabaseConfigured()) {
    return {
      account: null,
      blockedReason: "BLOCKED: Supabase credentials are not configured or contain placeholders in environment.",
    };
  }

  try {
    const admin = createAdminClient();
    const timestamp = Date.now();
    const testEmail = `e2e_creator_${timestamp}@test.local`;
    const testPassword = `E2ePass#${timestamp}!Aa1`;
    const fullName = `E2E Test Creator ${timestamp.toString().slice(-4)}`;

    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        role: "creator",
        full_name: fullName,
      },
    });

    if (authErr || !authData?.user) {
      return {
        account: null,
        blockedReason: `BLOCKED: Supabase auth user provisioning failed: ${authErr?.message || "Unknown error"}`,
      };
    }

    const userId = authData.user.id;

    // Ensure users table record exists
    const { error: userErr } = await admin.from("users").upsert({
      id: userId,
      email: testEmail,
      role: "creator",
      full_name: fullName,
      avatar_url: "/images/anjali.jpg",
    });

    if (userErr) {
      // Clean up auth user if DB upsert failed
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return {
        account: null,
        blockedReason: `BLOCKED: Failed to create public.users record: ${userErr.message}`,
      };
    }

    // Ensure creator_profiles record exists
    const slug = `e2e-creator-${timestamp}`;
    const { error: profileErr } = await admin.from("creator_profiles").upsert(
      {
        user_id: userId,
        name: fullName,
        slug,
        category: "General AI",
        bio: "Initial E2E test bio created for browser testing.",
        location: "Mumbai, India",
        availability: "available",
      },
      { onConflict: "user_id" }
    );

    if (profileErr) {
      try { await admin.from("users").delete().eq("id", userId); } catch {}
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return {
        account: null,
        blockedReason: `BLOCKED: Failed to create public.creator_profiles record: ${profileErr.message}`,
      };
    }

    return {
      account: {
        email: testEmail,
        password: testPassword,
        userId,
        isEphemeral: true,
      },
      blockedReason: null,
    };
  } catch (err: any) {
    return {
      account: null,
      blockedReason: `BLOCKED: Unexpected exception during test creator setup: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Cleanly removes ephemeral test creator account and related database records.
 */
export async function cleanupTestCreator(account: TestCreatorAccount | null): Promise<void> {
  if (!account || !account.isEphemeral || !account.userId) return;

  try {
    const admin = createAdminClient();
    try { await admin.from("creator_profiles").delete().eq("user_id", account.userId); } catch {}
    try { await admin.from("users").delete().eq("id", account.userId); } catch {}
    await admin.auth.admin.deleteUser(account.userId).catch(() => {});
  } catch (err) {
    console.warn("Notice: Non-fatal error during ephemeral test creator cleanup:", err);
  }
}
