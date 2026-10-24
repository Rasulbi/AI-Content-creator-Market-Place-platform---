/**
 * AI Creator Marketplace - Unified Authentication System
 * 
 * Secure Client & Server-side authentication handler with:
 * - Real API integration (/api/auth/register, /api/auth/login, /api/auth/profile)
 * - Password hashing on server
 * - Session persistence across reloads (cookies & localStorage)
 * - Duplicate registration prevention
 * - Profile updating & complete status
 */

import { createClient } from "@/lib/supabase/client";

export type UserRole = "brand" | "influencer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  companyName?: string;
  category?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  verified?: boolean;
  aiTools?: string[];
  createdAt?: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  companyName?: string;
  category?: string;
}

const AUTH_STORAGE_KEY = "ai_marketplace_user";

/**
 * Register a new user with server-side validation & duplicate prevention
 */
export async function signupWithEmail(
  input: RegisterInput
): Promise<{ user: User | null; error: string | null }> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        user: null,
        error: data.error || "Registration failed. Please try again.",
      };
    }

    const user: User = data.user;
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }

    return { user, error: null };
  } catch (err) {
    console.error("Signup network error:", err);
    return { user: null, error: "Network error during registration. Please try again." };
  }
}

/**
 * Login with Email and Password
 */
export async function loginWithEmail(
  email: string,
  password: string,
  role: UserRole,
  rememberMe: boolean = false
): Promise<{ user: User | null; error: string | null }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        user: null,
        error: data.error || "Invalid email or password.",
      };
    }

    const user: User = data.user;
    if (typeof window !== "undefined") {
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      // Also write to localStorage for reliable fallback
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }

    return { user, error: null };
  } catch (err) {
    console.error("Login API error:", err);
    return { user: null, error: "Network error during login. Please try again." };
  }
}

/**
 * Initiates real Google OAuth authentication flow with Supabase.
 * Redirects the user to Google's authentication & consent screen.
 */
