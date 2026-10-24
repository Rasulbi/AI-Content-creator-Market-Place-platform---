-- =============================================================================
-- Migration: 001_create_saved_content_and_verifications.sql
-- Description: Adds tables for AI Content Studio saved items and brand verification audits
-- =============================================================================

-- TABLE 1: SAVED_AI_CONTENT
CREATE TABLE IF NOT EXISTS public.saved_ai_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    concept TEXT NOT NULL,
    hook TEXT NOT NULL,
    caption TEXT NOT NULL,
    hashtags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    call_to_action TEXT NOT NULL,
    video_script_outline JSONB DEFAULT '[]'::JSONB,
    niche TEXT NOT NULL DEFAULT 'General',
    platform TEXT NOT NULL DEFAULT 'Instagram Reels',
    content_goal TEXT,
    is_favorite BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.saved_ai_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own saved AI content"
    ON public.saved_ai_content FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved AI content"
    ON public.saved_ai_content FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved AI content"
    ON public.saved_ai_content FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved AI content"
    ON public.saved_ai_content FOR DELETE
    USING (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_saved_ai_content_user_id ON public.saved_ai_content(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_ai_content_platform ON public.saved_ai_content(platform);

-- Timestamp Trigger
DROP TRIGGER IF EXISTS trg_saved_ai_content_updated_at ON public.saved_ai_content;
CREATE TRIGGER trg_saved_ai_content_updated_at
    BEFORE UPDATE ON public.saved_ai_content
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- =============================================================================
-- TABLE 2: CAMPAIGN_VERIFICATIONS (AI Creator Verification Audit History)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.campaign_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'Instagram',
    target_audience TEXT,
    budget TEXT,
    deadline TEXT,
    verifications_count INTEGER NOT NULL DEFAULT 0,
    verifications_data JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.campaign_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Brands can view own creator verification audits"
    ON public.campaign_verifications FOR SELECT
    USING (auth.uid() = brand_id);

CREATE POLICY "Brands can insert own creator verification audits"
    ON public.campaign_verifications FOR INSERT
    WITH CHECK (auth.uid() = brand_id);

CREATE POLICY "Brands can delete own creator verification audits"
    ON public.campaign_verifications FOR DELETE
    USING (auth.uid() = brand_id);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_verifications_brand_id ON public.campaign_verifications(brand_id, created_at DESC);

-- Timestamp Trigger
DROP TRIGGER IF EXISTS trg_campaign_verifications_updated_at ON public.campaign_verifications;
CREATE TRIGGER trg_campaign_verifications_updated_at
    BEFORE UPDATE ON public.campaign_verifications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
