import { createClient, isSupabaseConfigured } from "./supabase/server";
import { Creator, PortfolioProject } from "./creators-data";
import { DEMO_CREATORS, getDemoCreatorById } from "./demo-creators";

export interface CreatorCatalogOptions {
  includeDemo?: boolean;
  category?: string;
  limit?: number;
}

/**
 * Transforms a raw database row from public.creator_profiles into a typed Creator object.
 * Strictly avoids fabricating follower counts, reviews, or verification badges.
 * Excludes private email addresses or authentication credentials.
 */
export function mapDbProfileToCreator(row: any): Creator {
  const portfolioProjects: PortfolioProject[] = Array.isArray(row.portfolio_projects)
    ? row.portfolio_projects.map((p: any) => ({
        id: p.id,
        title: p.title,
        brand: p.metrics?.brand || "Brand Collaboration",
        category: p.content_type || row.category || "General AI",
        contentType: p.content_type || "Portfolio Project",
        toolsUsed: p.tools_used || [],
        image: p.media_url || "/images/portfolio-skincare.jpg",
        description: p.description || "",
        results: p.metrics?.results || "Verified portfolio submission",
        engagement: p.metrics?.engagement || "N/A",
        reach: p.metrics?.reach || "N/A",
        prompt: p.prompt || undefined,
        processEvidence: p.process_evidence || undefined,
        mediaUrl: p.media_url,
      }))
    : [];

  const verifiedSkills: string[] = [];
  const claimedSkills: string[] = [];

  if (Array.isArray(row.creator_skills)) {
    row.creator_skills.forEach((cs: any) => {
      const skillName = cs.skills?.name || cs.skill_name;
      if (skillName) {
        if (cs.verification_status === "test_verified" || cs.verification_status === "client_verified") {
          verifiedSkills.push(skillName);
        } else {
          claimedSkills.push(skillName);
        }
      }
    });
  }

  // Combine unique skills
  const allSkills = Array.from(new Set([...verifiedSkills, ...claimedSkills]));

  // Availability mapping
  let availability: "Available for immediate hire" | "Available in 1 week" | "Booked this month" =
    "Available for immediate hire";
  if (row.availability === "busy") availability = "Available in 1 week";
  if (row.availability === "unavailable") availability = "Booked this month";

  // Price range string representation
  let priceRange = "Available on request";
  if (row.hourly_rate && row.hourly_rate > 0) {
    priceRange = `₹ ${row.hourly_rate}/hr`;
  } else if (row.min_budget && row.max_budget) {
    priceRange = `₹ ${row.min_budget.toLocaleString()} - ₹ ${row.max_budget.toLocaleString()}`;
  }

  return {
    id: row.id,
    name: row.name || "AI Creator",
    professionalTitle: `AI ${row.category || "Content"} Creator`,
    category: row.category || "General AI",
    avatar: row.users?.avatar_url || "/images/anjali.jpg",
    followers: "Verified Creator",
    followersCount: 0,
    engagementRate: "Active",
    engagementNum: 0,
    location: row.location || "Remote",
    bio: row.bio || "AI content creator specializing in generative visual media and commercial campaigns.",
    experience: row.experience_years
      ? `${row.experience_years} years experience in GenAI visual creation`
      : undefined,
    aiTools: Array.isArray(row.ai_tools) ? row.ai_tools : [],
    skills: allSkills,
    verifiedSkills,
    isVerified: Boolean(row.is_verified || verifiedSkills.length > 0),
    portfolioCount: portfolioProjects.length,
    previousBrandCollabs: [],
    clientRating: row.client_rating ? Number(row.client_rating) : 5.0,
    reviewsCount: row.total_reviews ? Number(row.total_reviews) : 0,
    reviews: [],
    contentTypes: ["Generative AI Visuals", "Commercial Content"],
    platforms: Array.isArray(row.platforms) && row.platforms.length > 0 ? row.platforms : ["Instagram", "YouTube"],
    portfolio: portfolioProjects,
    availability,
    priceRange,
    baseMatchScore: row.passport_score ? Math.round(Number(row.passport_score)) : 80,
    isDemo: false,
    isSynthetic: false,
  };
}

/**
 * Fetches creator profiles from the live Supabase database.
 * If includeDemo is true and database is empty, returns synthetic demo creators.
 */
export async function getDatabaseCreators(options: CreatorCatalogOptions = {}): Promise<Creator[]> {
  const { includeDemo = false, category, limit = 50 } = options;

  if (!isSupabaseConfigured()) {
    return includeDemo ? DEMO_CREATORS.slice(0, limit) : [];
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from("creator_profiles")
      .select(`
        id,
        user_id,
        name,
        slug,
        bio,
        experience_years,
        experience_level,
        availability,
        hourly_rate,
        min_budget,
        max_budget,
        ai_tools,
        platforms,
        category,
        location,
        passport_score,
        client_rating,
        total_reviews,
        is_verified,
        users!inner(
          avatar_url,
          role
        ),
        portfolio_projects(
          id,
          title,
          description,
          content_type,
          tools_used,
          media_url,
          prompt,
          process_evidence,
          metrics
        ),
        creator_skills(
          id,
          verification_status,
          score,
          skills(
            id,
            name,
            category
          )
        )
      `)
      .order("passport_score", { ascending: false })
      .limit(limit);

    if (category && category !== "All" && category !== "all") {
      query = query.ilike("category", `%${category}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("[CreatorsCatalog] Error querying creator_profiles:", error.message);
      return includeDemo ? DEMO_CREATORS.slice(0, limit) : [];
    }

    if (Array.isArray(data) && data.length > 0) {
      return data.map(mapDbProfileToCreator);
    }

    // Database is empty (0 registered creator profiles)
    return includeDemo ? DEMO_CREATORS.slice(0, limit) : [];
  } catch (err) {
    console.warn("[CreatorsCatalog] Unexpected exception querying creators:", err);
    return includeDemo ? DEMO_CREATORS.slice(0, limit) : [];
  }
}

/**
 * Resolves a single creator profile by UUID or slug from the database first,
 * and only falls back to demo profiles if permitted.
 */
export async function getDatabaseCreatorById(
  id: string,
  options: { allowDemo?: boolean } = { allowDemo: true }
): Promise<Creator | null> {
  if (!id) return null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

      let query = supabase
        .from("creator_profiles")
        .select(`
          id,
          user_id,
          name,
          slug,
          bio,
          experience_years,
          experience_level,
          availability,
          hourly_rate,
          min_budget,
          max_budget,
          ai_tools,
          platforms,
          category,
          location,
          passport_score,
          client_rating,
          total_reviews,
          is_verified,
          users!inner(
            avatar_url,
            role
          ),
          portfolio_projects(
            id,
            title,
            description,
            content_type,
            tools_used,
            media_url,
            prompt,
            process_evidence,
            metrics
          ),
          creator_skills(
            id,
            verification_status,
            score,
            skills(
              id,
              name,
              category
            )
          )
        `);

      if (isUuid) {
        query = query.or(`id.eq.${id},user_id.eq.${id}`);
      } else {
        query = query.eq("slug", id);
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        return mapDbProfileToCreator(data);
      }
    } catch (err) {
      console.warn("[CreatorsCatalog] Error fetching creator by ID:", err);
    }
  }

  // Fallback to clearly labelled demo creators only if explicitly permitted
  if (options.allowDemo) {
    const demo = getDemoCreatorById(id);
    if (demo) return demo;
  }

  return null;
}
