-- =============================================================================
-- MIGRATION 007: Recommendations, Creator Embeddings & Historical Interaction Collection
-- PostgreSQL 15+ / Supabase
--
-- AUDIT & HARDENING STATUS:
-- 1. All policies made strictly idempotent via DROP POLICY IF EXISTS.
-- 2. RLS enforces campaign ownership (prevents cross-brand campaign pollution).
-- 3. RLS on recommendation_events allows both brand AND creator (permits creator_accepted/declined).
-- 4. Uses hardened, recursion-proof public.is_admin() for admin privileges.
-- 5. Embeddings standard: 768 dimensions (aligned with Google Gemini text-embedding-004
--    and OpenRouter BGE standard). NOTE: If OpenAI text-embedding-3-small (1536) is used,
--    vector dimension must be set to vector(1536).
--
-- NOTE: DO NOT EXECUTE OR APPLY IN PRODUCTION WITHOUT EXPLICIT USER APPROVAL.
-- =============================================================================

-- 1. Try enabling pgvector extension safely
DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pgvector extension could not be enabled directly. Semantic search will utilize application-level vector similarity until extension is provisioned.';
END $$;

-- 2. Add embedding columns to creator_profiles and portfolio_projects if pgvector is available
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
        EXECUTE $ddl$
            ALTER TABLE public.creator_profiles 
                ADD COLUMN IF NOT EXISTS embedding vector(768);
            
            ALTER TABLE public.portfolio_projects 
                ADD COLUMN IF NOT EXISTS embedding vector(768);

            -- Add HNSW vector index for fast approximate nearest neighbor search
            CREATE INDEX IF NOT EXISTS idx_creator_profiles_embedding_cosine 
                ON public.creator_profiles USING hnsw (embedding vector_cosine_ops);

            CREATE INDEX IF NOT EXISTS idx_portfolio_projects_embedding_cosine 
                ON public.portfolio_projects USING hnsw (embedding vector_cosine_ops);
        $ddl$;
    ELSE
        RAISE NOTICE 'pgvector type not detected; skipping vector columns and HNSW index creation.';
    END IF;
END $$;

