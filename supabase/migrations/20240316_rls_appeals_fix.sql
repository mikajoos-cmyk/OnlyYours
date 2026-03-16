-- SQL Migration: RLS for Appeals
-- Erlaubt es Nutzern, gegen sie gerichtete Berichte anzufechten

-- 1. Erlaube Nutzern das Aktualisieren von appeal-bezogenen Feldern in user_reports
DROP POLICY IF EXISTS "Users can appeal their own reports" ON "public"."user_reports";
CREATE POLICY "Users can appeal their own reports" 
  ON "public"."user_reports" FOR UPDATE
  TO authenticated
  USING (auth.uid() = reported_id AND status = 'resolved' AND appeal_status IS NULL)
  WITH CHECK (auth.uid() = reported_id AND status = 'resolved');

-- 2. Erlaube Nutzern das Aktualisieren des has_pending_appeal Flags im eigenen Profil
-- Die bestehende Policy "Users can update own profile" deckt das eigentlich schon ab,
-- aber wir stellen sicher, dass es keine Konflikte gibt.
-- (Policy "Users can update own profile" existiert bereits in supabase_schema.sql)
