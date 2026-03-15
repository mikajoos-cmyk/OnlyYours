-- Migration: Switch Admin Reports to user_reports table
-- This migration updates the get_admin_reports function to use the user_reports table

CREATE TABLE IF NOT EXISTS "public"."user_reports" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "reporter_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "reported_id" uuid REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "reason" text NOT NULL,
    "description" text,
    "related_message_id" uuid,
    "related_post_id" uuid REFERENCES "public"."posts"("id") ON DELETE SET NULL,
    "related_comment_id" uuid,
    "status" text DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
    "resolution_reason" text,
    "appeal_status" text, -- NULL, 'pending', 'accepted', 'rejected'
    "appeal_description" text,
    "appealed_at" timestamptz,
    "created_at" timestamptz DEFAULT now()
);

-- Enable RLS for user_reports if not already enabled
ALTER TABLE "public"."user_reports" ENABLE ROW LEVEL SECURITY;

-- Policies for user_reports
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create user_reports' AND tablename = 'user_reports') THEN
        CREATE POLICY "Users can create user_reports" ON "public"."user_reports"
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = reporter_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own reports' AND tablename = 'user_reports') THEN
        CREATE POLICY "Users can view their own reports" ON "public"."user_reports"
            FOR SELECT TO authenticated
            USING (auth.uid() = reporter_id OR auth.uid() = reported_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all user_reports' AND tablename = 'user_reports') THEN
        CREATE POLICY "Admins can view all user_reports" ON "public"."user_reports"
            FOR SELECT TO authenticated
            USING (
                (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update user_reports' AND tablename = 'user_reports') THEN
        CREATE POLICY "Admins can update user_reports" ON "public"."user_reports"
            FOR UPDATE TO authenticated
            USING (
                (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
            );
    END IF;
END $$;

-- Update get_admin_reports RPC to use user_reports
DROP FUNCTION IF EXISTS get_admin_reports();

CREATE OR REPLACE FUNCTION get_admin_reports()
RETURNS TABLE (
    report_id uuid,
    reason text,
    description text,
    status text,
    created_at timestamptz,
    reporter_name text,
    reported_user_id uuid,
    reported_user_name text,
    reported_username text,
    post_id uuid,
    post_caption text,
    post_media_url text,
    post_media_type text,
    message_id uuid,
    comment_id uuid,
    appeal_status text,
    appeal_description text,
    appealed_at timestamptz,
    conversation_id text -- Added for chat context
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
        ur.id as report_id,
        ur.reason,
        ur.description,
        ur.status,
        ur.created_at,
        u_reporter.display_name as reporter_name,
        ur.reported_id as reported_user_id,
        u_reported.display_name as reported_user_name,
        u_reported.username as reported_username,
        ur.related_post_id as post_id,
        p.caption as post_caption,
        p.media_url as post_media_url,
        p.media_type::text as post_media_type,
        ur.related_message_id as message_id,
        ur.related_comment_id as comment_id,
        ur.appeal_status,
        ur.appeal_description,
        ur.appealed_at,
        -- Derive conversation_id for messages
        CASE 
            WHEN ur.related_message_id IS NOT NULL THEN
                (SELECT 
                    CASE 
                        WHEN m.sender_id < m.receiver_id THEN m.sender_id || ':' || m.receiver_id
                        ELSE m.receiver_id || ':' || m.sender_id
                    END
                 FROM public.messages m WHERE m.id = ur.related_message_id)
            ELSE NULL
        END as conversation_id
    FROM public.user_reports ur
    LEFT JOIN public.users u_reporter ON ur.reporter_id = u_reporter.id
    LEFT JOIN public.users u_reported ON ur.reported_id = u_reported.id
    LEFT JOIN public.posts p ON ur.related_post_id = p.id
    ORDER BY ur.created_at DESC;
END;
$$;
