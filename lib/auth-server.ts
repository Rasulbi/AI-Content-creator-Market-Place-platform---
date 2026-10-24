/**
 * AI Creator Marketplace - Unified Server Auth & Profile Types
 *
 * SECURITY ARCHITECTURE:
 * - Supabase Auth is the single authoritative system for registration, login,
 *   password verification, and session lifecycle.
 * - Passwords are never hashed locally or stored in memory or public tables.
 * - Hardcoded demo credentials, fixed salts, and password bypasses have been completely removed.
 */

export type UserRole = "brand" | "influencer";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string;
  companyName?: string;
  category?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  verified: boolean;
  createdAt: string;
}

// Deprecated legacy interface kept only for type-level backward compatibility
export interface StoredUser extends UserProfile {
  passwordHash?: string;
  salt?: string;
}

/**
 * Legacy local user store stub.
 * Maintained only for synchronous backward compatibility with existing imports.
 * Never acts as an authentication authority or password validator.
 */
export const usersDb = {
  findByEmail(_email: string): StoredUser | undefined {
    return undefined;
  },

  findById(_id: string): StoredUser | undefined {
    return undefined;
  },

  create(user: Omit<StoredUser, "passwordHash" | "salt">, _rawPassword?: string): UserProfile {
    return {
      ...user,
      verified: true,
      createdAt: user.createdAt || new Date().toISOString(),
    };
  },

  verifyPassword(_storedUser: StoredUser, _candidatePassword: string): boolean {
    // Password verification is strictly handled by Supabase Auth (auth.signInWithPassword)
    return false;
  },

  update(_id: string, _updates: Partial<UserProfile>): UserProfile | null {
    return null;
  },

  getAll(): UserProfile[] {
    return [];
  },
};
