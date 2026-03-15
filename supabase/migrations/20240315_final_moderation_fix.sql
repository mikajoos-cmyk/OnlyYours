-- SQL Migration: Final Moderation & Visibility Fix
-- Dieses Skript stellt sicher, dass alle Tabellen, Spalten und RLS-Regeln für das Moderationssystem korrekt gesetzt sind.

-- 1. Tabelle 'posts' aktualisieren (Spalten & Defaults)
DO $$ 
BEGIN
    -- moderation_status hinzufügen, falls nicht existent
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'moderation_status') THEN
        ALTER TABLE "public"."posts" ADD COLUMN "moderation_status" text DEFAULT 'ACTIVE';
    END IF;
    
    -- takedown_reason hinzufügen, falls nicht existent
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'takedown_reason') THEN
        ALTER TABLE "public"."posts" ADD COLUMN "takedown_reason" text;
    END IF;
END $$;

-- Standardwert sicherstellen und bestehende NULL-Werte korrigieren
ALTER TABLE "public"."posts" ALTER COLUMN "moderation_status" SET DEFAULT 'ACTIVE';
UPDATE "public"."posts" SET "moderation_status" = 'ACTIVE' WHERE "moderation_status" IS NULL;

-- 2. Tabelle 'users' aktualisieren (Spalten & Defaults)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_suspended') THEN
        ALTER TABLE "public"."users" ADD COLUMN "is_suspended" boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'has_pending_appeal') THEN
        ALTER TABLE "public"."users" ADD COLUMN "has_pending_appeal" boolean DEFAULT false;
    END IF;
END $$;

-- 3. Tabelle 'admin_audit_logs' (DSGVO-Audit-Trail)
CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "admin_user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "action" text NOT NULL,
    "entity_id" text,
    "details" jsonb,
    "created_at" timestamptz DEFAULT now()
);

-- 4. Tabelle 'user_reports' (DSA/DSGVO-Meldungen)
CREATE TABLE IF NOT EXISTS "public"."user_reports" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "reporter_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "reported_id" uuid REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "reason" text NOT NULL,
    "description" text,
    "related_message_id" uuid,
    "related_post_id" uuid REFERENCES "public"."posts"("id") ON DELETE SET NULL,
    "related_comment_id" uuid,
    "status" text DEFAULT 'pending',
    "resolution_reason" text,
    "appeal_status" text,
    "appeal_description" text,
    "appealed_at" timestamptz,
    "created_at" timestamptz DEFAULT now()
);

-- 5. RPC Funktionen aktualisieren (Filter für moderierte Inhalte)

-- 5a. get_recommended_feed aktualisieren
DROP FUNCTION IF EXISTS "public"."get_recommended_feed"(uuid, integer, integer);
CREATE OR REPLACE FUNCTION "public"."get_recommended_feed"("p_user_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) 
RETURNS TABLE("id" "uuid", "creator_id" "uuid", "media_url" "text", "media_type" "public"."media_type", "thumbnail_url" "text", "caption" "text", "hashtags" "text"[], "price" numeric, "tier_id" "uuid", "likes_count" integer, "comments_count" integer, "views_count" integer, "is_published" boolean, "scheduled_for" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "moderation_status" text, "takedown_reason" text, "score" double precision)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_user_interests text[];
  v_implicit_tags text[];
BEGIN
  SELECT COALESCE(interests, ARRAY[]::text[]) INTO v_user_interests FROM users WHERE id = p_user_id;
  v_implicit_tags := get_user_implicit_interests(p_user_id);

  RETURN QUERY
  SELECT 
    p.*,
    (
      (EXTRACT(EPOCH FROM p.created_at) / 100000) +
      (LOG(GREATEST(p.likes_count, 1)) * 2) +
      (SELECT COUNT(*) FROM unnest(p.hashtags) t WHERE t = ANY(v_user_interests)) * 200 +
      (SELECT COUNT(*) FROM unnest(p.hashtags) t WHERE t = ANY(v_implicit_tags)) * 50
    )::float as score
  FROM posts p
  WHERE 
    p.is_published = true 
    AND p.moderation_status = 'ACTIVE' -- NEU: Nur aktive Posts
    AND (p.scheduled_for IS NULL OR p.scheduled_for <= now())
  ORDER BY score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 6. RLS (Row Level Security) - SICHERHEIT & SICHTBARKEIT

-- RLS aktivieren
ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;

-- 6a. POSTS Policies
DROP POLICY IF EXISTS "Users can view published posts they have access to" ON "public"."posts";
DROP POLICY IF EXISTS "Creators can view own posts" ON "public"."posts";
DROP POLICY IF EXISTS "Admins can moderate posts" ON "public"."posts";
DROP POLICY IF EXISTS "Admins can view all posts" ON "public"."posts";
DROP POLICY IF EXISTS "Creators can update own posts" ON "public"."posts";
DROP POLICY IF EXISTS "Users can view published posts" ON "public"."posts";

-- Creator sieht ALLES von sich selbst (auch gesperrte Posts für Widerspruch)
CREATE POLICY "Creators can view own posts" 
  ON "public"."posts" FOR SELECT 
  TO authenticated 
  USING (auth.uid() = creator_id);

-- Creator darf eigene Posts aktualisieren
CREATE POLICY "Creators can update own posts" 
  ON "public"."posts" FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Fans/Public sehen nur Veröffentlichte & NICHT gesperrte Posts
CREATE POLICY "Users can view published posts" 
  ON "public"."posts" FOR SELECT 
  TO authenticated 
  USING (
    is_published = true AND 
    moderation_status = 'ACTIVE' AND 
    (price = 0 OR creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM subscriptions s 
        WHERE s.fan_id = auth.uid() AND s.creator_id = posts.creator_id AND s.status = 'ACTIVE'
    ))
  );

-- Admins dürfen Posts moderieren
CREATE POLICY "Admins can moderate posts" 
  ON "public"."posts" FOR UPDATE 
  TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN');

-- Admins dürfen alle Posts sehen
CREATE POLICY "Admins can view all posts" 
  ON "public"."posts" FOR SELECT 
  TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN');


-- 6b. USERS Policies
DROP POLICY IF EXISTS "Admins can moderate users" ON "public"."users";

CREATE POLICY "Admins can moderate users" 
  ON "public"."users" FOR UPDATE 
  TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN');


-- 6c. USER_REPORTS & AUDIT LOGS Policies
DROP POLICY IF EXISTS "Admins can manage reports" ON "public"."user_reports";
DROP POLICY IF EXISTS "Admins can manage audit logs" ON "public"."admin_audit_logs";
DROP POLICY IF EXISTS "Users can view related reports" ON "public"."user_reports";
DROP POLICY IF EXISTS "Users can create reports" ON "public"."user_reports";

CREATE POLICY "Admins can manage reports" 
  ON "public"."user_reports" FOR ALL 
  TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "Admins can manage audit logs" 
  ON "public"."admin_audit_logs" FOR ALL 
  TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "Users can view related reports" 
  ON "public"."user_reports" FOR SELECT 
  TO authenticated 
  USING (auth.uid() = reporter_id OR auth.uid() = reported_id);

CREATE POLICY "Users can create reports" 
  ON "public"."user_reports" FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = reporter_id);
