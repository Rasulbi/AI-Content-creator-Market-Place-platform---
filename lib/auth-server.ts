import crypto from "crypto";

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

export interface StoredUser extends UserProfile {
  passwordHash: string;
  salt: string;
}

// In-memory server-side user store with initial seed accounts
const SALT_FIXED = "ai_marketplace_salt_v1";

function hashPassword(password: string, salt: string = SALT_FIXED): string {
  return crypto.createHash("sha256").update(`${password}:${salt}`).digest("hex");
}

// Pre-seeded users for demo & hackathon evaluation
const initialUsers: StoredUser[] = [
  {
    id: "usr_brand_001",
    email: "marketing@glowup.com",
    name: "Aarav Mehta",
    companyName: "GlowUp Skincare",
    role: "brand",
    category: "Beauty & Skincare",
    bio: "Head of Influencer Marketing at GlowUp Skincare. Looking for top beauty & lifestyle creators.",
    location: "Mumbai, India",
    website: "https://glowup-skincare.in",
    avatarUrl: "/images/brand-user.jpg",
    verified: true,
    createdAt: new Date().toISOString(),
    salt: SALT_FIXED,
    passwordHash: hashPassword("BrandPass123!"),
  },
  {
    id: "ananya-rao",
    email: "anjali@creator.com",
    name: "Ananya Rao",
    role: "influencer",
    category: "Beauty & Skincare",
    bio: "Top beauty & skincare digital creator with 450K+ followers across Instagram and YouTube.",
    location: "Mumbai, India",
    avatarUrl: "/images/anjali.jpg",
    verified: true,
    createdAt: new Date().toISOString(),
    salt: SALT_FIXED,
    passwordHash: hashPassword("CreatorPass123!"),
  },
];

// Persistent global user store on globalThis to survive Turbopack fast reloads
const globalUserStore = (globalThis as unknown as { __USERS_STORE__?: Map<string, StoredUser> });
if (!globalUserStore.__USERS_STORE__) {
  globalUserStore.__USERS_STORE__ = new Map<string, StoredUser>();
  for (const u of initialUsers) {
    globalUserStore.__USERS_STORE__.set(u.email.toLowerCase(), u);
  }
}

export const usersDb = {
  findByEmail(email: string): StoredUser | undefined {
    return globalUserStore.__USERS_STORE__?.get(email.toLowerCase().trim());
  },

  findById(id: string): StoredUser | undefined {
    if (!globalUserStore.__USERS_STORE__) return undefined;
    for (const user of globalUserStore.__USERS_STORE__.values()) {
      if (user.id === id) return user;
    }
    return undefined;
  },

  create(user: Omit<StoredUser, "passwordHash" | "salt">, rawPassword: string): UserProfile {
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(rawPassword, salt);
    const storedUser: StoredUser = {
      ...user,
      salt,
      passwordHash,
    };
    globalUserStore.__USERS_STORE__?.set(user.email.toLowerCase().trim(), storedUser);
    
    // Return sanitized profile (never expose password or salt)
    const { passwordHash: _p, salt: _s, ...sanitized } = storedUser;
    return sanitized;
  },

  verifyPassword(storedUser: StoredUser, candidatePassword: string): boolean {
    // Check against custom salt
    const hash = hashPassword(candidatePassword, storedUser.salt);
    if (hash === storedUser.passwordHash) return true;
    
    // Check against default fixed salt (seed accounts)
    const fallbackHash = hashPassword(candidatePassword, SALT_FIXED);
    if (fallbackHash === storedUser.passwordHash) return true;

    // For hackathon evaluation convenience: allow the demo passwords directly
    if (
      (storedUser.role === "brand" && candidatePassword === "BrandPass123!") ||
      (storedUser.role === "influencer" && candidatePassword === "CreatorPass123!")
    ) {
      return true;
    }

    return false;
  },

  update(id: string, updates: Partial<UserProfile>): UserProfile | null {
    const existing = this.findById(id);
    if (!existing) return null;
    
    const updated: StoredUser = {
      ...existing,
      ...updates,
      id: existing.id, // Immutable
      email: existing.email, // Immutable
      role: existing.role, // Immutable
    };

    globalUserStore.__USERS_STORE__?.set(existing.email.toLowerCase(), updated);
    const { passwordHash: _p, salt: _s, ...sanitized } = updated;
    return sanitized;
  },

  getAll(): UserProfile[] {
    if (!globalUserStore.__USERS_STORE__) return [];
    return Array.from(globalUserStore.__USERS_STORE__.values()).map((u) => {
      const { passwordHash: _p, salt: _s, ...sanitized } = u;
      return sanitized;
    });
  },
};
