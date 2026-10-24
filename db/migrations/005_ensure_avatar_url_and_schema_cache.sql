-- =============================================================================
-- Migration 005: Ensure avatar_url column, view consistency, and schema cache
-- =============================================================================
-- Description:
-- 1. Idempotently adds avatar_url TEXT to public.users if missing.
-- 2. Refreshes public.public_user_profiles view to ensure avatar_url is projected
--    alongside safe public fields (id, full_name, avatar_url, role, company_name, created_at)
--    without exposing sensitive PII (email, auth credentials).
-- 3. Re-asserts restrictive permissions: read-only SELECT for authenticated/anon.
-- 4. Notifies PostgREST to reload its schema cache.
-- =============================================================================

-- 1. Ensure avatar_url column exists on public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Add descriptive documentation on the column
COMMENT ON COLUMN public.users.avatar_url IS 
'Public avatar image URL for creator or brand profile display.';

-- 3. Re-assert safe public projection view (preserving security_invoker = false and no email exposure)
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

-- 4. Re-assert access permissions on the projection view
REVOKE ALL ON public.public_user_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_user_profiles TO authenticated, anon;

-- 5. Add descriptive comment on the view
COMMENT ON VIEW public.public_user_profiles IS 
'Publicly readable projection of public.users including avatar_url, excluding email and private credentials.';

-- 6. Force PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
