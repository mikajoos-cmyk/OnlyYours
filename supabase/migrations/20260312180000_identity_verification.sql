-- Create Enum for identity verification status
DO $$ BEGIN
    CREATE TYPE "public"."identity_verification_status" AS ENUM (
        'none',
        'pending',
        'verified',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns to users table
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "identity_verification_status" "public"."identity_verification_status" DEFAULT 'none';
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "external_verification_id" text;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "real_name" text;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "address_street" text;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "address_city" text;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "address_zip" text;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "address_country" text;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "birthdate" date;

-- Update get_admin_users RPC
DROP FUNCTION IF EXISTS "public"."get_admin_users"(text);
DROP FUNCTION IF EXISTS "public"."get_admin_users"(text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION "public"."get_admin_users"("search_query" "text", "filter_role" "text", "filter_country" "text", "sort_by" "text", "sort_desc" boolean) RETURNS TABLE("id" "uuid", "username" "text", "display_name" "text", "email" "text", "role" "public"."user_role", "country" "text", "birthdate" "date", "is_banned" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "last_seen" timestamp with time zone, "total_earnings" numeric, "total_spent" numeric, "identity_verification_status" "public"."identity_verification_status", "external_verification_id" text, "real_name" text, "address_street" text, "address_city" text, "address_zip" text, "address_country" text)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Sicherheitscheck
  IF auth.role() != 'service_role' AND NOT EXISTS (
      SELECT 1 FROM public.users AS u_check 
      WHERE u_check.id = auth.uid() AND u_check.role = 'ADMIN'
  ) THEN
      RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.display_name,
    au.email::text,
    u.role,
    u.country,
    u.birthdate,
    u.is_banned,
    u.created_at,
    u.updated_at,
    u.last_seen,
    u.total_earnings,
    COALESCE((
        SELECT SUM(amount) 
        FROM public.payments p 
        WHERE p.user_id = u.id AND p.status = 'SUCCESS'
    ), 0) as total_spent,
    u.identity_verification_status,
    u.external_verification_id,
    u.real_name,
    u.address_street,
    u.address_city,
    u.address_zip,
    u.address_country
  FROM public.users u
  LEFT JOIN auth.users au ON u.id = au.id
  WHERE 
    (search_query = '' OR u.username ILIKE '%' || search_query || '%' OR u.display_name ILIKE '%' || search_query || '%' OR au.email ILIKE '%' || search_query || '%')
    AND (filter_role = 'ALL' OR u.role::text = filter_role)
    AND (filter_country = 'ALL' OR u.country = filter_country)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_desc THEN u.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND NOT sort_desc THEN u.created_at END ASC,
    CASE WHEN sort_by = 'earnings' AND sort_desc THEN u.total_earnings END DESC,
    CASE WHEN sort_by = 'earnings' AND NOT sort_desc THEN u.total_earnings END ASC,
    CASE WHEN sort_by = 'spent' AND sort_desc THEN 12 END DESC,
    CASE WHEN sort_by = 'spent' AND NOT sort_desc THEN 12 END ASC
  LIMIT 100;
END;
$$;
