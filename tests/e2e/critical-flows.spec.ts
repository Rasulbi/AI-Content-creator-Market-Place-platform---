import { test, expect, type Page } from "@playwright/test";
import { setupTestCreator, cleanupTestCreator, TestCreatorAccount } from "./helpers/auth-helper";

/**
 * Phase 1 E2E Critical Browser Test Suite
 * 
 * Tests the 6 mandatory browser scenarios:
 * 1. Creator login, dashboard navigation, refresh, and session persistence.
 * 2. Creator cannot access brand-only routes (Role-Based Access Control).
 * 3. Unauthenticated users cannot access protected dashboards (Fail-Closed Route Guards).
 * 4. Edit creator profile, save, refresh, and verify persisted values.
 * 5. Logout and verify protected pages cannot be accessed by navigating backward.
 * 6. Capture browser console errors and page errors on the tested routes.
 */

// Helper to attach error listeners to any page
function attachErrorListeners(page: Page, errors: { consoleErrors: string[]; pageErrors: Error[] }) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    errors.pageErrors.push(err);
  });
}

test.describe("Phase 1 E2E Readiness: Protection & Guardrails (Unauthenticated)", () => {
  const errorLog = { consoleErrors: [] as string[], pageErrors: [] as Error[] };

  test.beforeEach(async ({ page }) => {
    attachErrorListeners(page, errorLog);
  });

  test("Scenario 3: Unauthenticated users cannot access protected creator and brand dashboards", async ({ page }) => {
    // 1. Direct navigation to creator dashboard must redirect to creator login
    await page.goto("/creator/dashboard");
    await expect(page).toHaveURL(/\/login\/influencer.*next=%2Fcreator%2Fdashboard/);

    // 2. Direct navigation to brand dashboard must redirect to brand login
    await page.goto("/brand/dashboard");
    await expect(page).toHaveURL(/\/login\/brand.*next=%2Fbrand%2Fdashboard/);

    // 3. Direct navigation to creator profile must redirect to creator login
    await page.goto("/creator/profile");
    await expect(page).toHaveURL(/\/login\/influencer.*next=%2Fcreator%2Fprofile/);

    // 4. Verify login page renders correctly without crashing
    const creatorHeading = page.getByRole("heading", { name: "Influencer Login" });
    await expect(creatorHeading).toBeVisible();
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
  });

  test("Scenario 6 (Part A): Capture console and runtime page errors on public/auth routes", async ({ page }) => {
    const routeErrors: { route: string; errors: string[]; pageCrashes: string[] }[] = [];

    const routesToProbe = ["/", "/login/influencer", "/login/brand", "/signup"];

    for (const route of routesToProbe) {
      const capturedConsole: string[] = [];
      const capturedCrashes: string[] = [];

      const consoleListener = (msg: any) => {
        if (msg.type() === "error") capturedConsole.push(msg.text());
      };
      const crashListener = (err: Error) => capturedCrashes.push(err.message);

      page.on("console", consoleListener);
      page.on("pageerror", crashListener);

      await page.goto(route, { waitUntil: "domcontentloaded" });

      routeErrors.push({
        route,
        errors: [...capturedConsole],
        pageCrashes: [...capturedCrashes],
      });

      page.off("console", consoleListener);
      page.off("pageerror", crashListener);

      // Verify page did not crash
      expect(capturedCrashes.length, `Runtime page crash on ${route}: ${capturedCrashes.join(", ")}`).toBe(0);
    }
  });
});

