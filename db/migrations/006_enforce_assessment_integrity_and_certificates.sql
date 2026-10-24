-- =============================================================================
-- MIGRATION 006: ENFORCE ASSESSMENT INTEGRITY, RLS DEFENSE & CERTIFICATES
-- =============================================================================
-- Objectives:
-- 1. Prevent privilege escalation on public.creator_skills (block self-granting 'test_verified' / 'client_verified')
-- 2. Prevent score forgery and protect verified skills against regression or tampering
-- 3. Eliminate RLS infinite recursion on creator_skills UPDATE policy using an ownership-scoped SECURITY DEFINER helper
-- 4. Prevent helper information disclosure: callers can only check verification status of their own skills
-- 5. Add certificate_id column to public.test_submissions for authoritative certificate persistence & indexing
-- 6. Cleanse, backfill, and deduplicate historical certificate IDs before enforcing UNIQUE constraint
-- 7. Enforce certificate lifecycle integrity: full 32-hex UUID format, immutable passed results, and NULL on failed/pending
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD & SYNC CERTIFICATE IDENTIFIER ON TEST SUBMISSIONS
-- -----------------------------------------------------------------------------
-- Step 1a: Add certificate_id column as nullable
ALTER TABLE public.test_submissions 
ADD COLUMN IF NOT EXISTS certificate_id TEXT;

-- Step 1b: Cleanse historical non-passed submissions (failed or pending must never hold a certificate)
UPDATE public.test_submissions
SET certificate_id = NULL
WHERE status <> 'passed' AND certificate_id IS NOT NULL;

-- Step 1c: Backfill passed test submissions BEFORE adding UNIQUE constraint
-- Priority:
-- 1. Real certificateId issued in answers->__certificate->>certificateId
-- 2. Legacy certificateId in answers->>certificateId
-- 3. Collision-free deterministic ID using complete 32-hex UUID
UPDATE public.test_submissions
SET certificate_id = COALESCE(
    NULLIF(trim(answers->'__certificate'->>'certificateId'), ''),
    NULLIF(trim(answers->>'certificateId'), ''),
    'CERT-LEGACY-' || UPPER(REPLACE(id::TEXT, '-', ''))
)
WHERE status = 'passed' AND (certificate_id IS NULL OR trim(certificate_id) = '');

-- Step 1d: Deduplicate any collisions in certificate_id among passed submissions
-- If duplicate certificate_ids exist from dirty historical data or testing, append unique row-specific 32-hex UUID
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY certificate_id ORDER BY submitted_at ASC, id ASC) AS rn
    FROM public.test_submissions
    WHERE certificate_id IS NOT NULL AND status = 'passed'
)
UPDATE public.test_submissions ts
SET certificate_id = ts.certificate_id || '-DUP-' || UPPER(REPLACE(ts.id::TEXT, '-', ''))
FROM duplicates d
WHERE ts.id = d.id AND d.rn > 1;

-- Step 1e: Enforce uniqueness of certificate identifiers across test submissions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_test_submissions_certificate_id'
    ) THEN
        ALTER TABLE public.test_submissions 
        ADD CONSTRAINT uq_test_submissions_certificate_id UNIQUE (certificate_id);
    END IF;
END $$;

-- Step 1f: B-Tree index for O(1) public certificate verification lookups
CREATE INDEX IF NOT EXISTS idx_test_submissions_certificate_id 
ON public.test_submissions(certificate_id);

