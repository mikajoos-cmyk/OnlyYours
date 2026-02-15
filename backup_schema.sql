


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."media_type" AS ENUM (
    'IMAGE',
    'VIDEO'
);


ALTER TYPE "public"."media_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED',
    'REFUNDED'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_type" AS ENUM (
    'SUBSCRIPTION',
    'TIP',
    'PAY_PER_VIEW',
    'PRODUCT'
);


ALTER TYPE "public"."payment_type" OWNER TO "postgres";


CREATE TYPE "public"."payout_status" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);


ALTER TYPE "public"."payout_status" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'ACTIVE',
    'CANCELED',
    'EXPIRED'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'FAN',
    'CREATOR',
    'ADMIN'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_email_exists"("email_to_check" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = email_to_check
  );
END;
$$;


ALTER FUNCTION "public"."check_email_exists"("email_to_check" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_username_exists"("username_to_check" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE username = username_to_check
  );
END;
$$;


ALTER FUNCTION "public"."check_username_exists"("username_to_check" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_live_chat_and_go_offline"("creator_id_input" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- 1. Prüfen, ob der aufrufende Benutzer der Creator ist
  IF auth.uid() != creator_id_input THEN
    RAISE EXCEPTION 'Fehlende Berechtigung: Sie können nur Ihren eigenen Stream-Chat löschen.';
  END IF;

  -- 2. Alle Chat-Nachrichten für diesen Creator löschen
  DELETE FROM public.live_chat_messages
  WHERE creator_id = creator_id_input;

  -- 3. Den Live-Status des Creators zurücksetzen
  UPDATE public.users
  SET is_live = false
  WHERE id = creator_id_input;

END;
$$;


ALTER FUNCTION "public"."clear_live_chat_and_go_offline"("creator_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_comments_count"("post_id_input" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = GREATEST(0, comments_count - 1)
  WHERE id = post_id_input;
END;
$$;


ALTER FUNCTION "public"."decrement_comments_count"("post_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_likes_count"("post_id_input" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = GREATEST(0, likes_count - 1) -- Verhindert negative Zähler
  WHERE id = post_id_input;
END;
$$;


ALTER FUNCTION "public"."decrement_likes_count"("post_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_chat_message"("message_id_input" "uuid", "creator_id_input" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Sicherheitsprüfung: Nur der Creator darf löschen
  IF auth.uid() != creator_id_input THEN
    RAISE EXCEPTION 'Nur der Streamer kann Nachrichten löschen.';
  END IF;

  DELETE FROM public.live_chat_messages
  WHERE id = message_id_input AND creator_id = creator_id_input;
END;
$$;


ALTER FUNCTION "public"."delete_chat_message"("message_id_input" "uuid", "creator_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    total_revenue numeric;
    total_users int;
    active_users int;
    daily_revenue json;
    user_growth json;
BEGIN
    -- Check Admin Access
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN') THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- KPIs
    SELECT COALESCE(SUM(amount), 0) INTO total_revenue FROM public.payments WHERE status = 'SUCCESS';
    SELECT COUNT(*) INTO total_users FROM public.users;
    SELECT COUNT(*) INTO active_users FROM public.users WHERE updated_at > (now() - interval '30 days');

    -- Chart Data: Umsatz letzte 30 Tage
    SELECT json_agg(t) INTO daily_revenue FROM (
        SELECT date_trunc('day', created_at)::date as date, SUM(amount) as value
        FROM public.payments
        WHERE status = 'SUCCESS' AND created_at > (now() - interval '30 days')
        GROUP BY date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at)
    ) t;

    -- Chart Data: Neue User letzte 30 Tage
    SELECT json_agg(t) INTO user_growth FROM (
        SELECT date_trunc('day', created_at)::date as date, COUNT(*) as value
        FROM public.users
        WHERE created_at > (now() - interval '30 days')
        GROUP BY date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at)
    ) t;

    RETURN json_build_object(
        'total_revenue', total_revenue,
        'total_users', total_users,
        'active_users', active_users,
        'revenue_chart', COALESCE(daily_revenue, '[]'::json),
        'user_chart', COALESCE(user_growth, '[]'::json)
    );
END;
$$;


ALTER FUNCTION "public"."get_admin_dashboard_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_stats"("time_range" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    total_revenue numeric;
    total_users int;
    active_users int;
    revenue_chart json;
    user_chart json;
    country_stats json;
    interval_val interval;
BEGIN
    -- Sicherheitscheck
    IF auth.role() != 'service_role' AND NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Zeitraum bestimmen
    CASE time_range
        WHEN '7d' THEN interval_val := '7 days'::interval;
        WHEN '30d' THEN interval_val := '30 days'::interval;
        WHEN '3m' THEN interval_val := '3 months'::interval;
        WHEN '6m' THEN interval_val := '6 months'::interval;
        WHEN '1y' THEN interval_val := '1 year'::interval;
        ELSE interval_val := '30 days'::interval;
    END CASE;

    -- 1. Gesamtumsatz im Zeitraum
    SELECT COALESCE(SUM(amount), 0) INTO total_revenue
    FROM public.payments
    WHERE status = 'SUCCESS'
    AND created_at >= (now() - interval_val);

    -- 2. Gesamtnutzer (Absolut)
    SELECT COUNT(*) INTO total_users FROM public.users;

    -- 3. FIX: Aktive Nutzer basierend auf 'last_seen' im gewählten Zeitraum
    SELECT COUNT(*) INTO active_users 
    FROM public.users
    WHERE last_seen >= (now() - interval_val);

    -- 4. Charts generieren (Täglich gruppiert)
    SELECT json_agg(t) INTO revenue_chart FROM (
        SELECT date_trunc('day', created_at)::text as date, SUM(amount) as value
        FROM public.payments
        WHERE status = 'SUCCESS' AND created_at >= (now() - interval_val)
        GROUP BY 1 ORDER BY 1
    ) t;

    SELECT json_agg(t) INTO user_chart FROM (
        SELECT date_trunc('day', created_at)::text as date, COUNT(*) as value
        FROM public.users
        WHERE created_at >= (now() - interval_val)
        GROUP BY 1 ORDER BY 1
    ) t;

    -- 5. Länderstatistik
    SELECT json_agg(t) INTO country_stats FROM (
        SELECT country as name, COUNT(*) as value
        FROM public.users
        WHERE country IS NOT NULL
        GROUP BY country
        ORDER BY value DESC
        LIMIT 10
    ) t;

    RETURN json_build_object(
        'total_revenue', total_revenue,
        'total_users', total_users,
        'active_users', active_users, -- Das ist jetzt korrekt
        'revenue_chart', COALESCE(revenue_chart, '[]'::json),
        'user_chart', COALESCE(user_chart, '[]'::json),
        'country_stats', COALESCE(country_stats, '[]'::json)
    );
END;
$$;


ALTER FUNCTION "public"."get_admin_dashboard_stats"("time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_reports"() RETURNS TABLE("report_id" "uuid", "reason" "text", "description" "text", "status" "text", "created_at" timestamp with time zone, "reporter_name" "text", "post_id" "uuid", "post_caption" "text", "post_media_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'ADMIN'::user_role
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


ALTER FUNCTION "public"."get_admin_reports"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    total_revenue numeric;
    total_users int;
    active_users int;
    country_stats json;
BEGIN
    -- Check if user is admin
    -- We cast 'ADMIN'::user_role to ensure type safety
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'ADMIN'::user_role
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Calculate total revenue (sum of successful payments)
    SELECT COALESCE(SUM(amount), 0) INTO total_revenue
    FROM public.payments
    WHERE status = 'SUCCESS';

    -- Total users
    SELECT COUNT(*) INTO total_users FROM public.users;

    -- Active users (e.g. created or updated in last 30 days)
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


ALTER FUNCTION "public"."get_admin_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_users"("search_query" "text" DEFAULT ''::"text") RETURNS TABLE("id" "uuid", "username" "text", "display_name" "text", "email" "text", "role" "public"."user_role", "created_at" timestamp with time zone, "total_earnings" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Sicherheitsprüfung: Nur Admins
    IF NOT EXISTS (
        SELECT 1 
        FROM public.users AS au 
        WHERE au.id = auth.uid() 
        AND au.role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        u.id, 
        u.username, 
        u.display_name, 
        -- E-Mail Platzhalter (echte E-Mail ist in auth.users)
        'hidden@email.com'::text as email, 
        u.role, 
        u.created_at, 
        -- FIX: Wir geben 0 zurück, da die echte Spalte 'bytea' (verschlüsselt) ist.
        -- Dies behebt den Typ-Konflikt (bytea vs numeric).
        0::numeric as total_earnings 
    FROM public.users u
    WHERE 
        search_query = '' OR 
        u.username ILIKE '%' || search_query || '%' OR 
        u.display_name ILIKE '%' || search_query || '%'
    ORDER BY u.created_at DESC
    LIMIT 50;
END;
$$;


ALTER FUNCTION "public"."get_admin_users"("search_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_users"("search_query" "text", "filter_role" "text", "filter_country" "text", "sort_by" "text", "sort_desc" boolean) RETURNS TABLE("id" "uuid", "username" "text", "display_name" "text", "email" "text", "role" "public"."user_role", "country" "text", "birthdate" "date", "is_banned" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "last_seen" timestamp with time zone, "total_earnings" numeric, "total_spent" numeric)
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
    au.email::text, -- FIX: Expliziter Cast zu text behebt den Fehler 42804
    u.role,
    u.country,
    u.birthdate,
    u.is_banned,
    u.created_at,
    u.updated_at,
    u.last_seen,
    u.total_earnings,
    -- Berechnete Ausgaben
    COALESCE((
        SELECT SUM(amount) 
        FROM public.payments p 
        WHERE p.user_id = u.id AND p.status = 'SUCCESS'
    ), 0) as total_spent
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


ALTER FUNCTION "public"."get_admin_users"("search_query" "text", "filter_role" "text", "filter_country" "text", "sort_by" "text", "sort_desc" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_app_key"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- ÄNDERE DIESEN WERT für Production!
  RETURN 'super-secret-encryption-key-change-this-immediately';
END;
$$;


ALTER FUNCTION "public"."get_app_key"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."subscription_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "benefits" "jsonb" DEFAULT '[]'::"jsonb",
    "position" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscription_tiers_price_check" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."subscription_tiers" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_creator_tiers"("p_creator_id" "uuid") RETURNS SETOF "public"."subscription_tiers"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.subscription_tiers
  WHERE creator_id = p_creator_id
  ORDER BY position;
END;
$$;


ALTER FUNCTION "public"."get_creator_tiers"("p_creator_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_encryption_key"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN 'DEIN_SUPER_GEHEIMES_PASSWORT_HIER';
END;
$$;


ALTER FUNCTION "public"."get_encryption_key"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_revenue"("creator_id_input" "uuid", "period_input" "text" DEFAULT '6m'::"text") RETURNS TABLE("month_abbr" "text", "total_revenue" numeric, "sort_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  start_date timestamptz;
  interval_val interval;
  -- Creator Share Konstante (0.8 = 80%)
  v_share decimal := 0.8;
BEGIN
  -- Zeitraum bestimmen
  CASE period_input
    WHEN '7d' THEN interval_val := '7 days'::interval;
    WHEN '30d' THEN interval_val := '30 days'::interval;
    WHEN '3m' THEN interval_val := '3 months'::interval;
    WHEN '6m' THEN interval_val := '6 months'::interval;
    WHEN '1y' THEN interval_val := '1 year'::interval;
    ELSE interval_val := '100 years'::interval; -- 'all'
  END CASE;

  start_date := now() - interval_val;

  RETURN QUERY
  SELECT
    -- Datumsformatierung
    to_char(created_at, CASE WHEN period_input IN ('7d', '30d') THEN 'DD.MM' ELSE 'Mon' END) as month_abbr,
    
    -- KORREKTUR: Summe mit Share multiplizieren
    COALESCE(SUM(amount), 0) * v_share as total_revenue,
    
    -- Sortierung
    date_trunc(CASE WHEN period_input IN ('7d', '30d') THEN 'day' ELSE 'month' END, created_at)::date as sort_date
  FROM payments
  WHERE creator_id = creator_id_input
    AND status = 'SUCCESS'
    AND created_at >= start_date
  GROUP BY sort_date, month_abbr
  ORDER BY sort_date ASC;
END;
$$;


ALTER FUNCTION "public"."get_monthly_revenue"("creator_id_input" "uuid", "period_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_subscriber_growth"("creator_id_input" "uuid", "period_input" "text" DEFAULT '6m'::"text") RETURNS TABLE("month_abbr" "text", "new_subscribers" bigint, "sort_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_start_date timestamptz;
  interval_val interval;
BEGIN
  -- Zeitraum bestimmen
  CASE period_input
    WHEN '7d' THEN interval_val := '7 days'::interval;
    WHEN '30d' THEN interval_val := '30 days'::interval;
    WHEN '3m' THEN interval_val := '3 months'::interval;
    WHEN '6m' THEN interval_val := '6 months'::interval;
    WHEN '1y' THEN interval_val := '1 year'::interval;
    ELSE interval_val := '100 years'::interval;
  END CASE;

  v_start_date := now() - interval_val;

  RETURN QUERY
  SELECT
    to_char(created_at, CASE WHEN period_input IN ('7d', '30d') THEN 'DD.MM' ELSE 'Mon' END) as month_abbr,
    COUNT(*) as new_subscribers,
    date_trunc(CASE WHEN period_input IN ('7d', '30d') THEN 'day' ELSE 'month' END, created_at)::date as sort_date
  FROM public.subscriptions -- FIX: Explizit 'public.' davor
  WHERE creator_id = creator_id_input
    AND created_at >= v_start_date
  GROUP BY sort_date, month_abbr
  ORDER BY sort_date ASC;
END;
$$;


ALTER FUNCTION "public"."get_monthly_subscriber_growth"("creator_id_input" "uuid", "period_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_decrypted_earnings"("p_user_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN (SELECT COALESCE(total_earnings, 0) FROM public.users WHERE id = p_user_id);
END;
$$;


ALTER FUNCTION "public"."get_my_decrypted_earnings"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_payout_summary"("creator_id_input" "uuid") RETURNS TABLE("available_balance" numeric, "current_month_earnings" numeric, "last_month_comparison_percent" double precision, "total_year_earnings" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_current_month_earnings decimal;
  v_last_month_earnings decimal;
  v_total_earnings decimal;
  v_total_payouts decimal;
  v_total_year_earnings decimal;
  -- Creator Share Konstante (0.8 = 80%)
  v_share decimal := 0.8;
BEGIN
  -- Gesamte Einnahmen (Brutto)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_earnings
  FROM public.payments
  WHERE creator_id = creator_id_input AND status = 'SUCCESS';

  -- Gesamte Auszahlungen (Bereits Netto)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_payouts
  FROM public.payouts
  WHERE creator_id = creator_id_input AND (status = 'COMPLETED' OR status = 'PROCESSING');

  -- Aktueller Monat (Brutto)
  SELECT COALESCE(SUM(amount), 0) INTO v_current_month_earnings
  FROM public.payments
  WHERE creator_id = creator_id_input
    AND status = 'SUCCESS'
    AND created_at >= date_trunc('month', now());

  -- Letzter Monat (Brutto)
  SELECT COALESCE(SUM(amount), 0) INTO v_last_month_earnings
  FROM public.payments
  WHERE creator_id = creator_id_input
    AND status = 'SUCCESS'
    AND created_at >= date_trunc('month', now() - interval '1 month')
    AND created_at < date_trunc('month', now());
    
  -- Aktuelles Jahr (Brutto)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_year_earnings
  FROM public.payments
  WHERE creator_id = creator_id_input
    AND status = 'SUCCESS'
    AND created_at >= date_trunc('year', now());

  -- RÜCKGABE: Hier wenden wir den Creator-Share an (Netto-Berechnung)
  RETURN QUERY
  SELECT
    -- Verfügbar = (Gesamt Brutto * 0.8) - Auszahlungen
    ((v_total_earnings * v_share) - v_total_payouts) AS available_balance,
    
    (v_current_month_earnings * v_share) AS current_month_earnings,
    
    CAST(
      CASE
        WHEN v_last_month_earnings = 0 THEN
          CASE WHEN v_current_month_earnings > 0 THEN 100.0 ELSE 0.0 END
        ELSE
          ((v_current_month_earnings - v_last_month_earnings) / v_last_month_earnings) * 100.0
      END
    AS double precision) AS last_month_comparison_percent,
    
    (v_total_year_earnings * v_share) AS total_year_earnings;
END;
$$;


ALTER FUNCTION "public"."get_payout_summary"("creator_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recommended_feed"("p_user_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "creator_id" "uuid", "media_url" "text", "media_type" "public"."media_type", "thumbnail_url" "text", "caption" "text", "hashtags" "text"[], "price" numeric, "tier_id" "uuid", "likes_count" integer, "comments_count" integer, "views_count" integer, "is_published" boolean, "scheduled_for" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "score" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_user_interests text[];
  v_implicit_tags text[];
BEGIN
  -- FIX: Alias 'u' verwenden, damit 'u.id' eindeutig ist
  SELECT COALESCE(u.interests, ARRAY[]::text[]) INTO v_user_interests
  FROM users u WHERE u.id = p_user_id;

  v_implicit_tags := get_user_implicit_interests(p_user_id);

  RETURN QUERY
  SELECT 
    p.id, p.creator_id, p.media_url, p.media_type, p.thumbnail_url, p.caption, p.hashtags, 
    p.price, p.tier_id, p.likes_count, p.comments_count, p.views_count, p.is_published, 
    p.scheduled_for, p.created_at, p.updated_at,
    (
      (EXTRACT(EPOCH FROM p.created_at) / 100000) +
      (LOG(GREATEST(p.likes_count, 1)) * 2) +
      (SELECT COUNT(*) FROM unnest(p.hashtags) t WHERE t = ANY(v_user_interests)) * 200 +
      (SELECT COUNT(*) FROM unnest(p.hashtags) t WHERE t = ANY(v_implicit_tags)) * 50
    )::float as score
  FROM posts p
  WHERE 
    p.is_published = true 
    AND (p.scheduled_for IS NULL OR p.scheduled_for <= now())
  ORDER BY score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_recommended_feed"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stream_leaderboard"("creator_id_input" "uuid") RETURNS TABLE("user_id" "uuid", "user_name" "text", "user_avatar" "text", "total_tipped" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      lcm.user_id,
      lcm.user_name,
      lcm.user_avatar,
      SUM(lcm.tip_amount) AS total_tipped
    FROM
      public.live_chat_messages AS lcm
    WHERE
      lcm.creator_id = creator_id_input
      AND lcm.message_type = 'TIP'
    GROUP BY
      lcm.user_id, lcm.user_name, lcm.user_avatar
    ORDER BY
      total_tipped DESC
    LIMIT 10;
END;
$$;


ALTER FUNCTION "public"."get_stream_leaderboard"("creator_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_fans"("creator_id_input" "uuid", "limit_input" integer DEFAULT 5, "period_input" "text" DEFAULT 'all'::"text") RETURNS TABLE("fan_id" "uuid", "display_name" "text", "avatar_url" "text", "total_spent" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  start_date timestamptz;
  interval_val interval;
  -- Creator Share Konstante
  v_share decimal := 0.8;
BEGIN
  CASE period_input
    WHEN '7d' THEN interval_val := '7 days'::interval;
    WHEN '30d' THEN interval_val := '30 days'::interval;
    WHEN '3m' THEN interval_val := '3 months'::interval;
    WHEN '6m' THEN interval_val := '6 months'::interval;
    WHEN '1y' THEN interval_val := '1 year'::interval;
    ELSE interval_val := '100 years'::interval;
  END CASE;

  start_date := now() - interval_val;

  RETURN QUERY
  SELECT
    p.user_id as fan_id,
    u.display_name,
    u.avatar_url,
    -- KORREKTUR: Hier ebenfalls den Netto-Verdienst berechnen
    SUM(p.amount) * v_share as total_spent
  FROM payments p
  JOIN users u ON p.user_id = u.id
  WHERE p.creator_id = creator_id_input
    AND p.status = 'SUCCESS'
    AND p.created_at >= start_date
  GROUP BY p.user_id, u.display_name, u.avatar_url
  ORDER BY total_spent DESC
  LIMIT limit_input;
END;
$$;


ALTER FUNCTION "public"."get_top_fans"("creator_id_input" "uuid", "limit_input" integer, "period_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_implicit_interests"("p_user_id" "uuid") RETURNS "text"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
  RETURN ARRAY(
    SELECT DISTINCT unnest(p.hashtags)
    FROM likes l
    JOIN posts p ON l.post_id = p.id
    WHERE l.user_id = p_user_id
    ORDER BY 1
    LIMIT 20
  );
END;
$$;


ALTER FUNCTION "public"."get_user_implicit_interests"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  sender_name text;
BEGIN
  -- 1. Hole den Anzeigenamen des Senders
  SELECT display_name INTO sender_name FROM public.users WHERE id = NEW.sender_id;

  -- 2. Erstelle eine Benachrichtigung für den Empfänger
  INSERT INTO public.notifications(user_id, type, title, content, data)
  VALUES(
    NEW.receiver_id,
    'NEW_MESSAGE',
    'Neue Nachricht',
    'Du hast eine neue Nachricht von ' || sender_name,
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'sender_name', sender_name
    )
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  username_val text;
  metadata jsonb;
BEGIN
  metadata := new.raw_user_meta_data;
  username_val := metadata->>'username';
  
  -- Fallback: Wenn kein Username da ist, generiere einen aus der E-Mail
  IF username_val IS NULL THEN
    username_val := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g');
    
    IF length(username_val) < 3 THEN
        username_val := 'user_' || substr(md5(random()::text), 1, 6);
    END IF;
  END IF;

  -- Eintrag in public.users erstellen
  INSERT INTO public.users (
    id, 
    username, 
    display_name, 
    avatar_url, 
    role, 
    country, 
    birthdate
  )
  VALUES (
    new.id,
    username_val,
    -- Display Name: Nimm 'full_name' (wird vom AuthService gesendet) oder Username
    COALESCE(metadata->>'full_name', username_val),
    metadata->>'avatar_url',
    -- Rolle: Expliziter Cast mit Schema-Prefix (verhindert Absturz)
    COALESCE((metadata->>'role')::public.user_role, 'FAN'::public.user_role),
    metadata->>'country',
    (metadata->>'birthdate')::date
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role;

  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_encryption"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'extensions', 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.total_earnings := pgp_sym_encrypt('0', get_app_key());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_encryption"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_payment_success"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    net_amount numeric;
BEGIN
    IF (NEW.status = 'SUCCESS' AND (OLD.status IS NULL OR OLD.status != 'SUCCESS')) THEN
        -- 80% für den Creator
        net_amount := NEW.amount * 0.8;
        
        UPDATE public.users
        SET total_earnings = COALESCE(total_earnings, 0) + net_amount
        WHERE id = NEW.creator_id;
        -- Benachrichtigung senden
        INSERT INTO public.notifications (user_id, type, title, content, data)
        VALUES (
            NEW.creator_id,
            'PAYMENT_RECEIVED',
            'Neuer Verkauf!',
            'Du hast ' || NEW.amount || '€ erhalten (Netto: ' || net_amount || '€).',
            jsonb_build_object('payment_id', NEW.id, 'type', NEW.type)
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_payment_success"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_successful_payment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  payment_type_text text;
  notification_content text;
BEGIN
  -- Nur ausführen, wenn die Zahlung ERFOLGREICH ist
  IF NEW.status = 'SUCCESS' THEN

    -- A. Einnahmen aktualisieren (Bleibt bestehen)
    UPDATE public.users
    SET total_earnings = total_earnings + NEW.amount
    WHERE id = NEW.creator_id;

    -- B. HIER WURDE DER FOLLOWER-COUNT ENTFERNT --
    -- Die Zählung passiert jetzt im neuen Trigger auf der 'subscriptions' Tabelle.

    -- C. Benachrichtigung erstellen (Bleibt bestehen)
    IF NEW.type = 'PAY_PER_VIEW' THEN
      payment_type_text := 'Pay-per-View Kauf';
      notification_content := (SELECT display_name FROM users WHERE id = NEW.user_id) || ' hat einen Beitrag gekauft für ' || NEW.amount || '€';
    ELSIF NEW.type = 'SUBSCRIPTION' THEN
       -- Optional: Benachrichtigung bei neuem Abo (aber keine Zählung mehr hier)
       -- Wir senden hier nur eine Notification, wenn es eine Zahlung gbt
       payment_type_text := 'Abonnement Zahlung';
       notification_content := (SELECT display_name FROM users WHERE id = NEW.user_id) || ' hat das Abo bezahlt (' || NEW.amount || '€)';
    END IF;

    IF notification_content IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, content, data)
      VALUES(
        NEW.creator_id,
        NEW.type::text,
        payment_type_text,
        notification_content,
        jsonb_build_object(
          'fan_id', NEW.user_id,
          'amount', NEW.amount,
          'related_id', NEW.related_id
        )
      );
    END IF;

  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_successful_payment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_comments_count"("post_id_input" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = comments_count + 1
  WHERE id = post_id_input;
END;
$$;


ALTER FUNCTION "public"."increment_comments_count"("post_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_likes_count"("post_id_input" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = likes_count + 1
  WHERE id = post_id_input;
END;
$$;


ALTER FUNCTION "public"."increment_likes_count"("post_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_subscription_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into audit_logs (table_name, record_id, operation, old_data, new_data)
  values (
    'subscriptions',
    new.id,
    TG_OP,
    to_jsonb(old), -- Der Wert VOR der Änderung
    to_jsonb(new)  -- Der Wert NACH der Änderung
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."log_subscription_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_followers_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- FALL: Neuer aktiver Abonnent (+1)
  -- (Insert als ACTIVE oder Update von NICHT-ACTIVE zu ACTIVE)
  IF (TG_OP = 'INSERT' AND NEW.status = 'ACTIVE') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'ACTIVE' AND OLD.status <> 'ACTIVE') THEN
     
     UPDATE public.users
     SET followers_count = followers_count + 1
     WHERE id = NEW.creator_id;
  END IF;

  -- FALL: Abonnent verlässt uns (-1)
  -- (Löschung eines ACTIVE Abos oder Update von ACTIVE zu NICHT-ACTIVE)
  IF (TG_OP = 'DELETE' AND OLD.status = 'ACTIVE') OR
     (TG_OP = 'UPDATE' AND OLD.status = 'ACTIVE' AND NEW.status <> 'ACTIVE') THEN
     
     UPDATE public.users
     SET followers_count = GREATEST(0, followers_count - 1)
     WHERE id = OLD.creator_id;
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."manage_followers_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgp_sym_decrypt"("val" numeric, "secret" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    -- Wir geben den Wert einfach durch (als Text, damit nachfolgende Casts ::numeric funktionieren)
    RETURN val::text;
END;
$$;


ALTER FUNCTION "public"."pgp_sym_decrypt"("val" numeric, "secret" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "status" "public"."payout_status" DEFAULT 'PENDING'::"public"."payout_status" NOT NULL,
    "payout_method" "text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "payouts_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."payouts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_payout"("creator_id_input" "uuid", "amount_input" numeric) RETURNS SETOF "public"."payouts"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  available_balance decimal;
BEGIN
  -- 1. Verfügbares Guthaben prüfen
  SELECT summary.available_balance INTO available_balance
  FROM get_payout_summary(creator_id_input) AS summary;

  -- 2. Prüfen, ob Betrag ausreicht
  IF amount_input > available_balance THEN
    RAISE EXCEPTION 'Auszahlungsbetrag übersteigt verfügbares Guthaben.';
  END IF;

  -- 3. Payout-Eintrag erstellen
  RETURN QUERY
  INSERT INTO public.payouts (creator_id, amount, status)
  VALUES (creator_id_input, amount_input, 'PENDING')
  RETURNING *;

END;
$$;


ALTER FUNCTION "public"."request_payout"("creator_id_input" "uuid", "amount_input" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_automated_message"("p_sender_id" "uuid", "p_receiver_id" "uuid", "p_content" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.messages (sender_id, receiver_id, content, is_read)
    VALUES (
        p_sender_id,
        p_receiver_id,
        -- Hier rufen wir Ihre Verschlüsselungsfunktion auf
        pgp_sym_encrypt(p_content, public.get_encryption_key()),
        false
    );
END;
$$;


ALTER FUNCTION "public"."send_automated_message"("p_sender_id" "uuid", "p_receiver_id" "uuid", "p_content" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_encrypted_message"("p_sender_id" "uuid", "p_receiver_id" "uuid", "p_content" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_msg_id uuid;
BEGIN
  INSERT INTO public.messages (sender_id, receiver_id, content)
  VALUES (
    p_sender_id,
    p_receiver_id,
    -- WICHTIG: Auch hier nutzen wir jetzt dynamisch den Key aus der Funktion!
    pgp_sym_encrypt(p_content, public.get_encryption_key())
  )
  RETURNING id INTO v_msg_id;
  
  RETURN v_msg_id;
END;
$$;


ALTER FUNCTION "public"."send_encrypted_message"("p_sender_id" "uuid", "p_receiver_id" "uuid", "p_content" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_tip_message"("creator_id_input" "uuid", "user_id_input" "uuid", "user_name_input" "text", "user_avatar_input" "text", "content_input" "text", "tip_amount_input" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.live_chat_messages
    (creator_id, user_id, user_name, user_avatar, content, message_type, tip_amount)
  VALUES
    (creator_id_input, user_id_input, user_name_input, user_avatar_input, content_input, 'TIP', tip_amount_input);
END;
$$;


ALTER FUNCTION "public"."send_tip_message"("creator_id_input" "uuid", "user_id_input" "uuid", "user_name_input" "text", "user_avatar_input" "text", "content_input" "text", "tip_amount_input" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_live_status"("creator_id_input" "uuid", "is_live_input" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Aktualisiert die 'users'-Tabelle direkt
  UPDATE public.users
  SET is_live = is_live_input
  WHERE id = creator_id_input;
END;
$$;


ALTER FUNCTION "public"."set_user_live_status"("creator_id_input" "uuid", "is_live_input" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_user_ban"("user_id_input" "uuid", "ban_status" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Sicherheitscheck
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.users
  SET is_banned = ban_status
  WHERE id = user_id_input;
END;
$$;


ALTER FUNCTION "public"."toggle_user_ban"("user_id_input" "uuid", "ban_status" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."try_decrypt"("p_content" "bytea", "p_key" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Versuche zu entschlüsseln
    RETURN pgp_sym_decrypt(p_content, p_key);
EXCEPTION WHEN OTHERS THEN
    -- Bei Fehler (z.B. falscher Key) nicht abstürzen, sondern Warnung zurückgeben
    RETURN '[Inhalt nicht lesbar - Falscher Key?]';
END;
$$;


ALTER FUNCTION "public"."try_decrypt"("p_content" "bytea", "p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_followers_count"("creator_id_input" "uuid", "delta_value" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.users
  SET followers_count = GREATEST(0, followers_count + delta_value)
  WHERE id = creator_id_input;
END;
$$;


ALTER FUNCTION "public"."update_followers_count"("creator_id_input" "uuid", "delta_value" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text",
    "record_id" "uuid",
    "operation" "text",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comments_content_check" CHECK (("char_length"("content") > 0))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid",
    "post_id" "uuid",
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'PENDING'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."content_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "receiver_id" "uuid" NOT NULL,
    "content" "bytea" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "messages_content_check" CHECK (("octet_length"("content") > 0)),
    CONSTRAINT "no_self_message" CHECK (("sender_id" <> "receiver_id"))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."decrypted_messages" AS
 SELECT "id",
    "sender_id",
    "receiver_id",
    "public"."try_decrypt"("content", "public"."get_encryption_key"()) AS "content",
    "is_read",
    "created_at"
   FROM "public"."messages";


ALTER VIEW "public"."decrypted_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "post_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" "text" NOT NULL,
    "user_avatar" "text",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message_type" "text" DEFAULT 'CHAT'::"text" NOT NULL,
    "tip_amount" numeric DEFAULT 0
);


ALTER TABLE "public"."live_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "type" "public"."payment_type" NOT NULL,
    "status" "public"."payment_status" DEFAULT 'PENDING'::"public"."payment_status" NOT NULL,
    "payment_method" "text",
    "related_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "creator_id" "uuid",
    CONSTRAINT "payments_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "media_url" "text" NOT NULL,
    "media_type" "public"."media_type" NOT NULL,
    "thumbnail_url" "text",
    "caption" "text" DEFAULT ''::"text",
    "hashtags" "text"[] DEFAULT ARRAY[]::"text"[],
    "price" numeric(10,2) DEFAULT 0,
    "tier_id" "uuid",
    "likes_count" integer DEFAULT 0,
    "comments_count" integer DEFAULT 0,
    "views_count" integer DEFAULT 0,
    "is_published" boolean DEFAULT false,
    "scheduled_for" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "shipping_cost" numeric(10,2) DEFAULT 0,
    "shipping_included" boolean DEFAULT false,
    CONSTRAINT "products_price_check" CHECK (("price" > (0)::numeric))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fan_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "tier_id" "uuid",
    "status" "public"."subscription_status" DEFAULT 'ACTIVE'::"public"."subscription_status" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "start_date" timestamp with time zone DEFAULT "now"(),
    "end_date" timestamp with time zone,
    "auto_renew" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "stripe_subscription_id" "text",
    CONSTRAINT "no_self_subscription" CHECK (("fan_id" <> "creator_id")),
    CONSTRAINT "subscriptions_price_check" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "bio" "text" DEFAULT ''::"text",
    "avatar_url" "text",
    "banner_url" "text",
    "role" "public"."user_role" DEFAULT 'FAN'::"public"."user_role" NOT NULL,
    "is_verified" boolean DEFAULT false,
    "subscription_price" numeric(10,2) DEFAULT 0,
    "followers_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "welcome_message" "text" DEFAULT ''::"text",
    "profile_hashtags" "text"[] DEFAULT ARRAY[]::"text"[],
    "mux_stream_key" "text",
    "mux_playback_id" "text",
    "is_live" boolean DEFAULT false,
    "live_stream_tier_id" "text" DEFAULT 'public'::"text",
    "live_stream_requires_subscription" boolean DEFAULT true,
    "stripe_account_id" "text",
    "stripe_onboarding_complete" boolean DEFAULT false,
    "interests" "text"[] DEFAULT ARRAY[]::"text"[],
    "country" "text",
    "birthdate" "date",
    "is_banned" boolean DEFAULT false,
    "total_earnings" numeric(10,2) DEFAULT 0,
    "last_seen" timestamp with time zone DEFAULT "now"(),
    "stripe_customer_id" "text",
    CONSTRAINT "username_format" CHECK (("username" ~ '^[a-z0-9_]+$'::"text")),
    CONSTRAINT "username_length" CHECK ((("char_length"("username") >= 3) AND ("char_length"("username") <= 30)))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_chat_messages"
    ADD CONSTRAINT "live_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_tiers"
    ADD CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "unique_active_subscription" UNIQUE ("fan_id", "creator_id", "status");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "unique_like" UNIQUE ("user_id", "post_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "unique_stripe_subscription_id" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."subscription_tiers"
    ADD CONSTRAINT "unique_tier_per_creator" UNIQUE ("creator_id", "name");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



CREATE INDEX "idx_comments_post" ON "public"."comments" USING "btree" ("post_id");



CREATE INDEX "idx_likes_post" ON "public"."likes" USING "btree" ("post_id");



CREATE INDEX "idx_likes_user" ON "public"."likes" USING "btree" ("user_id");



CREATE INDEX "idx_live_chat_creator_id_created_at" ON "public"."live_chat_messages" USING "btree" ("creator_id", "created_at" DESC);



CREATE INDEX "idx_live_chat_creator_id_tip_amount" ON "public"."live_chat_messages" USING "btree" ("creator_id", "tip_amount" DESC) WHERE ("tip_amount" > (0)::numeric);



CREATE INDEX "idx_messages_receiver" ON "public"."messages" USING "btree" ("receiver_id");



CREATE INDEX "idx_messages_sender" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_payments_creator" ON "public"."payments" USING "btree" ("creator_id");



CREATE INDEX "idx_payments_user" ON "public"."payments" USING "btree" ("user_id");



CREATE INDEX "idx_posts_created" ON "public"."posts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_posts_creator" ON "public"."posts" USING "btree" ("creator_id");



CREATE INDEX "idx_posts_published" ON "public"."posts" USING "btree" ("is_published") WHERE ("is_published" = true);



CREATE INDEX "idx_subscriptions_created_at" ON "public"."subscriptions" USING "btree" ("created_at");



CREATE INDEX "idx_subscriptions_creator" ON "public"."subscriptions" USING "btree" ("creator_id");



CREATE INDEX "idx_subscriptions_fan" ON "public"."subscriptions" USING "btree" ("fan_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_stripe_id" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_users_stripe_customer" ON "public"."users" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_users_username" ON "public"."users" USING "btree" ("username");



CREATE OR REPLACE TRIGGER "on_new_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_message"();



CREATE OR REPLACE TRIGGER "on_payment_success" AFTER INSERT OR UPDATE OF "status" ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_payment_success"();



CREATE OR REPLACE TRIGGER "on_subscription_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."manage_followers_count"();



CREATE OR REPLACE TRIGGER "on_successful_payment" AFTER INSERT ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_successful_payment"();



CREATE OR REPLACE TRIGGER "track_subscription_changes" AFTER UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."log_subscription_changes"();



CREATE OR REPLACE TRIGGER "update_comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_posts_updated_at" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_chat_messages"
    ADD CONSTRAINT "live_chat_messages_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_chat_messages"
    ADD CONSTRAINT "live_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_tiers"
    ADD CONSTRAINT "subscription_tiers_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can update reports" ON "public"."content_reports" FOR UPDATE TO "authenticated" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'ADMIN'::"public"."user_role"));



CREATE POLICY "Admins can view all reports" ON "public"."content_reports" FOR SELECT TO "authenticated" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'ADMIN'::"public"."user_role"));



CREATE POLICY "Admins full access to reports" ON "public"."content_reports" TO "authenticated" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'ADMIN'::"public"."user_role"));



CREATE POLICY "Allow service_role to update is_live status" ON "public"."users" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Creators and Admins can create posts" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "creator_id") AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['CREATOR'::"public"."user_role", 'ADMIN'::"public"."user_role"])))))));



CREATE POLICY "Creators and Admins can manage own tiers" ON "public"."subscription_tiers" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "creator_id") AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['CREATOR'::"public"."user_role", 'ADMIN'::"public"."user_role"])))))));



CREATE POLICY "Creators and Admins can request payouts" ON "public"."payouts" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "creator_id") AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['CREATOR'::"public"."user_role", 'ADMIN'::"public"."user_role"])))))));



CREATE POLICY "Creators and Admins can update own posts" ON "public"."posts" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "creator_id")) WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "Creators can delete own posts" ON "public"."posts" FOR DELETE TO "authenticated" USING (("creator_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Creators can delete own tiers" ON "public"."subscription_tiers" FOR DELETE TO "authenticated" USING (("creator_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Creators can update own tiers" ON "public"."subscription_tiers" FOR UPDATE TO "authenticated" USING (("creator_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("creator_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Creators can view own payouts" ON "public"."payouts" FOR SELECT TO "authenticated" USING (("creator_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Creators manage own products" ON "public"."products" TO "authenticated" USING (("auth"."uid"() = "creator_id")) WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "Delete comments" ON "public"."comments" FOR DELETE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND ("p"."creator_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Fans can create subscriptions" ON "public"."subscriptions" FOR INSERT TO "authenticated" WITH CHECK (("fan_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Fans can update own subscriptions" ON "public"."subscriptions" FOR UPDATE TO "authenticated" USING (("fan_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("fan_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Insert messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("receiver_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."subscriptions" "s"
  WHERE (("s"."fan_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("s"."creator_id" = "messages"."sender_id") AND (("s"."status" = 'ACTIVE'::"public"."subscription_status") OR (("s"."status" = 'CANCELED'::"public"."subscription_status") AND ("s"."end_date" > "now"())))))))));



CREATE POLICY "No public access to reports" ON "public"."content_reports" FOR SELECT TO "authenticated" USING (false);



CREATE POLICY "Public view active products" ON "public"."products" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Send live chat messages" ON "public"."live_chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("message_type" = 'CHAT'::"text") AND ("tip_amount" = (0)::numeric)));



CREATE POLICY "System can create notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can create comments on accessible posts" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND ("p"."is_published" = true))))));



CREATE POLICY "Users can create own likes" ON "public"."likes" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can create own payments" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create reports" ON "public"."content_reports" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can delete own likes" ON "public"."likes" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own profile on signup" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own comments" ON "public"."comments" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update received messages" ON "public"."messages" FOR UPDATE TO "authenticated" USING (("receiver_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("receiver_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view all likes" ON "public"."likes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view comments on accessible posts" ON "public"."comments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE ("p"."id" = "comments"."post_id"))));



CREATE POLICY "Users can view own messages" ON "public"."messages" FOR SELECT TO "authenticated" USING ((("sender_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("receiver_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own payments" ON "public"."payments" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "creator_id")));



CREATE POLICY "Users can view own subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING ((("fan_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("creator_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can view posts" ON "public"."posts" FOR SELECT TO "authenticated" USING ((("is_published" = true) OR ("creator_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can view profiles" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "View live chat messages" ON "public"."live_chat_messages" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "View subscription tiers" ON "public"."subscription_tiers" FOR SELECT TO "authenticated" USING ((("is_active" = true) OR ("creator_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."live_chat_messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_email_exists"("email_to_check" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_exists"("email_to_check" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_exists"("email_to_check" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_username_exists"("username_to_check" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_username_exists"("username_to_check" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_username_exists"("username_to_check" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_live_chat_and_go_offline"("creator_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."clear_live_chat_and_go_offline"("creator_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_live_chat_and_go_offline"("creator_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_comments_count"("post_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_comments_count"("post_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_comments_count"("post_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_likes_count"("post_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_likes_count"("post_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_likes_count"("post_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_chat_message"("message_id_input" "uuid", "creator_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_chat_message"("message_id_input" "uuid", "creator_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_chat_message"("message_id_input" "uuid", "creator_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"("time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"("time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"("time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_reports"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_reports"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_reports"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_users"("search_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_users"("search_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_users"("search_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_users"("search_query" "text", "filter_role" "text", "filter_country" "text", "sort_by" "text", "sort_desc" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_users"("search_query" "text", "filter_role" "text", "filter_country" "text", "sort_by" "text", "sort_desc" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_users"("search_query" "text", "filter_role" "text", "filter_country" "text", "sort_by" "text", "sort_desc" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_app_key"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_app_key"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_app_key"() TO "service_role";



GRANT ALL ON TABLE "public"."subscription_tiers" TO "anon";
GRANT ALL ON TABLE "public"."subscription_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_tiers" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_creator_tiers"("p_creator_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_creator_tiers"("p_creator_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_creator_tiers"("p_creator_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_encryption_key"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_encryption_key"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_encryption_key"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_revenue"("creator_id_input" "uuid", "period_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_revenue"("creator_id_input" "uuid", "period_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_revenue"("creator_id_input" "uuid", "period_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_subscriber_growth"("creator_id_input" "uuid", "period_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_subscriber_growth"("creator_id_input" "uuid", "period_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_subscriber_growth"("creator_id_input" "uuid", "period_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_decrypted_earnings"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_decrypted_earnings"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_decrypted_earnings"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_payout_summary"("creator_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_payout_summary"("creator_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_payout_summary"("creator_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recommended_feed"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recommended_feed"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recommended_feed"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stream_leaderboard"("creator_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_stream_leaderboard"("creator_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stream_leaderboard"("creator_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_fans"("creator_id_input" "uuid", "limit_input" integer, "period_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_fans"("creator_id_input" "uuid", "limit_input" integer, "period_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_fans"("creator_id_input" "uuid", "limit_input" integer, "period_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_implicit_interests"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_implicit_interests"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_implicit_interests"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_encryption"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_encryption"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_encryption"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_payment_success"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_payment_success"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_payment_success"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_successful_payment"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_successful_payment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_successful_payment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_comments_count"("post_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_comments_count"("post_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_comments_count"("post_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_likes_count"("post_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_likes_count"("post_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_likes_count"("post_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_subscription_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_subscription_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_subscription_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_followers_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."manage_followers_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_followers_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pgp_sym_decrypt"("val" numeric, "secret" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgp_sym_decrypt"("val" numeric, "secret" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgp_sym_decrypt"("val" numeric, "secret" "text") TO "service_role";



GRANT ALL ON TABLE "public"."payouts" TO "anon";
GRANT ALL ON TABLE "public"."payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."payouts" TO "service_role";



GRANT ALL ON FUNCTION "public"."request_payout"("creator_id_input" "uuid", "amount_input" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."request_payout"("creator_id_input" "uuid", "amount_input" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_payout"("creator_id_input" "uuid", "amount_input" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."send_automated_message"("p_sender_id" "uuid", "p_receiver_id" "uuid", "p_content" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_automated_message"("p_sender_id" "uuid", "p_receiver_id" "uuid", "p_content" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_automated_message"("p_sender_id" "uuid", "p_receiver_id" "uuid", "p_content" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_encrypted_message"("p_sender_id" "uuid", "p_receiver_id" "uuid", "p_content" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_encrypted_message"("p_sender_id" "uuid", "p_receiver_id" "uuid", "p_content" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_encrypted_message"("p_sender_id" "uuid", "p_receiver_id" "uuid", "p_content" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_tip_message"("creator_id_input" "uuid", "user_id_input" "uuid", "user_name_input" "text", "user_avatar_input" "text", "content_input" "text", "tip_amount_input" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."send_tip_message"("creator_id_input" "uuid", "user_id_input" "uuid", "user_name_input" "text", "user_avatar_input" "text", "content_input" "text", "tip_amount_input" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_tip_message"("creator_id_input" "uuid", "user_id_input" "uuid", "user_name_input" "text", "user_avatar_input" "text", "content_input" "text", "tip_amount_input" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_live_status"("creator_id_input" "uuid", "is_live_input" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_live_status"("creator_id_input" "uuid", "is_live_input" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_live_status"("creator_id_input" "uuid", "is_live_input" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_user_ban"("user_id_input" "uuid", "ban_status" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_user_ban"("user_id_input" "uuid", "ban_status" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_user_ban"("user_id_input" "uuid", "ban_status" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."try_decrypt"("p_content" "bytea", "p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."try_decrypt"("p_content" "bytea", "p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."try_decrypt"("p_content" "bytea", "p_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_followers_count"("creator_id_input" "uuid", "delta_value" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_followers_count"("creator_id_input" "uuid", "delta_value" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_followers_count"("creator_id_input" "uuid", "delta_value" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."content_reports" TO "anon";
GRANT ALL ON TABLE "public"."content_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."content_reports" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."decrypted_messages" TO "anon";
GRANT ALL ON TABLE "public"."decrypted_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."decrypted_messages" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."live_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."live_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."live_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