export async function loginWithGoogle(
  role: UserRole = "brand",
  nextPath?: string
): Promise<{ user: null; error: string | null; url?: string }> {
  try {
    const supabase = createClient();

    const origin = resolveTrustedAuthOrigin();
    const callbackParams = new URLSearchParams();
    callbackParams.set("role", role);
    if (nextPath && nextPath.startsWith("/")) {
      callbackParams.set("next", nextPath);
    }

    const callbackUrl = `${origin}/auth/callback?${callbackParams.toString()}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      return {
        user: null,
        error: error.message || "Failed to initiate Google sign-in. Please ensure Google provider is enabled in Supabase.",
      };
    }

    if (data?.url && typeof window !== "undefined") {
      window.location.assign(data.url);
    }

    return { user: null, error: null, url: data?.url ?? undefined };
  } catch (err: any) {
    console.error("Google sign-in error:", err);
    return {
      user: null,
      error: err?.message || "An unexpected error occurred while starting Google sign-in.",
    };
  }
}

export interface PasswordResetResult {
  success: boolean;
  message?: string;
  error?: string | null;
}

/**
 * Evaluates whether an origin is a trusted development, local-network, or production URL.
 * Prevents host-header poisoning and open redirects to untrusted destinations.
 */
export function isTrustedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();

    // 1. Localhost and loopback
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return true;
    }

    // 2. Private LAN IPv4 ranges (for mobile and local-device testing on the same Wi-Fi)
    // 192.168.0.0/16
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    // 10.0.0.0/8
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;

    // 3. Configured production site URL
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      try {
        const siteParsed = new URL(process.env.NEXT_PUBLIC_SITE_URL);
        if (parsed.origin.toLowerCase() === siteParsed.origin.toLowerCase()) {
          return true;
        }
      } catch {
        // Safe ignore
      }
    }

    // 4. Authorized production deployments (Render, Vercel)
    if (host.endsWith(".onrender.com") || host.endsWith(".vercel.app")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Resolves the trusted origin for auth redirects (password recovery, OAuth callbacks).
 * Priority:
 * 1. Active browser window origin (if trusted via isTrustedOrigin) - essential for mobile testing on LAN
 * 2. NEXT_PUBLIC_SITE_URL (if configured and trusted)
 * 3. Default fallback: http://localhost:3000
 */
export function resolveTrustedAuthOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    const browserOrigin = window.location.origin.trim().replace(/\/+$/, "");
    if (isTrustedOrigin(browserOrigin)) {
      // Defensive guard for localhost or 127.0.0.1 without port
      if (browserOrigin === "http://localhost" || browserOrigin === "http://127.0.0.1") {
        const activePort = window.location.port || "3000";
        return `${browserOrigin}:${activePort}`;
      }
      return browserOrigin;
    }
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configuredSiteUrl && isTrustedOrigin(configuredSiteUrl)) {
    if (configuredSiteUrl === "http://localhost" || configuredSiteUrl === "http://127.0.0.1") {
      return `${configuredSiteUrl}:3000`;
    }
    return configuredSiteUrl;
  }

  return "http://localhost:3000";
}

/**
 * Initiates a real password recovery request using Supabase Auth.
 * Normalizes email, protects against account enumeration, and handles rate limits.
 */
export async function requestPasswordReset(
  rawEmail: string
): Promise<PasswordResetResult> {
  const email = (rawEmail || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    return {
      success: false,
      error: "Please provide a valid email address.",
    };
  }

  try {
    const supabase = createClient();

    const siteUrl = resolveTrustedAuthOrigin();
    const redirectTo = `${siteUrl}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      const message = error.message.toLowerCase();
      // Handle rate limits explicitly
      if (
        message.includes("rate limit") ||
        message.includes("too many requests") ||
        message.includes("over_email_send_rate_limit") ||
        (error as any).status === 429
      ) {
        return {
          success: false,
          error: "Too many password reset requests. Please wait a few minutes before trying again.",
        };
      }

      // Handle unconfigured service or connection drops
      if (
        message.includes("fetch") ||
        message.includes("network") ||
        message.includes("failed to fetch") ||
        message.includes("econnrefused") ||
        message.includes("etimedout")
      ) {
        return {
          success: false,
          error: "Unable to reach the authentication service. Please check your network connection.",
        };
      }

      // If Supabase explicitly indicates the user was not found or not confirmed,
      // return generic confirmation to prevent account enumeration
      const isUserNotFound =
        message.includes("user not found") ||
        message.includes("email not found") ||
        message.includes("user does not exist") ||
        message.includes("user not found or unconfirmed") ||
        (error as any).status === 404;

      if (isUserNotFound) {
        return {
          success: true,
          message:
            "If an account exists with this email address, a password reset link has been sent. Please check your inbox and spam folder.",
        };
      }

      // Handle explicit service errors, database failures, or SMTP email transport failures
      console.error("[Auth] Password reset service error:", error.message);
      return {
        success: false,
        error: "The authentication service encountered an error processing your request. Please try again later.",
      };
    }

    // Generic confirmation message avoiding account enumeration when request succeeds
    return {
      success: true,
      message:
        "If an account exists with this email address, a password reset link has been sent. Please check your inbox and spam folder.",
    };
  } catch (err: any) {
    const msg = (err?.message || "").toLowerCase();
    if (
      msg.includes("fetch") ||
      msg.includes("network") ||
      msg.includes("failed to fetch") ||
      msg.includes("econnrefused") ||
      msg.includes("etimedout")
    ) {
      return {
        success: false,
        error: "Unable to reach the authentication service. Please check your network connection.",
      };
    }
    console.error("[Auth] Unexpected password reset error:", err);
    return {
      success: false,
      error: "The authentication service encountered an unexpected error. Please try again later.",
    };
  }
}

/**
 * Updates the user's password using an authenticated Supabase recovery session.
 * Requires an active, authenticated Supabase session.
 */
