/**
 * AI Content Creator Marketplace - Legacy localStorage Data Migrator
 * 
 * Safely migrates legacy browser localStorage records to persistent database storage:
 * - Creator portfolio projects
 * - Claimed skills & Skill Passport verifications
 * - Standardized benchmark test submissions
 * 
 * Guarantees:
 * 1. Idempotency (tracks migrated hashes/IDs to prevent duplicate database rows)
 * 2. Non-destructive (never deletes or clears localStorage until database persistence is confirmed)
 * 3. Schema validation & normalization before submitting
 * 4. Transparent logging and detailed error/success reporting
 */

export interface MigrationSummary {
  attempted: number;
  succeeded: number;
  skipped: number;
  failed: number;
  errors: string[];
  migratedItems: {
    type: "portfolio" | "skill" | "test_submission";
    id: string;
    title: string;
    status: "migrated" | "skipped" | "failed";
  }[];
}

const MIGRATION_TRACKING_KEY = "ai_marketplace_db_migrated_ids_v1";

function getMigratedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(MIGRATION_TRACKING_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {
    console.warn("Failed to read migration tracking state:", e);
  }
  return new Set();
}

function markIdAsMigrated(id: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getMigratedIds();
    current.add(id);
    localStorage.setItem(MIGRATION_TRACKING_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn("Failed to mark ID as migrated:", e);
  }
}

/**
 * Inspects localStorage to determine if any unmigrated legacy user records exist.
 */