-- =============================================================================
-- 3. RECOMMENDATION IMPRESSIONS TABLE
-- Stores individual recommendation candidate impressions with ranks and algorithmic feature snapshots.
-- Avoids storing protected, sensitive personal attributes.
-- Uses created_at index rather than restrictive static unique constraint so multiple
-- recommendation sessions over time are preserved without constraint violations.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.recommendation_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    creator_profile_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recommendation_rank INT NOT NULL CHECK (recommendation_rank >= 1),
    model_version TEXT NOT NULL DEFAULT 'hybrid_v1',
    feature_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rec_imp_campaign ON public.recommendation_impressions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rec_imp_creator ON public.recommendation_impressions(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_rec_imp_brand ON public.recommendation_impressions(brand_id);
CREATE INDEX IF NOT EXISTS idx_rec_imp_created ON public.recommendation_impressions(created_at);
CREATE INDEX IF NOT EXISTS idx_rec_imp_lookup ON public.recommendation_impressions(campaign_id, creator_profile_id, model_version);

ALTER TABLE public.recommendation_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view own recommendation impressions" ON public.recommendation_impressions;
CREATE POLICY "Brands can view own recommendation impressions"
    ON public.recommendation_impressions FOR SELECT
    TO authenticated
    USING (auth.uid() = brand_id OR public.is_admin());

DROP POLICY IF EXISTS "Brands can insert recommendation impressions" ON public.recommendation_impressions;
CREATE POLICY "Brands can insert recommendation impressions"
    ON public.recommendation_impressions FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.uid() = brand_id OR public.is_admin())
        AND EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_id AND (c.brand_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Admins full access to impressions" ON public.recommendation_impressions;
CREATE POLICY "Admins full access to impressions"
    ON public.recommendation_impressions FOR ALL
    TO authenticated
    USING (public.is_admin());

-- =============================================================================
-- 4. RECOMMENDATION EVENTS TABLE (BEHAVIORAL ACTIONS)
-- Stores observed actions across the campaign lifecycle.
-- Crucial rule: Impressions and views are NOT treated as negative training labels.
-- Policy allows both the Campaign Brand and the Target Creator to log legitimate events.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.recommendation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    creator_profile_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN (
        'view', 
        'shortlist', 
        'invite', 
        'creator_accepted', 
        'creator_declined', 
        'hire', 
        'reject', 
        'campaign_completed'
    )),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rec_event_campaign ON public.recommendation_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rec_event_creator ON public.recommendation_events(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_rec_event_brand ON public.recommendation_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_rec_event_action ON public.recommendation_events(action);
CREATE INDEX IF NOT EXISTS idx_rec_event_created ON public.recommendation_events(created_at);

ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized users can view recommendation events" ON public.recommendation_events;
CREATE POLICY "Authorized users can view recommendation events"
    ON public.recommendation_events FOR SELECT
    TO authenticated
    USING (
        auth.uid() = brand_id
        OR creator_profile_id IN (
            SELECT cp.id FROM public.creator_profiles cp WHERE cp.user_id = auth.uid()
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Authorized users can insert recommendation events" ON public.recommendation_events;
CREATE POLICY "Authorized users can insert recommendation events"
    ON public.recommendation_events FOR INSERT
    TO authenticated
    WITH CHECK (
        (
            -- Brand inserting brand lifecycle events for their campaign
            auth.uid() = brand_id
            AND EXISTS (
                SELECT 1 FROM public.campaigns c
                WHERE c.id = campaign_id AND c.brand_id = auth.uid()
            )
        )
        OR (
            -- Creator responding to invitations for their own profile with verified invitation match
            action IN ('creator_accepted', 'creator_declined')
            AND creator_profile_id IN (
                SELECT cp.id FROM public.creator_profiles cp WHERE cp.user_id = auth.uid()
            )
            AND EXISTS (
                SELECT 1 
                FROM public.matches m
                JOIN public.campaigns c ON c.id = m.campaign_id
                WHERE m.campaign_id = recommendation_events.campaign_id
                  AND m.creator_profile_id = recommendation_events.creator_profile_id
                  AND c.brand_id = recommendation_events.brand_id
                  AND m.status IN ('invited', 'accepted', 'declined', 'hired')
            )
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Admins full access to recommendation events" ON public.recommendation_events;
CREATE POLICY "Admins full access to recommendation events"
    ON public.recommendation_events FOR ALL
    TO authenticated
    USING (public.is_admin());

-- =============================================================================
-- 5. RECOMMENDATION FEEDBACK TABLE (EXPLICIT BRAND RATINGS)
-- Stores explicit, subjective brand feedback separate from observed actions.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    creator_profile_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating TEXT NOT NULL CHECK (rating IN ('relevant', 'somewhat_relevant', 'not_relevant')),
    reasons TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_rec_feedback_campaign_creator UNIQUE (campaign_id, creator_profile_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_rec_feedback_campaign ON public.recommendation_feedback(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rec_feedback_creator ON public.recommendation_feedback(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_rec_feedback_brand ON public.recommendation_feedback(brand_id);
CREATE INDEX IF NOT EXISTS idx_rec_feedback_rating ON public.recommendation_feedback(rating);

ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view own recommendation feedback" ON public.recommendation_feedback;
CREATE POLICY "Brands can view own recommendation feedback"
    ON public.recommendation_feedback FOR SELECT
    TO authenticated
    USING (auth.uid() = brand_id OR public.is_admin());

DROP POLICY IF EXISTS "Brands can insert recommendation feedback" ON public.recommendation_feedback;
CREATE POLICY "Brands can insert recommendation feedback"
    ON public.recommendation_feedback FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.uid() = brand_id OR public.is_admin())
        AND EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_id AND (c.brand_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Brands can update own recommendation feedback" ON public.recommendation_feedback;
CREATE POLICY "Brands can update own recommendation feedback"
    ON public.recommendation_feedback FOR UPDATE
    TO authenticated
    USING (auth.uid() = brand_id OR public.is_admin())
    WITH CHECK (auth.uid() = brand_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can view all recommendation feedback" ON public.recommendation_feedback;
CREATE POLICY "Admins can view all recommendation feedback"
    ON public.recommendation_feedback FOR ALL
    TO authenticated
    USING (public.is_admin());

-- =============================================================================
-- 6. STORED PROCEDURE FOR SEMANTIC SEARCH (IF PGVECTOR AVAILABLE)
-- Supports both creator-level and portfolio-level semantic queries with 768-dim embeddings.
-- Guarded with dynamic execution so if pgvector is missing, migration continues safely.
-- =============================================================================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
        EXECUTE $fn$
            CREATE OR REPLACE FUNCTION match_creators_semantic(
                query_embedding vector(768),
                target_category TEXT DEFAULT NULL,
                match_threshold FLOAT DEFAULT 0.5,
                match_count INT DEFAULT 10
            )
            RETURNS TABLE (
                creator_id UUID,
                name TEXT,
                category TEXT,
                similarity FLOAT
            )
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $body$
            BEGIN
                RETURN QUERY
                SELECT
                    cp.id AS creator_id,
                    cp.name,
                    cp.category,
                    ROUND((1 - (cp.embedding <=> query_embedding))::numeric, 4)::float AS similarity
                FROM public.creator_profiles cp
                WHERE
                    cp.embedding IS NOT NULL
                    AND (target_category IS NULL OR cp.category ILIKE '%' || target_category || '%')
                    AND (1 - (cp.embedding <=> query_embedding)) >= match_threshold
                ORDER BY cp.embedding <=> query_embedding ASC
                LIMIT match_count;
            END;
            $body$;
        $fn$;

        GRANT EXECUTE ON FUNCTION match_creators_semantic(vector, text, float, int) TO authenticated;
        GRANT EXECUTE ON FUNCTION match_creators_semantic(vector, text, float, int) TO service_role;
    ELSE
        RAISE NOTICE 'pgvector extension not provisioned; skipping match_creators_semantic function creation.';
    END IF;
END $$;

-- =============================================================================
-- 7. LEAST-PRIVILEGE TABLE GRANTS
-- Grants minimum required PostgREST privileges to authenticated users and service_role.
-- Anonymous access is intentionally denied (no grants to anon).
-- All writes and reads remain strictly governed by Row Level Security (RLS).
-- =============================================================================
GRANT SELECT, INSERT ON TABLE public.recommendation_impressions TO authenticated;
GRANT SELECT, INSERT ON TABLE public.recommendation_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.recommendation_feedback TO authenticated;

GRANT ALL ON TABLE public.recommendation_impressions TO service_role;
GRANT ALL ON TABLE public.recommendation_events TO service_role;
GRANT ALL ON TABLE public.recommendation_feedback TO service_role;

-- =============================================================================
-- 8. AUDITED ROLLBACK PROCEDURE (STAGED FOR EMERGENCY REVERSAL)
-- =============================================================================
-- PRE-MIGRATION SNAPSHOT REQUIREMENT:
-- Before applying migration 007, an administrator must record existing column state:
--   SELECT table_name, column_name, data_type 
--   FROM information_schema.columns 
--   WHERE table_name IN ('creator_profiles', 'portfolio_projects') 
--     AND column_name = 'embedding';
--
-- RECOVERY / ROLLBACK EXECUTION (Run in Supabase SQL Editor if reversal is needed):
-- 
-- 1. Revoke grants and drop tables (without CASCADE to prevent uninspected downstream impact):
--    REVOKE ALL ON TABLE public.recommendation_feedback FROM authenticated, service_role;
--    REVOKE ALL ON TABLE public.recommendation_events FROM authenticated, service_role;
--    REVOKE ALL ON TABLE public.recommendation_impressions FROM authenticated, service_role;
--    DROP TABLE IF EXISTS public.recommendation_feedback;
--    DROP TABLE IF EXISTS public.recommendation_events;
--    DROP TABLE IF EXISTS public.recommendation_impressions;
--
-- 2. Drop RPC function if it was created:
--    DO $$ BEGIN
--        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
--            EXECUTE 'DROP FUNCTION IF EXISTS public.match_creators_semantic(vector, text, float, int);';
--        END IF;
--    END $$;
--
-- 3. Drop indexes and embedding columns:
--    IMPORTANT: If 'embedding' columns already existed prior to migration 007 (verified in step 0 snapshot),
--    DO NOT drop them! Dropping them would cause irreversible data loss of pre-existing vectors.
--    Only drop the indexes if they were created by migration 007:
--    DROP INDEX IF EXISTS public.idx_creator_profiles_embedding_cosine;
--    DROP INDEX IF EXISTS public.idx_portfolio_projects_embedding_cosine;
--    -- Execute the column drops ONLY IF the pre-migration snapshot confirmed they did not exist prior to 007:
--    -- ALTER TABLE public.creator_profiles DROP COLUMN IF EXISTS embedding;
--    -- ALTER TABLE public.portfolio_projects DROP COLUMN IF EXISTS embedding;
--
-- 4. CRITICAL SAFETY NOTICE ON EXTENSION ROLLBACK:
--    DO NOT execute `DROP EXTENSION IF EXISTS vector CASCADE;`
--    Dropping the vector extension with CASCADE would destroy any pre-existing or co-existing
--    vector columns and third-party extensions across the database cluster.
-- =============================================================================
