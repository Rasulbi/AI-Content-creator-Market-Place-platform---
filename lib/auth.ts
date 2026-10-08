/**
 * AI Creator Marketplace - Authentication Module
 * 
 * Supports Mock Authentication for immediate local & hackathon testing,
 * with pre-configured hooks for Supabase integration.
 * 
 * TO CONNECT SUPABASE:
 * 1. Install @supabase/supabase-js: `npm install @supabase/supabase-js`
 * 2. Add your environment variables in `.env.local`:
 *    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
 * 3. Uncomment the Supabase client initialization below.
 */

export type UserRole = "brand" | "influencer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  companyName?: string;
  verified?: boolean;
}

// In-memory or localStorage user session key
const AUTH_STORAGE_KEY = "ai_marketplace_user";

/*
// ==========================================
// SUPABASE CLIENT INITIALIZATION (FOR LATER)
// ==========================================
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
*/

/**
 * Mock user database for testing during hackathon demos
 */
const DEFAULT_USERS: Record<UserRole, User> = {
  brand: {
    id: "brand-001",
    email: "marketing@glowup.com",
    name: "Brand User",
    companyName: "GlowUp Skincare",
    role: "brand",
    avatarUrl: "/images/brand-user.jpg",
    verified: true,
  },
  influencer: {
    id: "creator-001",
    email: "anjali@creator.com",
    name: "Anjali Sharma",
    role: "influencer",
    avatarUrl: "/images/anjali.jpg",
    verified: true,
  },
};

/**
 * Login with Email and Password
 */
export async function loginWithEmail(
  email: string,
  password: string,
  role: UserRole,
  rememberMe: boolean = false
): Promise<{ user: User; error: string | null }> {
  // Simulate network latency (400ms) for realistic UX and loading states
  await new Promise((resolve) => setTimeout(resolve, 400));

  // Basic validation
  if (!email || !email.includes("@")) {
    return { user: null as unknown as User, error: "Please enter a valid email address." };
  }
  if (!password || password.length < 6) {
    return { user: null as unknown as User, error: "Password must be at least 6 characters long." };
  }

  /*
  // SUPABASE IMPLEMENTATION:
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { user: null as unknown as User, error: error.message };
    // map data.user to User object...
  }
  */

  // Hackathon Mock User Generation
  const userName = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ");
  const capitalizedName = userName.charAt(0).toUpperCase() + userName.slice(1);

  const mockUser: User = {
    id: `usr_${Date.now()}`,
    email,
    name: role === "brand" ? "Brand Partner" : (capitalizedName || "Verified Creator"),
    companyName: role === "brand" ? "GlowUp Skincare" : undefined,
    role,
    avatarUrl: role === "brand" ? "/images/brand-user.jpg" : "/images/anjali.jpg",
    verified: true,
  };

  // Save session to localStorage if running on browser
  if (typeof window !== "undefined") {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
  }

  return { user: mockUser, error: null };
}

/**
 * Login with Google OAuth
 */
export async function loginWithGoogle(
  role: UserRole
): Promise<{ user: User; error: string | null }> {
  // Simulate OAuth redirect or popup delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  /*
  // SUPABASE GOOGLE OAUTH IMPLEMENTATION:
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${role === "brand" ? "brand" : "creator"}/dashboard`,
        queryParams: {
          role: role,
        },
      },
    });
    if (error) return { user: null as unknown as User, error: error.message };
  }
  */

  const mockGoogleUser: User = {
    ...DEFAULT_USERS[role],
    email: role === "brand" ? "brand.partner@gmail.com" : "anjali.creator@gmail.com",
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockGoogleUser));
  }

  return { user: mockGoogleUser, error: null };
}

/**
 * Retrieve the currently logged in user
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
 * Logout user
 */
export async function logout(): Promise<void> {
  /*
  if (supabase) {
    await supabase.auth.signOut();
  }
  */
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
}