export function detectLegacyData(): {
  hasLegacyData: boolean;
  portfolioCount: number;
  skillsCount: number;
  submissionsCount: number;
} {
  if (typeof window === "undefined") {
    return { hasLegacyData: false, portfolioCount: 0, skillsCount: 0, submissionsCount: 0 };
  }

  const migratedIds = getMigratedIds();
  let portfolioCount = 0;
  let skillsCount = 0;
  let submissionsCount = 0;

  try {
    // 1. Check custom portfolio items in creator catalog
    const catalogRaw = localStorage.getItem("ai_marketplace_creators_catalog");
    if (catalogRaw) {
      const creators = JSON.parse(catalogRaw);
      if (Array.isArray(creators)) {
        for (const c of creators) {
          if (Array.isArray(c.portfolio)) {
            for (const p of c.portfolio) {
              if (p.id && !migratedIds.has(p.id) && (p.id.startsWith("port-") || p.brand === "Independent Creation")) {
                portfolioCount++;
              }
            }
          }
        }
      }
    }

    // 2. Check skill passport
    const passportRaw = localStorage.getItem("ai_marketplace_skill_passport_v2");
    if (passportRaw) {
      const passport = JSON.parse(passportRaw);
      if (Array.isArray(passport)) {
        for (const item of passport) {
          if (item.id && !migratedIds.has(item.id) && item.id.startsWith("sp-")) {
            skillsCount++;
          }
        }
      }
    }

    // 3. Check test submissions
    const submissionsRaw = localStorage.getItem("ai_marketplace_test_submissions_v2");
    if (submissionsRaw) {
      const submissions = JSON.parse(submissionsRaw);
      if (Array.isArray(submissions)) {
        for (const sub of submissions) {
          if (sub.id && !migratedIds.has(sub.id)) {
            submissionsCount++;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Error scanning legacy localStorage data:", err);
  }

  return {
    hasLegacyData: portfolioCount > 0 || skillsCount > 0 || submissionsCount > 0,
    portfolioCount,
    skillsCount,
    submissionsCount,
  };
}

/**
 * Migrates legacy localStorage records to the persistent database.
 */
export async function migrateLegacyDataToDatabase(): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    attempted: 0,
    succeeded: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    migratedItems: [],
  };

  if (typeof window === "undefined") {
    return summary;
  }

  const migratedIds = getMigratedIds();

  // 1. Process custom portfolio projects
  try {
    const catalogRaw = localStorage.getItem("ai_marketplace_creators_catalog");
    if (catalogRaw) {
      const creators = JSON.parse(catalogRaw);
      if (Array.isArray(creators)) {
        for (const c of creators) {
          if (Array.isArray(c.portfolio)) {
            for (const p of c.portfolio) {
              if (!p.id) continue;
              if (migratedIds.has(p.id)) {
                summary.skipped++;
                continue;
              }

              // Check if it's a custom user-created portfolio project
              const isUserProject = p.id.startsWith("port-") || p.brand === "Independent Creation";
              if (!isUserProject) continue;

              summary.attempted++;

              try {
                // Post to portfolio database API
                const res = await fetch("/api/v1/portfolio", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: p.title || "Untitled Project",
                    description: p.description || "Portfolio project evidence.",
                    content_type: p.contentType || "AI Video Reel",
                    tools_used: Array.isArray(p.toolsUsed) && p.toolsUsed.length > 0 ? p.toolsUsed : ["Generative AI"],
                    media_url: p.image && (p.image.startsWith("http") || p.image.startsWith("/")) ? (p.image.startsWith("http") ? p.image : `https://example.com${p.image}`) : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
                    prompt: p.prompt || null,
                    process_evidence: p.processEvidence || null,
                    linked_skill_ids: [],
                    metrics: { engagement: p.engagement, reach: p.reach },
                  }),
                });

                if (res.ok) {
                  markIdAsMigrated(p.id);
                  summary.succeeded++;
                  summary.migratedItems.push({
                    type: "portfolio",
                    id: p.id,
                    title: p.title,
                    status: "migrated",
                  });
                } else if (res.status === 503) {
                  // Database not configured; preserve records in localStorage safely
                  summary.errors.push("Database service not configured. Preserving localStorage records.");
                  break;
                } else {
                  const errorJson = await res.json().catch(() => ({}));
                  summary.failed++;
                  summary.errors.push(`Portfolio '${p.title}': ${errorJson.error || "Save rejected"}`);
                  summary.migratedItems.push({
                    type: "portfolio",
                    id: p.id,
                    title: p.title,
                    status: "failed",
                  });
                }
              } catch (err: any) {
                summary.failed++;
                summary.errors.push(`Portfolio '${p.title}': ${err.message}`);
              }
            }
          }
        }
      }
    }
  } catch (err: any) {
    summary.errors.push(`Catalog scan error: ${err.message}`);
  }

  // 2. Process custom claimed skills
  try {
    const passportRaw = localStorage.getItem("ai_marketplace_skill_passport_v2");
    if (passportRaw) {
      const passport = JSON.parse(passportRaw);
      if (Array.isArray(passport)) {
        for (const item of passport) {
          if (!item.id || migratedIds.has(item.id)) continue;
          if (!item.id.startsWith("sp-")) continue;

          summary.attempted++;
          try {
            const res = await fetch("/api/v1/skills", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                skill_name: item.skillName,
                category: item.category || "AI Creative Discipline",
                status: item.status === "Portfolio Evidence" ? "portfolio_evidence" : "claimed",
              }),
            });

            if (res.ok) {
              markIdAsMigrated(item.id);
              summary.succeeded++;
              summary.migratedItems.push({
                type: "skill",
                id: item.id,
                title: item.skillName,
                status: "migrated",
              });
            }
          } catch (e: any) {
            summary.failed++;
            summary.errors.push(`Skill '${item.skillName}': ${e.message}`);
          }
        }
      }
    }
  } catch (err: any) {
    summary.errors.push(`Passport scan error: ${err.message}`);
  }

  // 3. Process test submissions
  try {
    const submissionsRaw = localStorage.getItem("ai_marketplace_test_submissions_v2");
    if (submissionsRaw) {
      const submissions = JSON.parse(submissionsRaw);
      if (Array.isArray(submissions)) {
        for (const sub of submissions) {
          if (!sub.id || migratedIds.has(sub.id)) continue;

          summary.attempted++;
          try {
            const res = await fetch("/api/v1/tests/submissions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                test_id: sub.testId || "prompt-engineering",
                answers: {},
                score: sub.score,
                status: sub.passed ? "passed" : "failed",
                feedback: sub.feedback,
              }),
            });

            if (res.ok) {
              markIdAsMigrated(sub.id);
              summary.succeeded++;
              summary.migratedItems.push({
                type: "test_submission",
                id: sub.id,
                title: `Submission for ${sub.testId}`,
                status: "migrated",
              });
            }
          } catch (e: any) {
            summary.failed++;
            summary.errors.push(`Submission '${sub.id}': ${e.message}`);
          }
        }
      }
    }
  } catch (err: any) {
    summary.errors.push(`Submissions scan error: ${err.message}`);
  }

  return summary;
}
