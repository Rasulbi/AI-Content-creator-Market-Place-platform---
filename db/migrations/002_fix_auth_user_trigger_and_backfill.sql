-- =============================================================================
-- Migration: 002_fix_auth_user_trigger_and_backfill.sql
-- Description: Fixes auth.users trigger to eliminate schema mismatch (avatar_url),
--              handles role mapping ('influencer' -> 'creator'), sets search_path,
--              adds graceful exception handling, and creates idempotent backfill.
-- =============================================================================

-- 1. Ensure user_role enum contains required types
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('creator', 'brand', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Robust handle_new_auth_user() function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    user_role_val public.user_role;
    raw_role_text TEXT;
    full_name_val TEXT;
    avatar_val TEXT;
    company_val TEXT;
    category_val TEXT;
    raw_slug TEXT;
    assigned_slug TEXT;
BEGIN
    -- Safely parse and normalize role (handles 'influencer', 'creator', 'brand', etc.)
    raw_role_text := lower(trim(COALESCE(
        NEW.raw_user_meta_data->>'role',
        NEW.raw_app_meta_data->>'role',
        'creator'
    )));

    IF raw_role_text IN ('influencer', 'creator') THEN
        user_role_val := 'creator'::public.user_role;
    ELSIF raw_role_text = 'brand' THEN
        user_role_val := 'brand'::public.user_role;
    ELSIF raw_role_text = 'admin' THEN
        user_role_val := 'admin'::public.user_role;
    ELSE
        user_role_val := 'creator'::public.user_role;
    END IF;

    -- Extract full name with clean fallback
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
        COALESCE(NEW.email, NEW.id::text || '@placeholder.email'),
        user_role_val,
        full_name_val,
        avatar_val,
        company_val,
        COALESCE(NEW.created_at, timezone('utc'::text, now())),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        company_name = COALESCE(EXCLUDED.company_name, public.users.company_name),
        updated_at = timezone('utc'::text, now());

    -- If creator, insert into public.creator_profiles (WITHOUT avatar_url column)
    IF user_role_val = 'creator' THEN
        raw_slug := lower(regexp_replace(full_name_val, '[^a-zA-Z0-9]+', '-', 'g'));
        raw_slug := trim(both '-' from raw_slug);
        IF raw_slug = '' OR raw_slug IS NULL THEN
            raw_slug := 'creator';
        END IF;
        assigned_slug := raw_slug || '-' || substring(replace(NEW.id::text, '-', '') from 1 for 8);

        INSERT INTO public.creator_profiles (
            user_id,
            slug,
            name,
            bio,
            category,
            experience_years,
            experience_level,
            availability,
            hourly_rate,
            min_budget,
            max_budget,
            ai_tools,
            platforms,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            assigned_slug,
            full_name_val,
            'AI Content Creator specializing in generative video, imagery, and prompt workflows.',
            category_val,
            1.0,
            'intermediate',
            'available',
            3500.00,
            15000.00,
            50000.00,
            ARRAY['Midjourney v6', 'Runway Gen-3', 'CapCut Pro']::TEXT[],
            ARRAY['Instagram Reels', 'YouTube Shorts']::TEXT[],
            COALESCE(NEW.created_at, timezone('utc'::text, now())),
            timezone('utc'::text, now())
        )
        ON CONFLICT (user_id) DO UPDATE
        SET name = COALESCE(NULLIF(EXCLUDED.name, ''), public.creator_profiles.name),
            updated_at = timezone('utc'::text, now());
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_auth_user error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$;

-- 3. Re-attach trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. Ensure RLS Policy allows authenticated users to insert own profile as fallback
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users: insert own profile'
    ) THEN
        CREATE POLICY "Users: insert own profile"
            ON public.users FOR INSERT
            TO authenticated
            WITH CHECK (id = auth.uid());
    END IF;
END $$;