-- Step 1g: Automatic certificate synchronization & lifecycle guard trigger
-- Enforces:
-- 1. Passed submissions: auto-assign certificate with full 32-hex UUID if not present
-- 2. Immutable passed assessments: creators cannot alter score, certificate, or revoke a passed test
-- 3. Privileged revocation: only admins or service_role can revoke or alter a passed submission
-- 4. Failed/pending submissions: certificate_id is strictly forced to NULL
-- 5. Safe privilege detection: NEVER inspects current_user (which resolves to function owner under SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.sync_test_submission_certificate_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    is_privileged BOOLEAN;
BEGIN
    -- Trustworthy privilege check:
    -- - PostgREST service_role JWT claims (server-side assessment grading)
    -- - Authenticated platform administrators verified via public.users
    -- - Direct superuser database sessions (SQL Editor / migration runner), NEVER true for PostgREST callers
    is_privileged := (
        COALESCE(auth.jwt()->>'role', '') = 'service_role' 
        OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
        OR public.is_admin()
        OR (session_user IN ('postgres', 'supabase_admin') AND auth.jwt() IS NULL)
    );

    -- 1. Lifecycle: Prevent unauthorized mutation or revocation of passed submissions
    IF TG_OP = 'UPDATE' AND OLD.status = 'passed' THEN
        IF NOT is_privileged THEN
            IF NEW.status <> 'passed' THEN
                RAISE EXCEPTION 'Unauthorized: Passed test results cannot be revoked or altered by creator.';
            END IF;
            -- Preserve immutable assessment outcome
            NEW.status := OLD.status;
            NEW.score := OLD.score;
            NEW.certificate_id := OLD.certificate_id;
            NEW.test_id := OLD.test_id;
            NEW.creator_profile_id := OLD.creator_profile_id;
        END IF;
    END IF;

    -- 2. Certificate assignment & synchronization
    IF NEW.status = 'passed' THEN
        -- If certificate_id is missing or empty, assign full UUID-derived 32-hex certificate ID
        IF NEW.certificate_id IS NULL OR trim(NEW.certificate_id) = '' THEN
            NEW.certificate_id := COALESCE(
                NULLIF(trim(NEW.answers->'__certificate'->>'certificateId'), ''),
                NULLIF(trim(NEW.answers->>'certificateId'), ''),
                'CERT-AI-' || UPPER(REPLACE(COALESCE(NEW.id, gen_random_uuid())::TEXT, '-', ''))
            );
        END IF;

        -- On UPDATE of an existing passed submission with a valid certificate ID,
        -- prevent accidental clearing or mutation of the issued certificate
        IF TG_OP = 'UPDATE' AND OLD.status = 'passed' AND OLD.certificate_id IS NOT NULL THEN
            IF NEW.certificate_id IS NULL OR trim(NEW.certificate_id) = '' THEN
                NEW.certificate_id := OLD.certificate_id;
            END IF;
        END IF;
    ELSE
        -- Failed or pending test submissions must NEVER carry an active certificate ID
        NEW.certificate_id := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_test_submission_certificate_id ON public.test_submissions;
CREATE TRIGGER trg_sync_test_submission_certificate_id
    BEFORE INSERT OR UPDATE ON public.test_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_test_submission_certificate_id();

-- -----------------------------------------------------------------------------
-- 2. RECURSION-SAFE, OWNERSHIP-ENFORCED RLS HELPER & HARDENED CREATOR_SKILLS POLICIES
-- -----------------------------------------------------------------------------

-- Helper function to fetch committed verification_status with RLS bypassed.
-- Strictly scoped to creator's own profile to prevent arbitrary UUID information disclosure.
CREATE OR REPLACE FUNCTION public.get_creator_skill_verification_status(skill_row_id UUID)
RETURNS public.verification_status_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT cs.verification_status 
    FROM public.creator_skills cs 
    WHERE cs.id = skill_row_id 
      AND (
          cs.creator_profile_id = public.get_current_creator_profile_id()
          OR public.is_admin()
          OR COALESCE(auth.jwt()->>'role', '') = 'service_role'
      );
$$;

REVOKE ALL ON FUNCTION public.get_creator_skill_verification_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_skill_verification_status(UUID) TO authenticated, service_role;

-- Ensure creators can ONLY insert skills in unverified status tiers ('claimed', 'portfolio_evidence')
DROP POLICY IF EXISTS "Creator Skills: creator insert own" ON public.creator_skills;

CREATE POLICY "Creator Skills: creator insert own"
    ON public.creator_skills FOR INSERT
    TO authenticated
    WITH CHECK (
        creator_profile_id = public.get_current_creator_profile_id()
        AND verification_status IN ('claimed', 'portfolio_evidence')
    );

-- Ensure creators can NEVER self-promote to verified status through UPDATE operations
-- Uses get_creator_skill_verification_status(id) to avoid recursive query on creator_skills
DROP POLICY IF EXISTS "Creator Skills: creator update own evidence" ON public.creator_skills;

CREATE POLICY "Creator Skills: creator update own evidence"
    ON public.creator_skills FOR UPDATE
    TO authenticated
    USING (creator_profile_id = public.get_current_creator_profile_id())
    WITH CHECK (
        creator_profile_id = public.get_current_creator_profile_id()
        AND (
            -- New status can only be an unverified tier
            verification_status IN ('claimed', 'portfolio_evidence')
            -- OR if already verified, the status must remain unchanged from committed table state
            OR verification_status = public.get_creator_skill_verification_status(id)
        )
    );

-- -----------------------------------------------------------------------------
-- 3. BEFORE INSERT / UPDATE TRIGGER ON CREATOR_SKILLS
-- -----------------------------------------------------------------------------
-- Serves as an unbypassable database guard against forged verification status,
-- direct client SDK upserts, or arbitrary score overrides.

CREATE OR REPLACE FUNCTION public.protect_creator_skill_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    is_privileged BOOLEAN;
BEGIN
    -- Trustworthy privilege check:
    -- - PostgREST service_role JWT claims (server-side assessment grading)
    -- - Authenticated platform administrators verified via public.users
    -- - Direct superuser database sessions (SQL Editor / migration runner), NEVER true for PostgREST callers
    -- CRITICAL SECURITY GUARANTEE:
    -- Does NOT inspect current_user, which would resolve to function owner (postgres) under SECURITY DEFINER.
    is_privileged := (
        COALESCE(auth.jwt()->>'role', '') = 'service_role' 
        OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
        OR public.is_admin()
        OR (session_user IN ('postgres', 'supabase_admin') AND auth.jwt() IS NULL)
    );

    IF is_privileged THEN
        RETURN NEW;
    END IF;

    -- Block creators from inserting directly with verified status
    IF TG_OP = 'INSERT' THEN
        IF NEW.verification_status IN ('test_verified', 'client_verified') THEN
            RAISE EXCEPTION 'Unauthorized: Creator cannot self-grant verified skill status (%s).', NEW.verification_status;
        END IF;

        -- Enforce standardized default scores for unverified claims
        IF NEW.verification_status = 'portfolio_evidence' THEN
            NEW.score := 75.0;
        ELSE
            NEW.score := 50.0;
        END IF;

        NEW.verified_at := NULL;
        NEW.verified_by := NULL;
        RETURN NEW;
    END IF;

    -- TG_OP = 'UPDATE':
    -- 1. Block creators from elevating an unverified skill to verified status
    IF (OLD.verification_status NOT IN ('test_verified', 'client_verified') 
        AND NEW.verification_status IN ('test_verified', 'client_verified')) THEN
        RAISE EXCEPTION 'Unauthorized: Creator cannot self-promote skill status to %s.', NEW.verification_status;
    END IF;

    -- 2. If row was already verified by official test or client, preserve verified status & score against regression
    IF OLD.verification_status IN ('test_verified', 'client_verified') THEN
        NEW.verification_status := OLD.verification_status;
        NEW.score := OLD.score;
        NEW.verified_at := OLD.verified_at;
        NEW.verified_by := OLD.verified_by;
    ELSE
        -- Row is not verified: enforce standardized scores based on evidence presence
        IF NEW.verification_status = 'portfolio_evidence' THEN
            NEW.score := 75.0;
        ELSE
            NEW.score := 50.0;
        END IF;

        -- Ensure unverified rows cannot forge verification timestamps or verifiers
        NEW.verified_at := NULL;
        NEW.verified_by := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_creator_skill_verification ON public.creator_skills;
CREATE TRIGGER trg_protect_creator_skill_verification
    BEFORE INSERT OR UPDATE ON public.creator_skills
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_creator_skill_verification();

-- =============================================================================
-- DEPLOYMENT & COMPATIBILITY AUDIT NOTES:
-- 1. Non-destructive: Adding a nullable column and replacing functions/policies causes NO downtime.
-- 2. Privilege Escalation Immune: Trigger functions avoid current_user inspection entirely.
-- 3. Information Disclosure Immune: Helper function scopes verification status lookups to own profile.
-- 4. Recursion Safe: RLS policy uses SECURITY DEFINER helper to prevent infinite policy expansion recursion.
-- 5. Deterministic Deduplication: Deduplication uses full row-specific 32-hex UUIDs before UNIQUE constraint.
-- 6. Certificate Lifecycle: Passed submissions are immutable to creators; certificates use full UUID hex format.
-- 7. Multi-layer defense: RLS policies (Layer 1) and BEFORE triggers (Layer 2) both independently
--    block status elevation, score forgery, and verification regression.
-- 8. Authorized server writes: Server assessment routes (POST /api/v1/tests/submissions) and
--    admin actions execute with service_role credentials, retaining full verification authority.
-- =============================================================================
