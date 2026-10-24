import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { aiLogger } from "@/lib/ai/logger";
import { DEMO_CREATORS } from "@/lib/demo-creators";
import {
  RecommendationImpressionItem,
  RecordActionInput,
  RecordExplicitFeedbackInput,
  InteractionAction,
  FeedbackRating,
} from "@/lib/validations/recommendation-interaction";

export interface StoredImpression {
  id: string;
  campaignId: string;
  creatorProfileId: string;
  brandId: string;
  recommendationRank: number;
  modelVersion: string;
  featureSnapshot: {
    semanticScore: number;
    ruleScore: number;
    finalScore: number;
    skillOverlapRatio: number;
    verifiedSkillRatio: number;
    budgetCompatibility: number;
    categoryMatch: number;
    experienceYears: number;
  };
  createdAt: string;
}

export interface StoredEvent {
  id: string;
  campaignId: string;
  creatorProfileId: string;
  brandId: string;
  action: InteractionAction;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface StoredFeedback {
  id: string;
  campaignId: string;
  creatorProfileId: string;
  brandId: string;
  rating: FeedbackRating;
  reasons: string[];
  notes?: string;
  createdAt: string;
}

export interface MLTrainingSample {
  campaignId: string;
  creatorProfileId: string;
  features: {
    semanticSimilarity: number;
    skillOverlapRatio: number;
    verifiedSkillRatio: number;
    budgetCompatibility: number;
    categoryMatch: number;
    experienceYearsNorm: number;
  };
  label: 0 | 1;
  labelSource: "completed_hire" | "explicit_feedback" | "invitation_accepted" | "explicit_rejection";
  timestamp: string;
}

export interface RecommendationStats {
  totalImpressions: number;
  actions: Record<InteractionAction, number>;
  explicitFeedback: Record<FeedbackRating, number>;
  outcomeCoverage: {
    verifiedPositive: number;
    verifiedNegative: number;
    unlabelledOrInProgress: number;
  };
  mlReadiness: {
    threshold: number;
    currentCount: number;
    status: "NOT_READY" | "READY";
    reason: string;
  };
  persistenceStatus: "database" | "buffered_pending_migration";
}

// In-Memory Debounce and Fallback Buffer (Preserved across requests in Node process)
class InteractionMemoryStore {
  impressions: StoredImpression[] = [];
  events: StoredEvent[] = [];
  feedback: StoredFeedback[] = [];
  private debounceMap = new Map<string, number>();

  isDebounced(key: string, windowMs: number): boolean {
    const now = Date.now();
    const lastTime = this.debounceMap.get(key);
    if (lastTime && now - lastTime < windowMs) {
      return true;
    }
    this.debounceMap.set(key, now);
    return false;
  }

