-- =============================================================================
-- Migration 004: Protect User PII (Email & Private Data) on public.users
-- =============================================================================
-- SECURITY AUDIT FINDING:
-- In PostgreSQL / Supabase, Row Level Security (RLS) filters rows horizontally,
-- not individual columns vertically. The previous policy "Users: public read for authenticated"
-- used USING (true), which allowed any authenticated user to SELECT emails of all other users.
--
-- REMEDIATION:
-- 1. Restrict public.users SELECT strictly to the authenticated owner (id = auth.uid())
--    or verified administrators (public.is_admin()).
-- 2. Harden public.is_admin() with JWT fast-path checks to prevent circular RLS recursion.
-- 3. Provide public.public_user_profiles (security_invoker = false) to project ONLY
--    safe, non-sensitive profile columns (id, full_name, avatar_url, role, company_name, created_at)
--    without exposing emails to marketplace visitors or authenticated callers.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. HARDEN is_admin() FUNCTION (RECURSION-PROOF & PRIVILEGE ESCALATION PROOF)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT (
        -- 1. Fast-path: Check service_role or server-verified app_metadata claim (zero table queries)
        COALESCE(current_setting('request.jwt.claim.role', true) = 'service_role', false)
        OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
        -- 2. Authoritative database lookup (runs with security definer postgres privileges)
        OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );
$$;

-- -----------------------------------------------------------------------------
-- 2. HARDEN public.users ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------
-- Drop overly permissive horizontal read policies
DROP POLICY IF EXISTS "Users: public read for authenticated" ON public.users;
DROP POLICY IF EXISTS "Users: read own record or admin" ON public.users;
DROP POLICY IF EXISTS "Users: read own profile" ON public.users;
DROP POLICY IF EXISTS "Users: admin read all" ON public.users;

-- Policy A: Ordinary users can ONLY read their own profile row
CREATE POLICY "Users: read own profile"
    ON public.users FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Policy B: Verified administrators can read all user records
CREATE POLICY "Users: admin read all"
    ON public.users FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. CREATE SAFE PUBLIC PROJECTION VIEW (NO PII / NO EMAIL)
-- -----------------------------------------------------------------------------
-- This security-definer view enables public marketplace directory browsing
-- without granting direct horizontal read access to the email column.
CREATE OR REPLACE VIEW public.public_user_profiles
WITH (security_invoker = false) AS
SELECT
    id,
    full_name,
    avatar_url,
    role,
    company_name,
    created_at
FROM public.users;

-- Revoke all write permissions on the projection view
REVOKE ALL ON public.public_user_profiles FROM PUBLIC, anon, authenticated;

-- Grant read-only SELECT permissions to visitors and authenticated users
GRANT SELECT ON public.public_user_profiles TO authenticated, anon;

-- Add descriptive comment documenting security purpose
COMMENT ON VIEW public.public_user_profiles IS 
'Publicly readable projection of public.users excluding email and private credentials. Used for marketplace displays.';

-- =============================================================================
-- ROLLBACK PLAN (IF NEEDED):
-- =============================================================================
-- To cleanly roll back this migration in the Supabase SQL Editor:
--
-- DROP VIEW IF EXISTS public.public_user_profiles;
-- DROP POLICY IF EXISTS "Users: read own profile" ON public.users;
-- DROP POLICY IF EXISTS "Users: admin read all" ON public.users;
-- CREATE POLICY "Users: public read for authenticated"
--     ON public.users FOR SELECT
--     TO authenticated
--     USING (true);
-- =============================================================================
