-- Migration: Ensure moderated posts are unreachable
-- This migration updates RLS policies to hide posts with moderation_status = 'TAKEDOWN'

-- 1. Update general viewing policy
DROP POLICY IF EXISTS "Users can view published posts they have access to" ON "public"."posts";

CREATE POLICY "Users can view published posts they have access to"
ON "public"."posts"
FOR SELECT
TO authenticated
USING (
    is_published = true AND
    (moderation_status IS DISTINCT FROM 'TAKEDOWN') AND
    (
      price = 0 OR
      EXISTS (
        SELECT 1 FROM "public"."subscriptions" s
        WHERE s.fan_id = auth.uid()
        AND s.creator_id = "public"."posts".creator_id
        AND s.status = 'ACTIVE'
        AND ("public"."posts".tier_id IS NULL OR s.tier_id = "public"."posts".tier_id)
      ) OR
      creator_id = auth.uid()
    )
);

-- 2. Ensure Admins can see everything including moderated content
DROP POLICY IF EXISTS "Admins can view all posts" ON "public"."posts";
CREATE POLICY "Admins can view all posts"
ON "public"."posts"
FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM "public"."users" WHERE id = auth.uid() AND role = 'ADMIN')
);

-- 3. Creators can always see their own posts (already exists, but we make it explicit for clarity)
-- Note: Policy "Creators can view own posts" already exists from initial schema.
-- It will allow creators to see their TAKEDOWN posts in the Vault.
