import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { requestPasswordReset, updatePassword, isTrustedOrigin, resolveTrustedAuthOrigin } from "../../lib/auth";
import { GET as authCallbackRoute, isSafeRedirectPath } from "../../app/auth/callback/route";
import { setBrowserClientForTesting } from "../../lib/supabase/client";
import { NextRequest } from "next/server";

function createMockRequest(url: string, method: string = "GET"): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
  });
}

describe("Password-Reset & Recovery Authentication Suite", () => {
  let capturedResetArgs: { email: string; options?: any } | null = null;
  let mockResetError: any = null;
  let mockSession: any = { user: { id: "test-user-id" } };
  let mockUpdateUserError: any = null;

  beforeEach(() => {
    capturedResetArgs = null;
    mockResetError = null;
    mockSession = { user: { id: "test-user-id" } };
    mockUpdateUserError = null;

    setBrowserClientForTesting({
      auth: {
        resetPasswordForEmail: async (email: string, options?: any) => {
          capturedResetArgs = { email, options };
          return { data: {}, error: mockResetError };
        },
        getSession: async () => {
          return { data: { session: mockSession }, error: null };
        },
        updateUser: async (_attributes: any) => {
          return { data: { user: { id: "test-user-id" } }, error: mockUpdateUserError };
        },
      },
    });
  });

  afterEach(() => {
    setBrowserClientForTesting(null);
  });

  describe("1. Email Validation & Normalization for Recovery Requests", () => {
    it("should reject empty or whitespace-only email without calling Supabase", async () => {
      const res1 = await requestPasswordReset("");
      assert.equal(res1.success, false);
      assert.ok(res1.error?.includes("valid email address"));
      assert.equal(capturedResetArgs, null);

      const res2 = await requestPasswordReset("   ");
      assert.equal(res2.success, false);
      assert.ok(res2.error?.includes("valid email address"));
      assert.equal(capturedResetArgs, null);
    });

    it("should reject malformed email addresses missing @ or domain", async () => {
      const badEmails = [
        "plainaddress",
        "@missingusername.com",
        "username@.com",
        "username@domain",
        "user name@domain.com",
      ];

      for (const bad of badEmails) {
        const res = await requestPasswordReset(bad);
        assert.equal(res.success, false, `Expected ${bad} to fail validation`);
        assert.ok(res.error?.includes("valid email address"));
        assert.equal(capturedResetArgs, null);
      }
    });

    it("should normalize email address (trim whitespace and lowercase) before dispatching to Supabase", async () => {
      const res = await requestPasswordReset("   Creator.Test@Marketplace.AI   ");
      assert.equal(res.success, true);
      assert.ok(capturedResetArgs);
      assert.equal(capturedResetArgs?.email, "creator.test@marketplace.ai");
      assert.ok(capturedResetArgs?.options?.redirectTo?.includes("/reset-password"));
    });

    it("should return generic confirmation message to prevent account enumeration on valid dispatch", async () => {
      const res = await requestPasswordReset("unknown.nonexistent.user@example.com");
      assert.equal(res.success, true);
      assert.ok(res.message?.includes("If an account exists with this email"));
      assert.equal(res.error, undefined);
    });

    it("should return generic confirmation when Supabase explicitly reports user not found to prevent account enumeration", async () => {
      mockResetError = { message: "User not found or unconfirmed", status: 404 };
      const res = await requestPasswordReset("doesnotexist@example.com");
      assert.equal(res.success, true);
      assert.ok(res.message?.includes("If an account exists with this email"));
      assert.equal(res.error, undefined);
    });

    it("should handle rate-limit error (HTTP 429) gracefully with clear guidance", async () => {
      mockResetError = { message: "rate limit exceeded", status: 429 };
      const res = await requestPasswordReset("creator@example.com");
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("Too many password reset requests"));
      assert.equal(res.message, undefined);
    });

    it("should handle over_email_send_rate_limit error specifically", async () => {
      mockResetError = { message: "over_email_send_rate_limit" };
      const res = await requestPasswordReset("creator@example.com");
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("Too many password reset requests"));
      assert.equal(res.message, undefined);
    });

    it("should NOT return success when an internal server or database error occurs (HTTP 500)", async () => {
      mockResetError = { message: "Database connection failed", status: 500 };
      const res = await requestPasswordReset("creator@example.com");
      assert.equal(res.success, false, "Must not claim success on internal service error");
      assert.ok(res.error?.includes("authentication service encountered an error"));
      assert.equal(res.message, undefined);
    });

    it("should NOT return success when SMTP email delivery fails (HTTP 502)", async () => {
      mockResetError = { message: "Error sending recovery email: SMTP hook returned 502", status: 502 };
      const res = await requestPasswordReset("creator@example.com");
      assert.equal(res.success, false, "Must not claim success on SMTP delivery error");
      assert.ok(res.error?.includes("authentication service encountered an error"));
      assert.equal(res.message, undefined);
    });

    it("should handle network / connection failures gracefully without leaking secrets", async () => {
      mockResetError = { message: "failed to fetch from auth backend" };
      const res = await requestPasswordReset("creator@example.com");
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("Unable to reach the authentication service"));
      assert.equal(res.message, undefined);
    });

    it("should handle ECONNREFUSED socket errors gracefully", async () => {
      mockResetError = { message: "connect ECONNREFUSED 127.0.0.1:54321" };
      const res = await requestPasswordReset("creator@example.com");
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("Unable to reach the authentication service"));
      assert.equal(res.message, undefined);
    });
  });

  describe("2. Password Reset Callback Routing (/auth/callback)", () => {
    it("should redirect recovery error to /forgot-password with error query param", async () => {
      const req = createMockRequest(
        "http://localhost:3000/auth/callback?type=recovery&error=access_denied&error_description=Email+link+is+invalid+or+has+expired",
        "GET"
      );
      const res = await authCallbackRoute(req);
      assert.ok(res.status === 307 || res.status === 308 || res.status === 302);

      const location = res.headers.get("location") || "";
      assert.ok(location.includes("/forgot-password"), `Expected /forgot-password in location: ${location}`);
      assert.ok(location.includes("Email+link+is+invalid") || location.includes("Email%20link"));
    });

    it("should serve HTML client bridge when recovery callback receives implicit tokens without code", async () => {
      const req = createMockRequest(
        "http://localhost:3000/auth/callback?type=recovery",
        "GET"
      );
      const res = await authCallbackRoute(req);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type")?.includes("text/html"), true);
      const html = await res.text();
      assert.ok(html.includes("window.location.replace"));
      assert.ok(html.includes("/reset-password"));
    });

    it("should redirect invalid or unconfigured recovery callback with code to /forgot-password", async () => {
      const req = createMockRequest(
        "http://localhost:3000/auth/callback?type=recovery&code=invalid_recovery_code_12345",
        "GET"
      );
      const res = await authCallbackRoute(req);
      assert.ok(res.status === 307 || res.status === 308 || res.status === 302);

      const location = res.headers.get("location") || "";
      assert.ok(location.includes("/forgot-password"), `Expected /forgot-password in location: ${location}`);
      assert.ok(location.includes("error="));
    });

    it("should NOT route recovery requests to role dashboards or execute Google OAuth provisioning", async () => {
      // Missing code without recovery routes to login
      const oauthReq = createMockRequest("http://localhost:3000/auth/callback", "GET");
      const oauthRes = await authCallbackRoute(oauthReq);
      const oauthLoc = oauthRes.headers.get("location") || "";
      assert.ok(oauthLoc.includes("/login/brand"), "OAuth callback must route to login, not forgot-password");
    });
  });

  describe("3. Safe Redirect Validation (Open Redirect Protection)", () => {
    it("should accept valid relative paths", () => {
      assert.equal(isSafeRedirectPath("/reset-password"), true);
      assert.equal(isSafeRedirectPath("/brand/dashboard"), true);
      assert.equal(isSafeRedirectPath("/creator/dashboard"), true);
      assert.equal(isSafeRedirectPath("/forgot-password"), true);
    });

    it("should strictly reject protocol relative and external domains", () => {
      assert.equal(isSafeRedirectPath("//evil.com"), false);
      assert.equal(isSafeRedirectPath("https://evil.com"), false);
      assert.equal(isSafeRedirectPath("http://evil.com"), false);
      assert.equal(isSafeRedirectPath("/\\evil.com"), false);
      assert.equal(isSafeRedirectPath("///evil.com"), false);
      assert.equal(isSafeRedirectPath(null), false);
    });
  });

  describe("4. Password Validation Rules & Session Enforcement (updatePassword)", () => {
    it("should reject password shorter than 6 characters without calling Supabase", async () => {
      const res = await updatePassword("12345");
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("at least 6 characters"));
    });

    it("should reject empty password", async () => {
      const res = await updatePassword("");
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("at least 6 characters"));
    });

    it("should reject password exceeding 100 characters", async () => {
      const res = await updatePassword("A".repeat(101));
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("too long"));
    });

    it("should reject password update when unauthenticated or recovery session is expired", async () => {
      mockSession = null; // No active session
      const res = await updatePassword("ValidNewPass123!");
      assert.equal(res.success, false);
      assert.ok(
        res.error?.includes("invalid") ||
        res.error?.includes("expired") ||
        res.error?.includes("already been used")
      );
    });

    it("should successfully update password when active recovery session exists", async () => {
      const res = await updatePassword("NewSecurePassword123!");
      assert.equal(res.success, true);
      assert.equal(res.error, null);
    });

    it("should reject when Supabase indicates new password is same as old password", async () => {
      mockUpdateUserError = { message: "New password should be different from the old password." };
      const res = await updatePassword("SameOldPassword123!");
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("must be different"));
    });
  });

  describe("5. Trusted Origin Allowlist & Mobile/LAN Dynamic Resolution", () => {
    it("should accept localhost and loopback origins with standard or custom ports", () => {
      assert.equal(isTrustedOrigin("http://localhost:3000"), true);
      assert.equal(isTrustedOrigin("http://localhost:8080"), true);
      assert.equal(isTrustedOrigin("http://127.0.0.1:3000"), true);
      assert.equal(isTrustedOrigin("http://127.0.0.1"), true);
    });

    it("should accept private LAN IPv4 addresses for mobile testing on local Wi-Fi", () => {
      assert.equal(isTrustedOrigin("http://192.168.1.15:3000"), true);
      assert.equal(isTrustedOrigin("http://192.168.0.100:3000"), true);
      assert.equal(isTrustedOrigin("http://10.0.0.5:3000"), true);
      assert.equal(isTrustedOrigin("http://172.20.10.2:3000"), true);
    });

    it("should accept authorized production and staging domains", () => {
      assert.equal(isTrustedOrigin("https://ai-content-creator-market-place-platform-awgd.onrender.com"), true);
      assert.equal(isTrustedOrigin("https://my-app.vercel.app"), true);
    });

    it("should strictly reject untrusted external domains and phishing schemes", () => {
      assert.equal(isTrustedOrigin("https://evil.com"), false);
      assert.equal(isTrustedOrigin("http://phishing.site"), false);
      assert.equal(isTrustedOrigin("http://192.169.1.1:3000"), false); // Public IP
      assert.equal(isTrustedOrigin("https://evil.onrender.com.attacker.com"), false);
      assert.equal(isTrustedOrigin(null), false);
      assert.equal(isTrustedOrigin(""), false);
      assert.equal(isTrustedOrigin("not-a-valid-url"), false);
    });

    it("should prioritize trusted mobile window origin over static fallback", () => {
      // Simulate mobile device browser context on local Wi-Fi
      const originalWindow = (global as any).window;
      try {
        (global as any).window = {
          location: {
            origin: "http://192.168.1.45:3000",
            port: "3000",
          },
        };

        const resolved = resolveTrustedAuthOrigin();
        assert.equal(resolved, "http://192.168.1.45:3000", "Must resolve mobile LAN origin when trusted");
      } finally {
        (global as any).window = originalWindow;
      }
    });

    it("should fallback safely to localhost when window origin is untrusted", () => {
      const originalWindow = (global as any).window;
      try {
        (global as any).window = {
          location: {
            origin: "https://untrusted-phishing-host.com",
            port: "",
          },
        };

        const resolved = resolveTrustedAuthOrigin();
        assert.equal(resolved, "http://localhost:3000", "Must reject untrusted origin and use safe fallback");
      } finally {
        (global as any).window = originalWindow;
      }
    });
  });
});
