-- =============================================================================
-- MIGRATION 003: SECURITY HARDENING - SESSION IDENTITY & ROLE FORGERY DEFENSE
-- =============================================================================
-- Objectives:
-- 1. Prevent privilege escalation via client-supplied signup metadata (raw_user_meta_data)
-- 2. Prevent role forgery or self-promotion to admin via direct public.users updates
-- 3. Lock down search_path on all SECURITY DEFINER functions
-- 4. Harden Row Level Security (RLS) UPDATE policies on public.users
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. HARDEN handle_new_auth_user() TRIGGER FUNCTION
-- -----------------------------------------------------------------------------
-- raw_user_meta_data is untrusted client-supplied metadata from supabase.auth.signUp().
-- PRIVILEGE ESCALATION FIX:
-- The privileged 'admin' role can ONLY originate from server-managed raw_app_meta_data,
-- which can only be written by Supabase Admin API / service_role.
-- Any client-supplied raw_user_meta_data requesting 'admin' is strictly downgraded.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    user_role_val public.user_role;
    raw_user_role TEXT;
    raw_app_role TEXT;
    full_name_val TEXT;
    avatar_val TEXT;
    company_val TEXT;
    category_val TEXT;
    raw_slug TEXT;
    assigned_slug TEXT;
BEGIN
    raw_user_role := lower(trim(COALESCE(NEW.raw_user_meta_data->>'role', '')));
    raw_app_role  := lower(trim(COALESCE(NEW.raw_app_meta_data->>'role', '')));

    -- Admin role is strictly restricted to server-controlled raw_app_meta_data
    IF raw_app_role = 'admin' THEN
        user_role_val := 'admin'::public.user_role;
    ELSIF raw_user_role = 'brand' OR raw_app_role = 'brand' THEN
        user_role_val := 'brand'::public.user_role;
    ELSE
        -- Default to creator (downgrading any malicious 'admin' in raw_user_meta_data)
        user_role_val := 'creator'::public.user_role;
    END IF;

    -- Extract full name safely with clean fallback
    full_name_val := COALESCE(
        NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(trim(split_part(NEW.email, '@', 1)), ''),
        'Creator User'
    );

    -- Extract avatar with role-specific default
    avatar_val := COALESCE(
        NULLIF(trim(NEW.raw_user_meta_data->>'avatar_url'), ''),
        NULLIF(trim(NEW.raw_user_meta_data->>'picture'), ''),
        CASE 
            WHEN user_role_val = 'brand' THEN '/images/brand-user.jpg'
            ELSE '/images/anjali.jpg'
        END
    );

    company_val := NULLIF(trim(NEW.raw_user_meta_data->>'company_name'), '');
    category_val := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'category'), ''), 'Beauty & Skincare');

    -- Insert into public.users
    INSERT INTO public.users (
        id,
        email,
        role,
        full_name,
        avatar_url,
        company_name,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        user_role_val,
        full_name_val,
        avatar_val,
        company_val,
        COALESCE(NEW.created_at, timezone('utc'::text, now())),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN public.users.full_name IS NULL OR public.users.full_name = 'Creator User' 
            THEN EXCLUDED.full_name 
            ELSE public.users.full_name 
        END,
        avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
        company_name = COALESCE(public.users.company_name, EXCLUDED.company_name),
        updated_at = timezone('utc'::text, now());

    -- Automatically provision creator_profile if creator/influencer
    IF user_role_val = 'creator' THEN
        raw_slug := lower(regexp_replace(full_name_val, '[^a-zA-Z0-9]+', '-', 'g'));
        raw_slug := trim(both '-' from raw_slug);
        IF raw_slug = '' THEN
            raw_slug := 'creator';
        END IF;

        assigned_slug := raw_slug || '-' || substr(NEW.id::text, 1, 8);

        INSERT INTO public.creator_profiles (
            user_id,
            name,
            slug,
            category,
            bio,
            experience_years,
            hourly_rate,
            availability,
            is_verified,
            passport_score,
            client_rating,
            total_reviews,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            full_name_val,
            assigned_slug,
            category_val,
            'AI-specialized digital content creator.',
            1,
            5000.00,
            'available',
            false,
            50.0,
            5.00,
            0,
            timezone('utc'::text, now()),
            timezone('utc'::text, now())
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_auth_user error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$;

-- Ensure trigger is bound to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 2. PREVENT ROLE TAMPERING AND PRIVILEGE ESCALATION ON public.users
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_user_role_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    -- Prevent altering primary key
    IF NEW.id <> OLD.id THEN
        RAISE EXCEPTION 'Modifying user ID is not permitted.';
    END IF;

    -- Prevent self-promotion or role tampering
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Only service_role or verified existing admin can change roles
        IF current_setting('request.jwt.claim.role', true) <> 'service_role' AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Privilege escalation blocked: Changing user role is forbidden.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_role ON public.users;
CREATE TRIGGER trg_protect_user_role
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_user_role_immutability();

-- -----------------------------------------------------------------------------
-- 3. HARDEN RLS UPDATE POLICY ON public.users
-- -----------------------------------------------------------------------------
-- Users can update only their own profile details, but can NEVER self-promote to admin

DROP POLICY IF EXISTS "Users: update own profile" ON public.users;
CREATE POLICY "Users: update own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND (role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) OR public.is_admin())
    );

-- -----------------------------------------------------------------------------
-- 4. HARDEN SECURITY DEFINER FUNCTIONS WITH SEARCH_PATH
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_creator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'creator'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_brand()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'brand'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_current_creator_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT id FROM public.creator_profiles WHERE user_id = auth.uid();
$$;
