import { createClient } from "./server";
import { UserRole, Database } from "@/types/database.types";

export type DbUser = Database["public"]["Tables"]["users"]["Row"];
export type DbCreatorProfile = Database["public"]["Tables"]["creator_profiles"]["Row"];

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Retrieves the currently authenticated Supabase user and their public profile.
 * Returns null if the user is unauthenticated or credentials cannot be validated.
 */
export async function getAuthenticatedUser(): Promise<{
  authId: string;
  email: string;
  user: DbUser;
} | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  // Fetch role and profile details from authoritative public.users
  const { data: dbUser, error: dbError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  // FAIL CLOSED: If database user record is missing, query fails, or role is invalid,
  // do NOT fall back to client-controlled user_metadata.
  if (dbError || !dbUser || !dbUser.role) {
    return null;
  }

  // Validate allowed role enum values
  if (!["creator", "brand", "admin"].includes(dbUser.role)) {
    return null;
  }

  // If server-managed app_metadata grants admin, reflect admin role
  if (authUser.app_metadata?.role === "admin") {
    dbUser.role = "admin";
  }

  return {
    authId: authUser.id,
    email: authUser.email || dbUser.email,
    user: dbUser,
  };
}

/**
 * Enforces that a request has an authenticated session.
 * Throws AuthError(401) if not authenticated.
 */
export async function requireAuth() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    throw new AuthError("Authentication required. Please log in to proceed.", 401);
  }
  return auth;
}

/**
 * Enforces that the authenticated user possesses one of the allowed roles.
 * Throws AuthError(403) if the user role is not permitted.
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const auth = await requireAuth();

  if (!allowedRoles.includes(auth.user.role)) {
    throw new AuthError(
      `Access denied. Required role: [${allowedRoles.join(", ")}], your role: [${auth.user.role}].`,
      403
    );
  }

  return auth;
}

/**
 * Retrieves the creator profile belonging to the current authenticated creator.
 * Throws an error if the user is not a creator or profile is not found.
 */
export async function getCurrentCreatorProfile(): Promise<{
  authId: string;
  user: DbUser;
  profile: DbCreatorProfile;
}> {
  const auth = await requireRole(["creator", "admin"]);
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", auth.user.id)
    .single();

  if (error || !profile) {
    throw new AuthError("Creator profile not found for this account.", 404);
  }

  return {
    authId: auth.authId,
    user: auth.user,
    profile,
  };
}

/**
 * Retrieves the current authenticated brand user.
 */
export async function getCurrentBrandUser() {
  return requireRole(["brand", "admin"]);
}

/**
 * Enforces that the caller is an administrator / evaluator.
 */
export async function requireAdmin() {
  return requireRole(["admin"]);
}