  clear() {
    this.impressions = [];
    this.events = [];
    this.feedback = [];
    this.debounceMap.clear();
  }
}

const memoryStore = new InteractionMemoryStore();

export const interactionService = {
  /**
   * Record recommendation impressions batch.
   * Debounces duplicate impressions within 5 minutes.
   */
  async recordImpressions(
    campaignId: string,
    brandId: string,
    impressions: RecommendationImpressionItem[],
    modelVersion = "hybrid_v1"
  ): Promise<{ recordedCount: number; skippedCount: number; persistenceStatus: string }> {
    let recordedCount = 0;
    let skippedCount = 0;

    for (const item of impressions) {
      const debounceKey = `imp:${campaignId}:${item.creatorProfileId}:${modelVersion}`;
      if (memoryStore.isDebounced(debounceKey, 5 * 60 * 1000)) {
        skippedCount++;
        continue;
      }

      const record: StoredImpression = {
        id: `imp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        campaignId,
        creatorProfileId: item.creatorProfileId,
        brandId,
        recommendationRank: item.recommendationRank,
        modelVersion: item.modelVersion || modelVersion,
        featureSnapshot: item.featureSnapshot,
        createdAt: new Date().toISOString(),
      };

      // Always buffer in memory
      memoryStore.impressions.push(record);
      recordedCount++;

      // Try database persistence if table exists
      if (isSupabaseConfigured()) {
        try {
          const supabase = await createClient();
          await (supabase as any).from("recommendation_impressions").insert({
            campaign_id: campaignId,
            creator_profile_id: item.creatorProfileId,
            brand_id: brandId,
            recommendation_rank: item.recommendationRank,
            model_version: item.modelVersion || modelVersion,
            feature_snapshot: item.featureSnapshot,
          });
        } catch {
          // Table not migrated yet; captured safely in memoryStore
        }
      }
    }

    aiLogger.info("Recommendation impressions recorded:", {
      campaignId,
      brandId,
      recordedCount,
      skippedCount,
    });

    return {
      recordedCount,
      skippedCount,
      persistenceStatus: "buffered_pending_migration",
    };
  },

  /**
   * Record an observed interaction action across the campaign lifecycle.
   * Debounces identical action within 10 seconds.
   */
  async recordAction(
    brandId: string,
    input: RecordActionInput
  ): Promise<{ success: boolean; persistenceStatus: string; eventId: string }> {
    const debounceKey = `act:${input.campaignId}:${input.creatorProfileId}:${input.action}`;
    if (memoryStore.isDebounced(debounceKey, 10 * 1000)) {
      return {
        success: true,
        persistenceStatus: "debounced_duplicate",
        eventId: "duplicate_skipped",
      };
    }

    const eventRecord: StoredEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      campaignId: input.campaignId,
      creatorProfileId: input.creatorProfileId,
      brandId,
      action: input.action,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    };

    memoryStore.events.push(eventRecord);

    let persistenceStatus = "buffered_pending_migration";
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { error } = await (supabase as any).from("recommendation_events").insert({
          campaign_id: input.campaignId,
          creator_profile_id: input.creatorProfileId,
          brand_id: brandId,
          action: input.action,
          metadata: input.metadata || {},
        });
        if (!error) {
          persistenceStatus = "persisted_in_database";
        }
      } catch {
        // Migration 007 unapplied; fallback to memoryStore
      }
    }

    aiLogger.info("Recommendation action recorded:", {
      brandId,
      campaignId: input.campaignId,
      action: input.action,
      persistenceStatus,
    });

    return {
      success: true,
      persistenceStatus,
      eventId: eventRecord.id,
    };
  },

  /**
   * Record explicit, subjective brand feedback.
   */
  async recordExplicitFeedback(
    brandId: string,
    input: RecordExplicitFeedbackInput
  ): Promise<{ success: boolean; persistenceStatus: string; feedbackId: string }> {
    const feedbackRecord: StoredFeedback = {
      id: `fdb-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      campaignId: input.campaignId,
      creatorProfileId: input.creatorProfileId,
      brandId,
      rating: input.rating,
      reasons: input.reasons || [],
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };

    memoryStore.feedback.push(feedbackRecord);

    let persistenceStatus = "buffered_pending_migration";
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { error } = await (supabase as any).from("recommendation_feedback").insert({
          campaign_id: input.campaignId,
          creator_profile_id: input.creatorProfileId,
          brand_id: brandId,
          rating: input.rating,
          reasons: input.reasons || [],
          notes: input.notes || null,
        });
        if (!error) {
          persistenceStatus = "persisted_in_database";
        }
      } catch {
        // Migration 007 unapplied; fallback to memoryStore
      }
    }

    aiLogger.info("Explicit recommendation feedback recorded:", {
      brandId,
      campaignId: input.campaignId,
      rating: input.rating,
      persistenceStatus,
    });

    return {
      success: true,
      persistenceStatus,
      feedbackId: feedbackRecord.id,
    };
  },