test.describe("Phase 1 E2E Readiness: Authenticated Creator Workflows", () => {
  let testCreator: TestCreatorAccount | null = null;
  let blockedReason: string | null = null;
  const suiteErrors = { consoleErrors: [] as string[], pageErrors: [] as Error[] };

  test.beforeAll(async () => {
    const setupResult = await setupTestCreator();
    testCreator = setupResult.account;
    blockedReason = setupResult.blockedReason;
  });

  test.afterAll(async () => {
    if (testCreator) {
      await cleanupTestCreator(testCreator);
    }
  });

  test.beforeEach(async ({ page }) => {
    attachErrorListeners(page, suiteErrors);
  });

  test("Scenario 1: Creator login, dashboard navigation, refresh, and session persistence", async ({ page }) => {
    if (!testCreator) {
      test.skip(true, blockedReason || "BLOCKED: Live Supabase environment required for authenticated creator tests.");
      return;
    }

    // 1. Visit creator login page
    await page.goto("/login/influencer");
    await expect(page.getByRole("heading", { name: "Influencer Login" })).toBeVisible();

    // 2. Fill credentials and submit
    await page.locator("input[type='email']").fill(testCreator.email);
    await page.locator("input[type='password']").fill(testCreator.password);
    await page.locator("button[type='submit']").click();

    // 3. Verify successful redirection to creator dashboard
    await expect(page).toHaveURL(/\/creator\/dashboard/, { timeout: 15000 });
    await expect(page.locator("nav")).toBeVisible();

    // 4. Verify session persistence after browser refresh
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/creator\/dashboard/);
    await expect(page.locator("nav")).toBeVisible();

    // 5. Navigate to profile page while authenticated
    await page.goto("/creator/profile");
    await expect(page).toHaveURL(/\/creator\/profile/);
    await expect(page.locator("h1", { hasText: "Creator Profile" })).toBeVisible({ timeout: 15000 });
  });

  test("Scenario 2: Creator cannot access brand-only routes (RBAC enforcement)", async ({ page }) => {
    if (!testCreator) {
      test.skip(true, blockedReason || "BLOCKED: Live Supabase environment required for RBAC tests.");
      return;
    }

    // Ensure session is active by logging in
    await page.goto("/login/influencer");
    await page.locator("input[type='email']").fill(testCreator.email);
    await page.locator("input[type='password']").fill(testCreator.password);
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/creator\/dashboard/, { timeout: 15000 });

    // Attempt to access brand dashboard directly
    await page.goto("/brand/dashboard");

    // Middleware must intercept and redirect creator back to creator dashboard
    await expect(page).toHaveURL(/\/creator\/dashboard/);
  });

  test("Scenario 4: Edit creator profile, save, refresh, and verify persisted values", async ({ page }) => {
    if (!testCreator) {
      test.skip(true, blockedReason || "BLOCKED: Live Supabase environment required for profile editing tests.");
      return;
    }

    // Login as creator
    await page.goto("/login/influencer");
    await page.locator("input[type='email']").fill(testCreator.email);
    await page.locator("input[type='password']").fill(testCreator.password);
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/creator\/dashboard/, { timeout: 15000 });

    // Navigate to profile page
    await page.goto("/creator/profile");
    await expect(page.locator("h1", { hasText: "Creator Profile" })).toBeVisible({ timeout: 15000 });

    // Click "Edit Profile"
    const editBtn = page.locator('[data-testid="edit-profile-btn"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Fill unique values
    const uniqueSuffix = Date.now().toString().slice(-4);
    const updatedName = `E2E Creator ${uniqueSuffix}`;
    const updatedBio = `Persisted bio test from Playwright browser suite at ${uniqueSuffix}.`;

    const nameInput = page.locator('[data-testid="profile-name-input"]');
    const bioInput = page.locator('[data-testid="profile-bio-input"]');

    await expect(nameInput).toBeVisible();
    await nameInput.fill(updatedName);
    await bioInput.fill(updatedBio);

    // Save Changes and await response from server
    const putResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/profile") && response.request().method() === "PUT"
    );
    const saveBtn = page.locator('[data-testid="save-profile-btn"]');
    await saveBtn.click();
    const putResponse = await putResponsePromise;
    expect(putResponse.status()).toBe(200);

    // Verify success banner appears
    await expect(page.locator("text=Profile updated successfully")).toBeVisible({ timeout: 10000 });

    // Refresh page to prove server persistence
    const getResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/profile") && response.request().method() === "GET"
    );
    await page.reload({ waitUntil: "networkidle" });
    const getResponse = await getResponsePromise;
    expect(getResponse.status()).toBe(200);

    await expect(page.locator("text=Loading your creator profile...")).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator("h1", { hasText: "Creator Profile" })).toBeVisible({ timeout: 15000 });

    // Assert that the newly persisted name and bio appear in the reloaded view mode
    await expect(page.getByRole("heading", { name: updatedName })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(updatedBio)).toBeVisible({ timeout: 15000 });
  });

  test("Scenario 5: Logout and verify protected pages cannot be accessed by navigating backward", async ({ page }) => {
    if (!testCreator) {
      test.skip(true, blockedReason || "BLOCKED: Live Supabase environment required for logout tests.");
      return;
    }

    // Login
    await page.goto("/login/influencer");
    await page.locator("input[type='email']").fill(testCreator.email);
    await page.locator("input[type='password']").fill(testCreator.password);
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/creator\/dashboard/, { timeout: 15000 });

    // Open User Navigation Menu
    const userMenuBtn = page.locator('[data-testid="creator-user-menu"]');
    await expect(userMenuBtn).toBeVisible();
    await userMenuBtn.click();

    // Click Sign Out button
    const signOutBtn = page.locator('[data-testid="creator-signout-btn"]');
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Wait for redirect to home or login page
    await expect(page).toHaveURL(/(\/|\/login\/influencer)$/, { timeout: 10000 });

    // Attempt to navigate backward into protected history
    await page.goBack();

    // Because session was destroyed, middleware/client guard redirects to login
    await expect(page).toHaveURL(/\/login\/influencer/, { timeout: 10000 });

    // Direct navigation to protected route also fails closed
    await page.goto("/creator/dashboard");
    await expect(page).toHaveURL(/\/login\/influencer.*next=%2Fcreator%2Fdashboard/, { timeout: 10000 });
  });

  test("Scenario 6 (Part B): Console and runtime error audit on creator dashboard & profile", async () => {
    // Assert no unhandled JavaScript exceptions occurred during the authenticated runs
    expect(
      suiteErrors.pageErrors.length,
      `Unhandled page errors: ${suiteErrors.pageErrors.map((e) => e.message).join("; ")}`
    ).toBe(0);
  });
});