-- 5. Safe Idempotent Backfill Procedure for Existing Accounts
CREATE OR REPLACE FUNCTION public.backfill_missing_profiles()
RETURNS TABLE (
    auth_id UUID,
    email TEXT,
    role public.user_role,
    profile_created BOOLEAN,
    creator_profile_created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    r RECORD;
    user_role_val public.user_role;
    raw_role_text TEXT;
    full_name_val TEXT;
    avatar_val TEXT;
    company_val TEXT;
    category_val TEXT;
    raw_slug TEXT;
    assigned_slug TEXT;
    u_created BOOLEAN;
    cp_created BOOLEAN;
BEGIN
    FOR r IN
        SELECT
            a.id,
            a.email,
            a.raw_user_meta_data,
            a.raw_app_meta_data,
            a.created_at
        FROM auth.users a
        LEFT JOIN public.users u ON u.id = a.id
        WHERE u.id IS NULL
    LOOP
        u_created := false;
        cp_created := false;

        raw_role_text := lower(trim(COALESCE(
            r.raw_user_meta_data->>'role',
            r.raw_app_meta_data->>'role',
            'creator'
        )));

        IF raw_role_text IN ('influencer', 'creator') THEN
            user_role_val := 'creator'::public.user_role;
        ELSIF raw_role_text = 'brand' THEN
            user_role_val := 'brand'::public.user_role;
        ELSIF raw_role_text = 'admin' THEN
            user_role_val := 'admin'::public.user_role;
        ELSE
            user_role_val := 'creator'::public.user_role;
        END IF;

        full_name_val := COALESCE(
            NULLIF(trim(r.raw_user_meta_data->>'full_name'), ''),
            NULLIF(trim(r.raw_user_meta_data->>'name'), ''),
            NULLIF(trim(split_part(r.email, '@', 1)), ''),
            'Creator User'
        );

        avatar_val := COALESCE(
            NULLIF(trim(r.raw_user_meta_data->>'avatar_url'), ''),
            NULLIF(trim(r.raw_user_meta_data->>'picture'), ''),
            CASE WHEN user_role_val = 'brand' THEN '/images/brand-user.jpg' ELSE '/images/anjali.jpg' END
        );

        company_val := NULLIF(trim(r.raw_user_meta_data->>'company_name'), '');
        category_val := COALESCE(NULLIF(trim(r.raw_user_meta_data->>'category'), ''), 'Beauty & Skincare');

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
            r.id,
            COALESCE(r.email, r.id::text || '@placeholder.email'),
            user_role_val,
            full_name_val,
            avatar_val,
            company_val,
            COALESCE(r.created_at, timezone('utc'::text, now())),
            timezone('utc'::text, now())
        )
        ON CONFLICT (id) DO NOTHING;
        u_created := true;

        IF user_role_val = 'creator' THEN
            raw_slug := lower(regexp_replace(full_name_val, '[^a-zA-Z0-9]+', '-', 'g'));
            raw_slug := trim(both '-' from raw_slug);
            IF raw_slug = '' OR raw_slug IS NULL THEN
                raw_slug := 'creator';
            END IF;
            assigned_slug := raw_slug || '-' || substring(replace(r.id::text, '-', '') from 1 for 8);

            INSERT INTO public.creator_profiles (
                user_id,
                slug,
                name,
                bio,
                category,
                experience_years,
                experience_level,
                availability
            )
            VALUES (
                r.id,
                assigned_slug,
                full_name_val,
                'AI Content Creator specializing in generative video, imagery, and prompt workflows.',
                category_val,
                1.0,
                'intermediate',
                'available'
            )
            ON CONFLICT (user_id) DO NOTHING;
            cp_created := true;
        END IF;

        auth_id := r.id;
        email := r.email;
        role := user_role_val;
        profile_created := u_created;
        creator_profile_created := cp_created;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- 6. Immediately execute backfill for any existing users
SELECT * FROM public.backfill_missing_profiles();
