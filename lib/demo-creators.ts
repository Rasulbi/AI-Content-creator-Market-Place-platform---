import { Creator, PortfolioProject, ClientReview } from "./creators-data";
import { CREATORS_DATA } from "./creators-data";

/**
 * Synthetic Demo Creator Catalog.
 * 
 * STRICT INTEGRITY NOTICE:
 * These profiles are explicitly synthetic demonstration fixtures designed for
 * local development and UI showcase purposes.
 * 
 * They must NEVER be masqueraded as real registered users, saved into production
 * databases without user consent, or used to fabricate authentic client reviews.
 */
export const DEMO_CREATORS: Creator[] = CREATORS_DATA.map((c) => ({
  ...c,
  isDemo: true,
  isSynthetic: true,
  bio: `[Demo Showcase Profile] ${c.bio}`,
}));

export function getDemoCreators(): Creator[] {
  return DEMO_CREATORS;
}

export function getDemoCreatorById(id: string): Creator | undefined {
  return DEMO_CREATORS.find(
    (c) => c.id === id || c.id.toLowerCase() === id.toLowerCase() || (c as any).slug === id
  );
}
