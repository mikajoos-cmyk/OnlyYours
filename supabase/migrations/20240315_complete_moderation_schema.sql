-- 1. admin_audit_logs erstellen (DSGVO-Konformität)
CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "admin_user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "action" text NOT NULL,
    "entity_id" text, -- Kann Message-ID, Post-ID etc. sein
    "details" jsonb,
    "created_at" timestamptz DEFAULT now()
);

-- RLS für admin_audit_logs
ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage audit logs' AND tablename = 'admin_audit_logs') THEN
        CREATE POLICY "Admins can manage audit logs" ON "public"."admin_audit_logs"
            FOR ALL TO authenticated
            USING (
                EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
            );
    END IF;
END $$;

-- 2. moderation_status zu posts hinzufügen (falls nicht existent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'moderation_status') THEN
        ALTER TABLE "public"."posts" ADD COLUMN "moderation_status" text DEFAULT 'ACTIVE';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'takedown_reason') THEN
        ALTER TABLE "public"."posts" ADD COLUMN "takedown_reason" text;
    END IF;
END $$;

-- 3. is_suspended zu users hinzufügen (falls nicht existent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_suspended') THEN
        ALTER TABLE "public"."users" ADD COLUMN "is_suspended" boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'has_pending_appeal') THEN
        ALTER TABLE "public"."users" ADD COLUMN "has_pending_appeal" boolean DEFAULT false;
    END IF;
END $$;

-- 4. user_reports Tabelle sicherstellen (DSGVO/DSA-Erweiterungen)
CREATE TABLE IF NOT EXISTS "public"."user_reports" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "reporter_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "reported_id" uuid REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "reason" text NOT NULL,
    "created_at" timestamptz DEFAULT now()
);

-- Spalten einzeln sicherstellen, falls die Tabelle schon existiert (DSA-Konformität)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reports' AND column_name = 'description') THEN
        ALTER TABLE "public"."user_reports" ADD COLUMN "description" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reports' AND column_name = 'related_message_id') THEN
        ALTER TABLE "public"."user_reports" ADD COLUMN "related_message_id" uuid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reports' AND column_name = 'related_post_id') THEN
        ALTER TABLE "public"."user_reports" ADD COLUMN "related_post_id" uuid REFERENCES "public"."posts"("id") ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reports' AND column_name = 'related_comment_id') THEN
        ALTER TABLE "public"."user_reports" ADD COLUMN "related_comment_id" uuid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reports' AND column_name = 'status') THEN
        ALTER TABLE "public"."user_reports" ADD COLUMN "status" text DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reports' AND column_name = 'resolution_reason') THEN
        ALTER TABLE "public"."user_reports" ADD COLUMN "resolution_reason" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reports' AND column_name = 'appeal_status') THEN
        ALTER TABLE "public"."user_reports" ADD COLUMN "appeal_status" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reports' AND column_name = 'appeal_description') THEN
        ALTER TABLE "public"."user_reports" ADD COLUMN "appeal_description" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reports' AND column_name = 'appealed_at') THEN
        ALTER TABLE "public"."user_reports" ADD COLUMN "appealed_at" timestamptz;
    END IF;
END $$;

-- RLS für user_reports (Falls neu angelegt)
ALTER TABLE "public"."user_reports" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create user_reports' AND tablename = 'user_reports') THEN
        CREATE POLICY "Users can create user_reports" ON "public"."user_reports"
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = reporter_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all user_reports' AND tablename = 'user_reports') THEN
        CREATE POLICY "Admins can view all user_reports" ON "public"."user_reports"
            FOR SELECT TO authenticated
            USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update user_reports' AND tablename = 'user_reports') THEN
        CREATE POLICY "Admins can update user_reports" ON "public"."user_reports"
            FOR UPDATE TO authenticated
            USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'));
    END IF;
END $$;
