-- Migration to fix missing Stripe columns and constraints
-- Path: supabase/migrations/20260424130000_fix_stripe_schema.sql

-- Add stripe_customer_id to users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE "public"."users" ADD COLUMN "stripe_customer_id" text;
    END IF;
END $$;

-- Add stripe_subscription_id to subscriptions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'stripe_subscription_id') THEN
        ALTER TABLE "public"."subscriptions" ADD COLUMN "stripe_subscription_id" text;
    END IF;
END $$;

-- Add unique constraint to stripe_subscription_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_stripe_subscription_id') THEN
        ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "unique_stripe_subscription_id" UNIQUE ("stripe_subscription_id");
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_users_stripe_customer" ON "public"."users" USING "btree" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_stripe_id" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");
