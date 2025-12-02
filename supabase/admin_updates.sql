-- 1. Add country column to users table
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "country" text;

-- 2. Update role check constraint to include 'ADMIN'
-- First, drop the existing constraint if it exists (name might vary, so we try standard names or just add if not exists)
-- Note: Supabase often names it "users_role_check".
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
        ALTER TABLE "public"."users" DROP CONSTRAINT "users_role_check";
    END IF;
END $$;

ALTER TABLE "public"."users" ADD CONSTRAINT "users_role_check" CHECK (role IN ('FAN', 'CREATOR', 'ADMIN'));

-- 3. Create content_reports table
CREATE TABLE IF NOT EXISTS "public"."content_reports" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "reporter_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "post_id" uuid REFERENCES "public"."posts"("id") ON DELETE CASCADE,
    "reason" text NOT NULL,
    "description" text,
    "status" text DEFAULT 'PENDING',
    "created_at" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE "public"."content_reports" ENABLE ROW LEVEL SECURITY;

-- Policies for content_reports
-- Reporters can insert
CREATE POLICY "Users can create reports" ON "public"."content_reports"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

-- Admins can view all reports (assuming we check role in app or via another policy)
-- Ideally, we'd have a function is_admin() but for now we'll allow authenticated to view their own or admins to view all.
-- Simpler approach for MVP: Allow admins to view all.
CREATE POLICY "Admins can view all reports" ON "public"."content_reports"
    FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    );
    
-- Admins can update reports (e.g. status)
CREATE POLICY "Admins can update reports" ON "public"."content_reports"
    FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    );

-- 4. RPC: get_admin_stats
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_revenue numeric;
    total_users int;
    active_users int;
    country_stats json;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Calculate total revenue (sum of successful payments)
    SELECT COALESCE(SUM(amount), 0) INTO total_revenue
    FROM public.payments
    WHERE status = 'SUCCESS';

    -- Total users
    SELECT COUNT(*) INTO total_users FROM public.users;

    -- Active users (e.g. created or updated in last 30 days - simple proxy)
    SELECT COUNT(*) INTO active_users 
    FROM public.users
    WHERE updated_at > (now() - interval '30 days');

    -- Country distribution
    SELECT json_agg(t) INTO country_stats
    FROM (
        SELECT country, COUNT(*) as count
        FROM public.users
        WHERE country IS NOT NULL
        GROUP BY country
        ORDER BY count DESC
    ) t;

    RETURN json_build_object(
        'total_revenue', total_revenue,
        'total_users', total_users,
        'active_users', active_users,
        'country_stats', COALESCE(country_stats, '[]'::json)
    );
END;
$$;

-- 5. RPC: get_admin_reports
CREATE OR REPLACE FUNCTION get_admin_reports()
RETURNS TABLE (
    report_id uuid,
    reason text,
    description text,
    status text,
    created_at timestamptz,
    reporter_name text,
    post_id uuid,
    post_caption text,
    post_media_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        cr.id as report_id,
        cr.reason,
        cr.description,
        cr.status,
        cr.created_at,
        u.display_name as reporter_name,
        p.id as post_id,
        p.caption as post_caption,
        p.media_url as post_media_url
    FROM public.content_reports cr
    LEFT JOIN public.users u ON cr.reporter_id = u.id
    LEFT JOIN public.posts p ON cr.post_id = p.id
    ORDER BY cr.created_at DESC;
END;
$$;