export async function updatePassword(
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  if (!newPassword || newPassword.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters long.",
    };
  }

  if (newPassword.length > 100) {
    return {
      success: false,
      error: "Password is too long (maximum 100 characters).",
    };
  }

  try {
    const supabase = createClient();

    // Verify session is active before attempting update
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return {
        success: false,
        error:
          "Your password reset link is invalid, expired, or has already been used. Please request a new one.",
      };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      const message = updateError.message.toLowerCase();
      if (message.includes("same as") || message.includes("should be different")) {
        return {
          success: false,
          error: "New password must be different from your old password.",
        };
      }
      return {
        success: false,
        error: updateError.message || "Failed to update password. Please try again.",
      };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error("[Auth] Unexpected password update error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while updating your password.",
    };
  }
}

/**
 * Fetches the authenticated user's authoritative profile from the server
 */
export async function fetchUserProfile(): Promise<{
  user: User | null;
  profile?: any | null;
  error: string | null;
}> {
  try {
    const res = await fetch("/api/auth/profile", {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) {
      if (res.status === 401) {
        return { user: null, profile: null, error: "Not authenticated" };
      }
      const data = await res.json().catch(() => ({}));
      return { user: null, profile: null, error: data.error || "Failed to load profile from server." };
    }
    const data = await res.json();
    if (data.success && data.user) {
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
      }
      return { user: data.user, profile: data.profile, error: null };
    }
    return { user: null, profile: null, error: data.error || "Invalid server response." };
  } catch (err: any) {
    return { user: null, profile: null, error: err?.message || "Network error loading profile." };
  }
}

/**
 * Update User Profile
 */
export async function updateUserProfile(
  updates: Partial<User> & {
    aiTools?: string[];
    experience?: string;
    experienceYears?: number;
    hourlyRate?: number | null;
    priceRange?: string;
    availability?: "available" | "busy" | "unavailable";
  }
): Promise<{ user: User | null; profile?: any | null; error: string | null }> {
  const current = getCurrentUser();
  if (!current) {
    return { user: null, error: "Not authenticated" };
  }

  // Strip immutable fields such as 'role' to adhere to server role-escalation prevention
  const payload: Record<string, any> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.bio !== undefined) payload.bio = updates.bio;
  if (updates.location !== undefined) payload.location = updates.location;
  if (updates.companyName !== undefined) payload.companyName = updates.companyName;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.avatarUrl !== undefined) payload.avatarUrl = updates.avatarUrl;
  if (updates.aiTools !== undefined) payload.aiTools = updates.aiTools;
  if (updates.experience !== undefined) payload.experience = updates.experience;
  if (updates.experienceYears !== undefined) payload.experienceYears = updates.experienceYears;
  if (updates.hourlyRate !== undefined) payload.hourlyRate = updates.hourlyRate;
  if (updates.priceRange !== undefined) payload.priceRange = updates.priceRange;
  if (updates.availability !== undefined) payload.availability = updates.availability;
  if (updates.website !== undefined) payload.website = updates.website;
  if (updates.phone !== undefined) payload.phone = updates.phone;

  try {
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (typeof window !== "undefined") {
        const updatedUser = { ...current, ...(data.user || {}) };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      }
      return { user: data.user, profile: data.profile, error: null };
    }

    return { user: null, error: data.error || "Profile update failed" };
  } catch (e) {
    console.error("Server profile update error", e);
    return { user: null, error: "Network error during profile update." };
  }
}

/**
 * Retrieve the currently logged in user from local storage
 */
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as User;
    }
  } catch (e) {
    console.error("Failed to parse user session", e);
  }

  return null;
}

/**
 * Restores and verifies the user session against the Supabase backend (/api/auth/me)
 */
export async function restoreUserSession(): Promise<User | null> {
  try {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated && data.user) {
        if (typeof window !== "undefined") {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        }
        return data.user as User;
      } else {
        // Server confirmed session is invalid, expired, or unauthenticated
        if (typeof window !== "undefined") {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
        }
        return null;
      }
    }
  } catch (_e) {
    // Handled gracefully in offline mode
  }

  return getCurrentUser();
}

/**
 * Logout user cleanly across Supabase Auth and browser session
 */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/me", { method: "POST" });
  } catch (_e) {
    // Ignore network error on logout
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event("auth-session-updated"));
  }
}
