-- Migration to add missing columns to users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'allow_direct_messages') THEN
        ALTER TABLE "public"."users" ADD COLUMN "allow_direct_messages" boolean DEFAULT true;
    END IF;

    -- Add is_banned if it's missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_banned') THEN
        ALTER TABLE "public"."users" ADD COLUMN "is_banned" boolean DEFAULT false;
    END IF;

    -- Add country if it's missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'country') THEN
        ALTER TABLE "public"."users" ADD COLUMN "country" text;
    END IF;
END $$;
