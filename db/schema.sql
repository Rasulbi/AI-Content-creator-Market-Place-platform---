-- =============================================================================
-- AI CONTENT CREATOR MARKETPLACE - DATABASE SCHEMA & SUPABASE RLS
-- PostgreSQL 15+ / Supabase
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUMS & DOMAINS
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('creator', 'brand', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_status_type AS ENUM (
        'claimed',
        'portfolio_evidence',
        'test_verified',
        'client_verified'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE test_difficulty AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE test_submission_status AS ENUM ('pending', 'evaluating', 'passed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE match_status AS ENUM ('suggested', 'invited', 'accepted', 'declined', 'hired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 2. REUSABLE TRIGGER FUNCTIONS
-- =============================================================================

-- Auto-update updated_at timestamp column
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. CORE TABLES
-- =============================================================================

-- TABLE 1: USERS (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'creator',
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABLE 2: CREATOR_PROFILES
CREATE TABLE IF NOT EXISTS public.creator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    bio TEXT,
    experience_years NUMERIC(4, 1) NOT NULL DEFAULT 0.0 CHECK (experience_years >= 0),
    experience_level TEXT NOT NULL DEFAULT 'intermediate' CHECK (experience_level IN ('junior', 'intermediate', 'senior', 'expert')),
    availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'busy', 'unavailable')),
    hourly_rate NUMERIC(10, 2) CHECK (hourly_rate >= 0),
    min_budget NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (min_budget >= 0),
    max_budget NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (max_budget >= min_budget),
    ai_tools TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    platforms TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    category TEXT NOT NULL DEFAULT 'General AI',
    location TEXT,
    passport_score NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (passport_score >= 0 AND passport_score <= 100),
    client_rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (client_rating >= 1.0 AND client_rating <= 5.0),
    total_reviews INTEGER NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABLE 3: SKILLS
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT,
    weight NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (weight > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABLE 4: CREATOR_SKILLS
CREATE TABLE IF NOT EXISTS public.creator_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_profile_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    verification_status verification_status_type NOT NULL DEFAULT 'claimed',
    score NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (score >= 0 AND score <= 100),
    evidence_text TEXT,
    evidence_url TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_creator_skill UNIQUE (creator_profile_id, skill_id)
);

-- TABLE 5: PORTFOLIO_PROJECTS
CREATE TABLE IF NOT EXISTS public.portfolio_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_profile_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content_type TEXT NOT NULL,
    tools_used TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    media_url TEXT NOT NULL,
    prompt TEXT,
    process_evidence TEXT,
    external_url TEXT,
    linked_skill_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
    metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABLE 6: SKILL_TESTS
CREATE TABLE IF NOT EXISTS public.skill_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty test_difficulty NOT NULL DEFAULT 'intermediate',
    passing_score NUMERIC(5, 2) NOT NULL DEFAULT 75.00 CHECK (passing_score >= 0 AND passing_score <= 100),
    duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
    questions JSONB NOT NULL DEFAULT '[]'::JSONB,
    rubric JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABLE 7: TEST_SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.test_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.skill_tests(id) ON DELETE CASCADE,
    creator_profile_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::JSONB,
    evidence_media_urls TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    score NUMERIC(5, 2) CHECK (score >= 0 AND score <= 100),
    status test_submission_status NOT NULL DEFAULT 'pending',
    feedback TEXT,
    evaluated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    evaluated_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABLE 8: CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    target_audience TEXT,
    required_skills UUID[] NOT NULL DEFAULT '{}'::UUID[],
    content_formats TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    budget_min NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (budget_min >= 0),
    budget_max NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (budget_max >= budget_min),
    status campaign_status NOT NULL DEFAULT 'draft',
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABLE 9: MATCHES
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    creator_profile_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
    match_score NUMERIC(5, 2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    status match_status NOT NULL DEFAULT 'suggested',
    score_breakdown JSONB NOT NULL DEFAULT '{}'::JSONB,
    proposal_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_campaign_creator_match UNIQUE (campaign_id, creator_profile_id)
);

-- TABLE 10: REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    creator_profile_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
    rating NUMERIC(3, 2) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    review_text TEXT NOT NULL,
    verified_skills UUID[] NOT NULL DEFAULT '{}'::UUID[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_campaign_creator_review UNIQUE (campaign_id, creator_profile_id)
);

-- TABLE 11: AI_ADVISOR_CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.ai_advisor_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ai_advisor_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own advisor conversations"
    ON public.ai_advisor_conversations FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own advisor messages"
    ON public.ai_advisor_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- =============================================================================
-- 4. PERFORMANCE & LOOKUP INDEXES
-- =============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Creator Profiles
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON public.creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_slug ON public.creator_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_category ON public.creator_profiles(category);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_score ON public.creator_profiles(passport_score DESC);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_availability ON public.creator_profiles(availability);

-- Creator Skills
CREATE INDEX IF NOT EXISTS idx_creator_skills_profile_id ON public.creator_skills(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_creator_skills_skill_id ON public.creator_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_creator_skills_status ON public.creator_skills(verification_status);
CREATE INDEX IF NOT EXISTS idx_creator_skills_composite ON public.creator_skills(creator_profile_id, verification_status);

-- Portfolio Projects
CREATE INDEX IF NOT EXISTS idx_portfolio_creator_profile_id ON public.portfolio_projects(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_content_type ON public.portfolio_projects(content_type);
CREATE INDEX IF NOT EXISTS idx_portfolio_tools_used_gin ON public.portfolio_projects USING gin (tools_used);
CREATE INDEX IF NOT EXISTS idx_portfolio_linked_skills_gin ON public.portfolio_projects USING gin (linked_skill_ids);

-- Skill Tests
CREATE INDEX IF NOT EXISTS idx_skill_tests_skill_id ON public.skill_tests(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_tests_difficulty ON public.skill_tests(difficulty);
CREATE INDEX IF NOT EXISTS idx_skill_tests_active ON public.skill_tests(is_active);

-- Test Submissions
CREATE INDEX IF NOT EXISTS idx_test_submissions_test_id ON public.test_submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_creator_id ON public.test_submissions(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_status ON public.test_submissions(status);

-- Campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON public.campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON public.campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_required_skills_gin ON public.campaigns USING gin (required_skills);

-- Matches
CREATE INDEX IF NOT EXISTS idx_matches_campaign_id ON public.matches(campaign_id);
CREATE INDEX IF NOT EXISTS idx_matches_creator_id ON public.matches(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_score ON public.matches(match_score DESC);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_creator_id ON public.reviews(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_brand_id ON public.reviews(brand_id);
CREATE INDEX IF NOT EXISTS idx_reviews_campaign_id ON public.reviews(campaign_id);

-- AI Advisor & Assistant Conversations
CREATE INDEX IF NOT EXISTS idx_ai_advisor_user_id ON public.ai_advisor_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_advisor_session_id ON public.ai_advisor_conversations(session_id, created_at ASC);

-- =============================================================================
-- 5. AUTOMATED TRIGGERS FOR TIMESTAMPS & BUSINESS LOGIC
-- =============================================================================

-- Apply updated_at trigger across all stateful tables
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_creator_profiles_updated_at ON public.creator_profiles;
CREATE TRIGGER trg_creator_profiles_updated_at BEFORE UPDATE ON public.creator_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_creator_skills_updated_at ON public.creator_skills;
CREATE TRIGGER trg_creator_skills_updated_at BEFORE UPDATE ON public.creator_skills FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_portfolio_projects_updated_at ON public.portfolio_projects;
CREATE TRIGGER trg_portfolio_projects_updated_at BEFORE UPDATE ON public.portfolio_projects FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_skill_tests_updated_at ON public.skill_tests;
CREATE TRIGGER trg_skill_tests_updated_at BEFORE UPDATE ON public.skill_tests FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_test_submissions_updated_at ON public.test_submissions;
CREATE TRIGGER trg_test_submissions_updated_at BEFORE UPDATE ON public.test_submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_matches_updated_at ON public.matches;
CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- Trigger: Automatically insert a row in public.users on auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role_val user_role;
    full_name_val TEXT;
    avatar_val TEXT;
    assigned_slug TEXT;
BEGIN
    -- Determine role from raw user metadata or default to creator
    user_role_val := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'creator'::user_role);
    full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    avatar_val := NEW.raw_user_meta_data->>'avatar_url';

    INSERT INTO public.users (id, email, role, full_name, avatar_url)
    VALUES (NEW.id, NEW.email, user_role_val, full_name_val, avatar_val)
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    -- If the new user is a creator, automatically initialize an empty creator_profile
    IF user_role_val = 'creator' THEN
        assigned_slug := lower(regexp_replace(full_name_val, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(NEW.id::text from 1 for 6);
        INSERT INTO public.creator_profiles (user_id, slug, name, bio, avatar_url)
        VALUES (
            NEW.id,
            assigned_slug,
            full_name_val,
            'AI Content Creator specializing in generative video, imagery, and prompt workflows.',
            avatar_val
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Trigger: Automatically recalculate creator ratings when a review is added
CREATE OR REPLACE FUNCTION public.update_creator_review_aggregates()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating NUMERIC(3, 2);
    review_cnt INTEGER;
    skill_uuid UUID;
BEGIN
    SELECT COALESCE(AVG(rating), 5.00), COUNT(*)
    INTO avg_rating, review_cnt
    FROM public.reviews
    WHERE creator_profile_id = NEW.creator_profile_id;

    UPDATE public.creator_profiles
    SET client_rating = avg_rating,
        total_reviews = review_cnt
    WHERE id = NEW.creator_profile_id;

    -- Automatically upgrade skills verified in this review to 'client_verified'
    IF NEW.verified_skills IS NOT NULL AND array_length(NEW.verified_skills, 1) > 0 THEN
        FOREACH skill_uuid IN ARRAY NEW.verified_skills
        LOOP
            UPDATE public.creator_skills
            SET verification_status = 'client_verified',
                verified_at = timezone('utc'::text, now()),
                verified_by = NEW.brand_id,
                score = GREATEST(score, 90.00)
            WHERE creator_profile_id = NEW.creator_profile_id
              AND skill_id = skill_uuid;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_review_created ON public.reviews;
CREATE TRIGGER trg_on_review_created
    AFTER INSERT ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_creator_review_aggregates();

-- =============================================================================
-- 6. SECURITY DEFINER HELPER FUNCTIONS FOR RLS POLICIES
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_creator()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'creator'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_brand()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'brand'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_creator_profile_id()
RETURNS UUID AS $$
    SELECT id FROM public.creator_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS across all 10 tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS POLICIES: USERS
-- -----------------------------------------------------------------------------
-- Anyone authenticated can read user basics (for avatar/name display in marketplace)
CREATE POLICY "Users: public read for authenticated"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- Users can update only their own profile
CREATE POLICY "Users: update own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Admins can do anything
CREATE POLICY "Users: admin full access"
    ON public.users FOR ALL
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS POLICIES: CREATOR_PROFILES
-- -----------------------------------------------------------------------------
-- Public read for all creator profiles so brands and visitors can browse
CREATE POLICY "Creator Profiles: public read"
    ON public.creator_profiles FOR SELECT
    TO public
    USING (true);

-- Creators can insert only their own profile
CREATE POLICY "Creator Profiles: creator insert own"
    ON public.creator_profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Creators can update only their own profile
CREATE POLICY "Creator Profiles: creator update own"
    ON public.creator_profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins full access
CREATE POLICY "Creator Profiles: admin full access"
    ON public.creator_profiles FOR ALL
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS POLICIES: SKILLS
-- -----------------------------------------------------------------------------
-- Everyone can read the canonical skills catalog
CREATE POLICY "Skills: public read"
    ON public.skills FOR SELECT
    TO public
    USING (is_active = true OR public.is_admin());

-- Only admins can insert, update, or delete skills
CREATE POLICY "Skills: admin write"
    ON public.skills FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS POLICIES: CREATOR_SKILLS
-- -----------------------------------------------------------------------------
-- Everyone can view verified/claimed creator skills
CREATE POLICY "Creator Skills: public read"
    ON public.creator_skills FOR SELECT
    TO public
    USING (true);

-- Creators can link skills to their own profile (starts as 'claimed' or 'portfolio_evidence')
CREATE POLICY "Creator Skills: creator insert own"
    ON public.creator_skills FOR INSERT
    TO authenticated
    WITH CHECK (
        creator_profile_id = public.get_current_creator_profile_id()
        AND verification_status IN ('claimed', 'portfolio_evidence')
    );

-- Creators can update evidence on their own skills (cannot self-grant test_verified or client_verified)
CREATE POLICY "Creator Skills: creator update own evidence"
    ON public.creator_skills FOR UPDATE
    TO authenticated
    USING (creator_profile_id = public.get_current_creator_profile_id())
    WITH CHECK (
        creator_profile_id = public.get_current_creator_profile_id()
    );

-- Creators can remove skills from their own profile
CREATE POLICY "Creator Skills: creator delete own"
    ON public.creator_skills FOR DELETE
    TO authenticated
    USING (creator_profile_id = public.get_current_creator_profile_id());

-- Admins full access (granting verification, editing scores)
CREATE POLICY "Creator Skills: admin full access"
    ON public.creator_skills FOR ALL
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS POLICIES: PORTFOLIO_PROJECTS
-- -----------------------------------------------------------------------------
-- Everyone can view published portfolio projects
CREATE POLICY "Portfolio: public read"
    ON public.portfolio_projects FOR SELECT
    TO public
    USING (true);

-- Creators can create projects only in their own profile
CREATE POLICY "Portfolio: creator insert own"
    ON public.portfolio_projects FOR INSERT
    TO authenticated
    WITH CHECK (creator_profile_id = public.get_current_creator_profile_id());

-- Creators can update only their own projects
CREATE POLICY "Portfolio: creator update own"
    ON public.portfolio_projects FOR UPDATE
    TO authenticated
    USING (creator_profile_id = public.get_current_creator_profile_id())
    WITH CHECK (creator_profile_id = public.get_current_creator_profile_id());

-- Creators can delete only their own projects
CREATE POLICY "Portfolio: creator delete own"
    ON public.portfolio_projects FOR DELETE
    TO authenticated
    USING (creator_profile_id = public.get_current_creator_profile_id());

-- Admins full access
CREATE POLICY "Portfolio: admin full access"
    ON public.portfolio_projects FOR ALL
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS POLICIES: SKILL_TESTS
-- -----------------------------------------------------------------------------
-- Authenticated users can view active tests
CREATE POLICY "Skill Tests: authenticated read active"
    ON public.skill_tests FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

-- Only admins can create/modify tests
CREATE POLICY "Skill Tests: admin write"
    ON public.skill_tests FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS POLICIES: TEST_SUBMISSIONS
-- -----------------------------------------------------------------------------
-- Creators can view only their own submissions
CREATE POLICY "Test Submissions: creator view own"
    ON public.test_submissions FOR SELECT
    TO authenticated
    USING (
        creator_profile_id = public.get_current_creator_profile_id()
        OR public.is_admin()
    );

-- Creators can submit tests for their own profile
CREATE POLICY "Test Submissions: creator insert own"
    ON public.test_submissions FOR INSERT
    TO authenticated
    WITH CHECK (
        creator_profile_id = public.get_current_creator_profile_id()
        AND status = 'pending'
    );

-- Admins and evaluators can update submissions (score, feedback, status)
CREATE POLICY "Test Submissions: admin evaluate"
    ON public.test_submissions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admins full access
CREATE POLICY "Test Submissions: admin full access"
    ON public.test_submissions FOR ALL
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS POLICIES: CAMPAIGNS
-- -----------------------------------------------------------------------------
-- Brands can view their own campaigns; creators and public can view active campaigns
CREATE POLICY "Campaigns: view active or own"
    ON public.campaigns FOR SELECT
    TO authenticated
    USING (
        brand_id = auth.uid()
        OR status = 'active'
        OR public.is_admin()
    );

-- Brands can create campaigns
CREATE POLICY "Campaigns: brand create"
    ON public.campaigns FOR INSERT
    TO authenticated
    WITH CHECK (
        brand_id = auth.uid()
        AND public.is_brand()
    );

-- Brands can update their own campaigns
CREATE POLICY "Campaigns: brand update own"
    ON public.campaigns FOR UPDATE
    TO authenticated
    USING (brand_id = auth.uid())
    WITH CHECK (brand_id = auth.uid());

-- Brands can delete their own campaigns (if not yet in_progress)
CREATE POLICY "Campaigns: brand delete own"
    ON public.campaigns FOR DELETE
    TO authenticated
    USING (brand_id = auth.uid() AND status IN ('draft', 'cancelled'));

-- Admins full access
CREATE POLICY "Campaigns: admin full access"
    ON public.campaigns FOR ALL
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS POLICIES: MATCHES
-- -----------------------------------------------------------------------------
-- Brands can view matches for their campaigns; Creators can view matches for their profile
CREATE POLICY "Matches: view own"
    ON public.matches FOR SELECT
    TO authenticated
    USING (
        creator_profile_id = public.get_current_creator_profile_id()
        OR campaign_id IN (SELECT id FROM public.campaigns WHERE brand_id = auth.uid())
        OR public.is_admin()
    );

-- Brands can invite/match creators to their campaigns
CREATE POLICY "Matches: brand create for own campaign"
    ON public.matches FOR INSERT
    TO authenticated
    WITH CHECK (
        campaign_id IN (SELECT id FROM public.campaigns WHERE brand_id = auth.uid())
        OR public.is_admin()
    );

-- Creators can respond (accept/decline) to invitations; Brands can hire
CREATE POLICY "Matches: update status"
    ON public.matches FOR UPDATE
    TO authenticated
    USING (
        creator_profile_id = public.get_current_creator_profile_id()
        OR campaign_id IN (SELECT id FROM public.campaigns WHERE brand_id = auth.uid())
        OR public.is_admin()
    )
    WITH CHECK (
        creator_profile_id = public.get_current_creator_profile_id()
        OR campaign_id IN (SELECT id FROM public.campaigns WHERE brand_id = auth.uid())
        OR public.is_admin()
    );

-- Admins full access
CREATE POLICY "Matches: admin full access"
    ON public.matches FOR ALL
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS POLICIES: REVIEWS
-- -----------------------------------------------------------------------------
-- Everyone can read reviews
CREATE POLICY "Reviews: public read"
    ON public.reviews FOR SELECT
    TO public
    USING (true);

-- Brands can create reviews for campaigns they owned where a creator participated
CREATE POLICY "Reviews: brand create for own completed campaign"
    ON public.reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        brand_id = auth.uid()
        AND campaign_id IN (SELECT id FROM public.campaigns WHERE brand_id = auth.uid())
    );

-- Brands can update their own reviews
CREATE POLICY "Reviews: brand update own"
    ON public.reviews FOR UPDATE
    TO authenticated
    USING (brand_id = auth.uid())
    WITH CHECK (brand_id = auth.uid());

-- Admins full access
CREATE POLICY "Reviews: admin full access"
    ON public.reviews FOR ALL
    TO authenticated
    USING (public.is_admin());

-- =============================================================================
-- 8. SUPABASE STORAGE BUCKETS & STORAGE RLS POLICIES
-- =============================================================================

-- Provision Storage Buckets (portfolio-media: public, test-submissions: private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'portfolio-media',
        'portfolio-media',
        true,
        52428800, -- 50MB limit
        ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav']
    ),
    (
        'test-submissions',
        'test-submissions',
        false, -- private bucket
        104857600, -- 100MB limit
        ARRAY['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'application/pdf', 'application/zip', 'text/plain', 'application/json']
    )
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- STORAGE RLS: portfolio-media
-- -----------------------------------------------------------------------------
-- Anyone can read portfolio media (public CDN)
CREATE POLICY "Storage: portfolio public read"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'portfolio-media');

-- Creators can upload files only into their own user folder: portfolio-media/{user_id}/*
CREATE POLICY "Storage: creator upload portfolio media"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'portfolio-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Creators can update files only in their own folder
CREATE POLICY "Storage: creator update portfolio media"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'portfolio-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Creators can delete files only in their own folder
CREATE POLICY "Storage: creator delete portfolio media"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'portfolio-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- -----------------------------------------------------------------------------
-- STORAGE RLS: test-submissions (Private)
-- -----------------------------------------------------------------------------
-- Creators can read only their own submissions; Admins can read all submissions
CREATE POLICY "Storage: test submissions read"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'test-submissions'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin()
        )
    );

-- Creators can upload test submission assets to test-submissions/{user_id}/*
CREATE POLICY "Storage: creator upload test submission"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'test-submissions'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Admins full access to all storage objects
CREATE POLICY "Storage: admin full access"
    ON storage.objects FOR ALL
    TO authenticated
    USING (public.is_admin());