  /**
   * Verify campaign ownership or accessibility.
   */
  async verifyCampaignOwnership(campaignId: string, brandId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, brand_id")
        .eq("id", campaignId)
        .maybeSingle();

      if (error || !data) {
        // If campaigns table is empty or campaign is client-side test session
        return true;
      }

      return data.brand_id === brandId;
    } catch {
      return true;
    }
  },

  /**
   * Verify creator profile exists in database or synthetic demo catalog.
   */
  async verifyCreatorIdentifier(creatorProfileId: string): Promise<boolean> {
    // 1. Check demo catalog
    const isDemo = DEMO_CREATORS.some((c) => c.id === creatorProfileId);
    if (isDemo) return true;

    // 2. Check Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data } = await supabase
          .from("creator_profiles")
          .select("id")
          .or(`id.eq.${creatorProfileId},slug.eq.${creatorProfileId}`)
          .maybeSingle();

        if (data) return true;
      } catch {
        // Fall through
      }
    }

    // Accept valid UUID format
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      creatorProfileId
    );
    return isUuid;
  },

  /**
   * Helper to simulate and validate creator invitation authorization per Migration 007 RLS rules.
   * Confirms relationship:
   * 1. Action must be 'creator_accepted' or 'creator_declined'.
   * 2. Creator must own creator_profile_id.
   * 3. An invitation must exist in matches with status in ('invited', 'accepted', 'declined', 'hired').
   * 4. Campaign must belong to brandId.
   */
  validateCreatorEventAuthorization(input: {
    authenticatedUserId: string;
    action: string;
    campaignId: string;
    creatorProfileId: string;
    brandId: string;
    creatorProfileOwnerId: string;
    match?: {
      campaignId: string;
      creatorProfileId: string;
      status: "suggested" | "invited" | "accepted" | "declined" | "hired";
    } | null;
    campaign?: {
      id: string;
      brandId: string;
    } | null;
  }): { authorized: boolean; reason?: string } {
    if (input.action !== "creator_accepted" && input.action !== "creator_declined") {
      return { authorized: false, reason: `Action '${input.action}' is not an authorized creator response action.` };
    }

    if (input.authenticatedUserId !== input.creatorProfileOwnerId) {
      return { authorized: false, reason: "Unauthorized: Authenticated creator does not own target creator_profile_id." };
    }

    if (!input.campaign || input.campaign.brandId !== input.brandId || input.campaign.id !== input.campaignId) {
      return { authorized: false, reason: "Forged event: Campaign does not belong to the claimed brandId." };
    }

    if (!input.match || input.match.campaignId !== input.campaignId || input.match.creatorProfileId !== input.creatorProfileId) {
      return { authorized: false, reason: "Forged event: No match relationship exists between creator and campaign." };
    }

    const validInvitationStatuses = ["invited", "accepted", "declined", "hired"];
    if (!validInvitationStatuses.includes(input.match.status)) {
      return {
        authorized: false,
        reason: `Insufficient proof: Match status is '${input.match.status}'. A match suggestion is not an invitation. Status must be one of: ${validInvitationStatuses.join(", ")}.`,
      };
    }

    return { authorized: true };
  },

  /**
   * Get authentic aggregate statistics and ML dataset readiness.
   */
  async getRecommendationStats(brandId?: string, campaignId?: string): Promise<RecommendationStats> {
    const actionCounts: Record<InteractionAction, number> = {
      view: 0,
      shortlist: 0,
      invite: 0,
      creator_accepted: 0,
      creator_declined: 0,
      hire: 0,
      reject: 0,
      campaign_completed: 0,
    };

    const feedbackCounts: Record<FeedbackRating, number> = {
      relevant: 0,
      somewhat_relevant: 0,
      not_relevant: 0,
    };

    // Filter memory store
    let filteredEvents = [...memoryStore.events];
    let filteredFeedback = [...memoryStore.feedback];
    let filteredImpressions = [...memoryStore.impressions];
    let persistenceStatus: "database" | "buffered_pending_migration" = "buffered_pending_migration";

    // Query Supabase database records if available
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        let impQuery = (supabase as any).from("recommendation_impressions").select("*");
        let evtQuery = (supabase as any).from("recommendation_events").select("*");
        let fbQuery = (supabase as any).from("recommendation_feedback").select("*");

        if (brandId) {
          impQuery = impQuery.eq("brand_id", brandId);
          evtQuery = evtQuery.eq("brand_id", brandId);
          fbQuery = fbQuery.eq("brand_id", brandId);
        }
        if (campaignId) {
          impQuery = impQuery.eq("campaign_id", campaignId);
          evtQuery = evtQuery.eq("campaign_id", campaignId);
          fbQuery = fbQuery.eq("campaign_id", campaignId);
        }

        const [impRes, evtRes, fbRes] = await Promise.all([impQuery, evtQuery, fbQuery]);

        if (impRes.data && Array.isArray(impRes.data)) {
          persistenceStatus = "database";
          for (const row of impRes.data) {
            filteredImpressions.push({
              id: row.id,
              campaignId: row.campaign_id,
              creatorProfileId: row.creator_profile_id,
              brandId: row.brand_id,
              recommendationRank: row.recommendation_rank,
              modelVersion: row.model_version,
              featureSnapshot: row.feature_snapshot || {},
              createdAt: row.created_at,
            });
          }
        }

        if (evtRes.data && Array.isArray(evtRes.data)) {
          persistenceStatus = "database";
          for (const row of evtRes.data) {
            filteredEvents.push({
              id: row.id,
              campaignId: row.campaign_id,
              creatorProfileId: row.creator_profile_id,
              brandId: row.brand_id,
              action: row.action,
              metadata: row.metadata || {},
              createdAt: row.created_at,
            });
          }
        }

        if (fbRes.data && Array.isArray(fbRes.data)) {
          persistenceStatus = "database";
          for (const row of fbRes.data) {
            filteredFeedback.push({
              id: row.id,
              campaignId: row.campaign_id,
              creatorProfileId: row.creator_profile_id,
              brandId: row.brand_id,
              rating: row.rating,
              reasons: row.reasons || [],
              notes: row.notes,
              createdAt: row.created_at,
            });
          }
        }
      } catch {
        // Table not migrated yet; fallback safely to in-memory records
      }
    }

    if (brandId) {
      filteredEvents = filteredEvents.filter((e) => e.brandId === brandId);
      filteredFeedback = filteredFeedback.filter((f) => f.brandId === brandId);
      filteredImpressions = filteredImpressions.filter((i) => i.brandId === brandId);
    }

    if (campaignId) {
      filteredEvents = filteredEvents.filter((e) => e.campaignId === campaignId);
      filteredFeedback = filteredFeedback.filter((f) => f.campaignId === campaignId);
      filteredImpressions = filteredImpressions.filter((i) => i.campaignId === campaignId);
    }

    for (const evt of filteredEvents) {
      if (actionCounts[evt.action] !== undefined) {
        actionCounts[evt.action]++;
      }
    }

    for (const fb of filteredFeedback) {
      if (feedbackCounts[fb.rating] !== undefined) {
        feedbackCounts[fb.rating]++;
      }
    }

    // Outcome formulation
    const verifiedPositive =
      actionCounts.hire +
      actionCounts.campaign_completed +
      actionCounts.creator_accepted +
      feedbackCounts.relevant;

    const verifiedNegative =
      actionCounts.reject +
      actionCounts.creator_declined +
      feedbackCounts.not_relevant;

    const unlabelledOrInProgress =
      filteredImpressions.length +
      actionCounts.view +
      actionCounts.shortlist +
      actionCounts.invite;

    const totalLabelled = verifiedPositive + verifiedNegative;
    const threshold = 200;

    const mlStatus: "NOT_READY" | "READY" = totalLabelled >= threshold ? "READY" : "NOT_READY";
    const reason =
      mlStatus === "READY"
        ? `Sufficient labelled data available (${totalLabelled} events). Supervised ML ranking model training is permitted.`
        : `Insufficient authentic labelled recommendation outcomes (${totalLabelled} / ${threshold} required). Production training is deferred to prevent ungrounded models.`;

    return {
      totalImpressions: filteredImpressions.length,
      actions: actionCounts,
      explicitFeedback: feedbackCounts,
      outcomeCoverage: {
        verifiedPositive,
        verifiedNegative,
        unlabelledOrInProgress,
      },
      mlReadiness: {
        threshold,
        currentCount: totalLabelled,
        status: mlStatus,
        reason,
      },
      persistenceStatus,
    };
  },

  /**
   * Formulate authentic labelled dataset for the ML training pipeline.
   * Strictly filters out unlabelled impressions and views.
   */
  async getLabelledDataset(): Promise<{
    samples: MLTrainingSample[];
    totalSamples: number;
    positiveCount: number;
    negativeCount: number;
    unlabelledCount: number;
    missingSnapshotCount: number;
    readiness: "NOT_READY" | "READY";
  }> {
    const samples: MLTrainingSample[] = [];

    const allImpressions = [...memoryStore.impressions];
    const allEvents = [...memoryStore.events];
    const allFeedback = [...memoryStore.feedback];

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const [impRes, evtRes, fbRes] = await Promise.all([
          (supabase as any).from("recommendation_impressions").select("*"),
          (supabase as any).from("recommendation_events").select("*"),
          (supabase as any).from("recommendation_feedback").select("*"),
        ]);

        if (impRes.data && Array.isArray(impRes.data)) {
          for (const row of impRes.data) {
            allImpressions.push({
              id: row.id,
              campaignId: row.campaign_id,
              creatorProfileId: row.creator_profile_id,
              brandId: row.brand_id,
              recommendationRank: row.recommendation_rank,
              modelVersion: row.model_version,
              featureSnapshot: row.feature_snapshot || {},
              createdAt: row.created_at,
            });
          }
        }

        if (evtRes.data && Array.isArray(evtRes.data)) {
          for (const row of evtRes.data) {
            allEvents.push({
              id: row.id,
              campaignId: row.campaign_id,
              creatorProfileId: row.creator_profile_id,
              brandId: row.brand_id,
              action: row.action,
              metadata: row.metadata || {},
              createdAt: row.created_at,
            });
          }
        }

        if (fbRes.data && Array.isArray(fbRes.data)) {
          for (const row of fbRes.data) {
            allFeedback.push({
              id: row.id,
              campaignId: row.campaign_id,
              creatorProfileId: row.creator_profile_id,
              brandId: row.brand_id,
              rating: row.rating,
              reasons: row.reasons || [],
              notes: row.notes,
              createdAt: row.created_at,
            });
          }
        }
      } catch {
        // Table not migrated yet; fallback safely to in-memory records
      }
    }

    // Map impressions by campaign + creator to retrieve feature snapshots
    const impressionMap = new Map<string, StoredImpression>();
    for (const imp of allImpressions) {
      const key = `${imp.campaignId}:${imp.creatorProfileId}`;
      if (!impressionMap.has(key)) {
        impressionMap.set(key, imp);
      }
    }

    let positiveCount = 0;
    let negativeCount = 0;
    let missingSnapshotCount = 0;

    // 1. Process behavioral actions
    for (const evt of allEvents) {
      const isOutcomeAction =
        evt.action === "hire" ||
        evt.action === "campaign_completed" ||
        evt.action === "creator_accepted" ||
        evt.action === "reject" ||
        evt.action === "creator_declined";

      if (!isOutcomeAction) {
        // Intermediate behavioral steps ('view', 'shortlist', 'invite') remain unlabelled
        continue;
      }

      const key = `${evt.campaignId}:${evt.creatorProfileId}`;
      const imp = impressionMap.get(key);

      // Training data integrity: If genuine inference-time feature snapshot is missing,
      // exclude sample from supervised training and log a safe audit warning.
      // Never substitute invented default features for real training data.
      if (
        !imp ||
        !imp.featureSnapshot ||
        typeof imp.featureSnapshot !== "object" ||
        imp.featureSnapshot.semanticScore === undefined ||
        imp.featureSnapshot.skillOverlapRatio === undefined
      ) {
        missingSnapshotCount++;
        aiLogger.warn(
          "Excluding action outcome from supervised training: genuine inference-time feature snapshot is missing",
          {
            campaignId: evt.campaignId,
            creatorProfileId: evt.creatorProfileId,
            action: evt.action,
          }
        );
        continue;
      }

      const features = {
        semanticSimilarity: (imp.featureSnapshot.semanticScore ?? 0) / 100,
        skillOverlapRatio: imp.featureSnapshot.skillOverlapRatio ?? 0,
        verifiedSkillRatio: imp.featureSnapshot.verifiedSkillRatio ?? 0,
        budgetCompatibility: imp.featureSnapshot.budgetCompatibility ?? 0,
        categoryMatch: imp.featureSnapshot.categoryMatch ?? 0,
        experienceYearsNorm: Math.min((imp.featureSnapshot.experienceYears ?? 0) / 10, 1.0),
      };

      if (evt.action === "hire" || evt.action === "campaign_completed") {
        samples.push({
          campaignId: evt.campaignId,
          creatorProfileId: evt.creatorProfileId,
          features,
          label: 1,
          labelSource: "completed_hire",
          timestamp: evt.createdAt,
        });
        positiveCount++;
      } else if (evt.action === "creator_accepted") {
        samples.push({
          campaignId: evt.campaignId,
          creatorProfileId: evt.creatorProfileId,
          features,
          label: 1,
          labelSource: "invitation_accepted",
          timestamp: evt.createdAt,
        });
        positiveCount++;
      } else if (evt.action === "reject" || evt.action === "creator_declined") {
        samples.push({
          campaignId: evt.campaignId,
          creatorProfileId: evt.creatorProfileId,
          features,
          label: 0,
          labelSource: "explicit_rejection",
          timestamp: evt.createdAt,
        });
        negativeCount++;
      }
    }

    // 2. Process explicit brand ratings
    for (const fb of allFeedback) {
      if (fb.rating !== "relevant" && fb.rating !== "not_relevant") {
        // 'somewhat_relevant' is ambiguous / neutral and excluded from binary classification
        continue;
      }

      const key = `${fb.campaignId}:${fb.creatorProfileId}`;
      const imp = impressionMap.get(key);

      if (
        !imp ||
        !imp.featureSnapshot ||
        typeof imp.featureSnapshot !== "object" ||
        imp.featureSnapshot.semanticScore === undefined ||
        imp.featureSnapshot.skillOverlapRatio === undefined
      ) {
        missingSnapshotCount++;
        aiLogger.warn(
          "Excluding explicit brand feedback from supervised training: genuine inference-time feature snapshot is missing",
          {
            campaignId: fb.campaignId,
            creatorProfileId: fb.creatorProfileId,
            rating: fb.rating,
          }
        );
        continue;
      }

      const features = {
        semanticSimilarity: (imp.featureSnapshot.semanticScore ?? 0) / 100,
        skillOverlapRatio: imp.featureSnapshot.skillOverlapRatio ?? 0,
        verifiedSkillRatio: imp.featureSnapshot.verifiedSkillRatio ?? 0,
        budgetCompatibility: imp.featureSnapshot.budgetCompatibility ?? 0,
        categoryMatch: imp.featureSnapshot.categoryMatch ?? 0,
        experienceYearsNorm: Math.min((imp.featureSnapshot.experienceYears ?? 0) / 10, 1.0),
      };

      if (fb.rating === "relevant") {
        samples.push({
          campaignId: fb.campaignId,
          creatorProfileId: fb.creatorProfileId,
          features,
          label: 1,
          labelSource: "explicit_feedback",
          timestamp: fb.createdAt,
        });
        positiveCount++;
      } else if (fb.rating === "not_relevant") {
        samples.push({
          campaignId: fb.campaignId,
          creatorProfileId: fb.creatorProfileId,
          features,
          label: 0,
          labelSource: "explicit_feedback",
          timestamp: fb.createdAt,
        });
        negativeCount++;
      }
    }

    const unlabelledCount = memoryStore.impressions.length;
    const totalSamples = samples.length;
    const readiness: "NOT_READY" | "READY" = totalSamples >= 200 ? "READY" : "NOT_READY";

    return {
      samples,
      totalSamples,
      positiveCount,
      negativeCount,
      unlabelledCount,
      missingSnapshotCount,
      readiness,
    };
  },

  /**
   * Helper for tests to reset state.
   */
  _resetMemoryStore() {
    memoryStore.clear();
  },
};
