import { CREATORS_DATA, Creator, PortfolioProject } from "./creators-data";

const STORAGE_KEY = "ai_marketplace_creators_catalog";

/**
 * Retrieves the current creators list, combining base dataset with any local updates
 */
export function getStoredCreators(): Creator[] {
  if (typeof window === "undefined") {
    return CREATORS_DATA;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Creator[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If parsed is missing profiles from the updated base dataset, merge them in
        const existingIds = new Set(parsed.map((p) => p.id));
        const missingFromBase = CREATORS_DATA.filter((b) => !existingIds.has(b.id));
        if (missingFromBase.length > 0) {
          const merged = [...parsed, ...missingFromBase];
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read creators catalog from localStorage", e);
  }

  return CREATORS_DATA;
}

/**
 * Persists the creators list
 */
export function saveStoredCreators(creators: Creator[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creators));
    window.dispatchEvent(new Event("creators-store-updated"));
  } catch (e) {
    console.error("Failed to save creators catalog", e);
  }
}

/**
 * Finds a creator by ID or slug
 */
export function getCreatorById(id: string): Creator | undefined {
  const all = getStoredCreators();
  return all.find((c) => c.id === id || c.id.toLowerCase() === id.toLowerCase());
}

export function upsertCreator(creator: Creator): Creator {
  const all = [...getStoredCreators()];
  const idx = all.findIndex(
    (c) => c.id === creator.id || c.id.toLowerCase() === creator.id.toLowerCase()
  );
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...creator };
  } else {
    all.push(creator);
  }
  saveStoredCreators(all);
  return creator;
}

/**
 * Updates a creator's profile
 */
export function updateCreator(id: string, updates: Partial<Creator>): Creator | null {
  const all = [...getStoredCreators()];
  const idx = all.findIndex((c) => c.id === id || c.id.toLowerCase() === id.toLowerCase());

  if (idx === -1) {
    const newCreator: Creator = {
      id,
      name: updates.name || "AI Creator",
      professionalTitle: updates.professionalTitle || "AI Content Creator",
      category: updates.category || "General AI",
      avatar: updates.avatar || "/images/anjali.jpg",
      followers: updates.followers || "12.5K",
      followersCount: updates.followersCount || 12500,
      engagementRate: updates.engagementRate || "4.8%",
      engagementNum: updates.engagementNum || 4.8,
      location: updates.location || "Remote",
      experience: updates.experience || "GenAI Creator",
      clientRating: updates.clientRating || 5.0,
      reviewsCount: updates.reviewsCount || 0,
      reviews: updates.reviews || [],
      isVerified: updates.isVerified || false,
      priceRange: updates.priceRange || "₹3,500 - ₹6,000/hr",
      bio: updates.bio || "",
      aiTools: updates.aiTools || ["Midjourney v6", "Runway Gen-3"],
      previousBrandCollabs: updates.previousBrandCollabs || [],
      contentTypes: updates.contentTypes || ["AI Commercial Reel & UGC"],
      platforms: updates.platforms || ["Instagram Reels", "YouTube Shorts"],
      baseMatchScore: updates.baseMatchScore || 85,
      availability: updates.availability || "Available for immediate hire",
      portfolioCount: updates.portfolioCount || 0,
      skills: updates.skills || [],
      verifiedSkills: updates.verifiedSkills || [],
      portfolio: updates.portfolio || [],
      ...updates,
    };
    all.push(newCreator);
    saveStoredCreators(all);
    return newCreator;
  }

  const current = all[idx];
  const updated: Creator = {
    ...current,
    ...updates,
    id: current.id, // Immutable
    skills: updates.skills || current.skills,
    verifiedSkills: updates.verifiedSkills || current.verifiedSkills,
    portfolio: updates.portfolio || current.portfolio,
    aiTools: updates.aiTools || current.aiTools,
    experience: updates.experience !== undefined ? updates.experience : current.experience,
    availability: updates.availability || current.availability,
    priceRange: updates.priceRange || current.priceRange,
    location: updates.location !== undefined ? updates.location : current.location,
    bio: updates.bio !== undefined ? updates.bio : current.bio,
    name: updates.name || current.name,
  };

  all[idx] = updated;
  saveStoredCreators(all);
  return updated;
}

/**
 * Adds an AI Tool to creator profile
 */
export function addCreatorAiTool(id: string, tool: string): Creator | null {
  const trimmed = tool.trim();
  if (!trimmed) return null;

  const creator = getCreatorById(id);
  if (!creator) return null;

  const currentTools = creator.aiTools || [
    "Midjourney v6",
    "Runway Gen-3",
    "Flux.1 Dev",
    "ElevenLabs",
    "Claude 3.5 Sonnet",
  ];
  const aiTools = Array.from(new Set([...currentTools, trimmed]));

  return updateCreator(id, { aiTools });
}

/**
 * Removes an AI Tool from creator profile
 */
export function removeCreatorAiTool(id: string, tool: string): Creator | null {
  const creator = getCreatorById(id);
  if (!creator) return null;

  const currentTools = creator.aiTools || [];
  const aiTools = currentTools.filter((t) => t.toLowerCase() !== tool.toLowerCase());

  return updateCreator(id, { aiTools });
}

/**
 * Adds a new skill to creator profile
 */
export function addCreatorSkill(id: string, skill: string, verified: boolean = false): Creator | null {
  const trimmed = skill.trim();
  if (!trimmed) return null;

  const creator = getCreatorById(id);
  if (!creator) return null;

  const skills = Array.from(new Set([...creator.skills, trimmed]));
  const verifiedSkills = verified
    ? Array.from(new Set([...creator.verifiedSkills, trimmed]))
    : creator.verifiedSkills;

  return updateCreator(id, { skills, verifiedSkills });
}

/**
 * Removes a skill from creator profile
 */
export function removeCreatorSkill(id: string, skill: string): Creator | null {
  const creator = getCreatorById(id);
  if (!creator) return null;

  const skills = creator.skills.filter((s) => s.toLowerCase() !== skill.toLowerCase());
  const verifiedSkills = creator.verifiedSkills.filter(
    (s) => s.toLowerCase() !== skill.toLowerCase()
  );

  return updateCreator(id, { skills, verifiedSkills });
}

/**
 * Adds a portfolio project to creator
 */
export function addCreatorPortfolio(
  id: string,
  project: Omit<PortfolioProject, "id">
): Creator | null {
  const creator = getCreatorById(id);
  if (!creator) return null;

  const newProject: PortfolioProject = {
    ...project,
    id: `port-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  const portfolio = [newProject, ...creator.portfolio];
  return updateCreator(id, {
    portfolio,
    portfolioCount: portfolio.length,
  });
}

/**
 * Removes a portfolio project
 */
export function removeCreatorPortfolio(id: string, projectId: string): Creator | null {
  const creator = getCreatorById(id);
  if (!creator) return null;

  const portfolio = creator.portfolio.filter((p) => p.id !== projectId);
  return updateCreator(id, {
    portfolio,
    portfolioCount: portfolio.length,
  });
}
