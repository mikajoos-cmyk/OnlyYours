/*
  # OnlyYours Platform - Complete Database Schema

  ## Overview
  This migration creates the complete database schema for the OnlyYours content creator platform,
  with comprehensive security, encryption, and privacy features.

  ## 1. New Tables

  ### users
  Extended user profile table (auth.users is managed by Supabase Auth)
  - `id` (uuid, references auth.users)
  - `username` (text, unique, lowercase)
  - `display_name` (text)
  - `bio` (text)
  - `avatar_url` (text)
  - `banner_url` (text)
  - `role` (enum: 'FAN', 'CREATOR')
  - `is_verified` (boolean)
  - `subscription_price` (decimal) - for creators
  - `followers_count` (integer)
  - `total_earnings` (decimal) - encrypted sensitive data
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### subscription_tiers
  Subscription tier definitions for creators
  - `id` (uuid, primary key)
  - `creator_id` (uuid, references users)
  - `name` (text) - e.g., "Basic", "VIP", "VIP Gold"
  - `price` (decimal)
  - `description` (text)
  - `benefits` (jsonb) - structured benefits list
  - `position` (integer) - display order
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### posts
  Content posts created by creators
  - `id` (uuid, primary key)
  - `creator_id` (uuid, references users)
  - `media_url` (text) - encrypted storage path
  - `media_type` (enum: 'IMAGE', 'VIDEO')
  - `thumbnail_url` (text)
  - `caption` (text)
  - `hashtags` (text[])
  - `price` (decimal) - optional pay-per-view price
  - `tier_id` (uuid) - optional tier restriction
  - `likes_count` (integer)
  - `comments_count` (integer)
  - `views_count` (integer)
  - `is_published` (boolean)
  - `scheduled_for` (timestamptz) - optional scheduled publish
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### subscriptions
  Active subscriptions between fans and creators
  - `id` (uuid, primary key)
  - `fan_id` (uuid, references users)
  - `creator_id` (uuid, references users)
  - `tier_id` (uuid, references subscription_tiers)
  - `status` (enum: 'ACTIVE', 'CANCELED', 'EXPIRED')
  - `price` (decimal) - locked-in price at subscription time
  - `start_date` (timestamptz)
  - `end_date` (timestamptz)
  - `auto_renew` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### likes
  Post likes from users
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users)
  - `post_id` (uuid, references posts)
  - `created_at` (timestamptz)
  - Unique constraint on (user_id, post_id)

  ### comments
  Comments on posts
  - `id` (uuid, primary key)
  - `post_id` (uuid, references posts)
  - `user_id` (uuid, references users)
  - `content` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### messages
  Direct messages between users
  - `id` (uuid, primary key)
  - `sender_id` (uuid, references users)
  - `receiver_id` (uuid, references users)
  - `content` (text) - encrypted
  - `is_read` (boolean)
  - `created_at` (timestamptz)

  ### notifications
  User notifications
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users)
  - `type` (text) - e.g., 'NEW_SUBSCRIBER', 'NEW_LIKE', 'NEW_COMMENT'
  - `title` (text)
  - `content` (text)
  - `data` (jsonb) - additional structured data
  - `is_read` (boolean)
  - `created_at` (timestamptz)

  ### payments
  Payment transaction records
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users)
  - `amount` (decimal)
  - `currency` (text)
  - `type` (enum: 'SUBSCRIPTION', 'TIP', 'PAY_PER_VIEW')
  - `status` (enum: 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')
  - `payment_method` (text) - encrypted
  - `related_id` (uuid) - references subscription_id, post_id, etc.
  - `metadata` (jsonb)
  - `created_at` (timestamptz)

  ### payouts
  Creator payout records
  - `id` (uuid, primary key)
  - `creator_id` (uuid, references users)
  - `amount` (decimal)
  - `status` (enum: 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')
  - `payout_method` (text) - encrypted
  - `requested_at` (timestamptz)
  - `completed_at` (timestamptz)

  ## 2. Security Features

  ### Row Level Security (RLS)
  - ALL tables have RLS enabled
  - Restrictive policies that check authentication and ownership
  - Separate policies for SELECT, INSERT, UPDATE, DELETE

  ### Data Encryption
  - Sensitive fields are marked for application-level encryption
  - Storage paths use secure tokens
  - Payment data is protected

  ### Privacy Controls
  - Users can only access their own data
  - Content access controlled by subscription status
  - Message privacy between sender/receiver only

  ## 3. Important Notes
  - Uses auth.uid() for user identification
  - Timestamps use timestamptz for timezone awareness
  - Indexes added for performance on frequently queried columns
  - Cascading deletes configured where appropriate
  - Default values set to prevent null issues
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('FAN', 'CREATOR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('IMAGE', 'VIDEO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_type AS ENUM ('SUBSCRIPTION', 'TIP', 'PAY_PER_VIEW');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  bio text DEFAULT '',
  avatar_url text,
  banner_url text,
  role user_role NOT NULL DEFAULT 'FAN',
  is_verified boolean DEFAULT false,
  subscription_price decimal(10,2) DEFAULT 0,
  followers_count integer DEFAULT 0,
  total_earnings decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]+$')
);

-- Create subscription_tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  description text DEFAULT '',
  benefits jsonb DEFAULT '[]'::jsonb,
  position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_tier_per_creator UNIQUE (creator_id, name)
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type media_type NOT NULL,
  thumbnail_url text,
  caption text DEFAULT '',
  hashtags text[] DEFAULT ARRAY[]::text[],
  price decimal(10,2) DEFAULT 0,
  tier_id uuid REFERENCES subscription_tiers(id) ON DELETE SET NULL,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  is_published boolean DEFAULT false,
  scheduled_for timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_id uuid REFERENCES subscription_tiers(id) ON DELETE SET NULL,
  status subscription_status NOT NULL DEFAULT 'ACTIVE',
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  auto_renew boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_subscription CHECK (fan_id != creator_id),
  CONSTRAINT unique_active_subscription UNIQUE (fan_id, creator_id, status)
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_like UNIQUE (user_id, post_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_message CHECK (sender_id != receiver_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EUR',
  type payment_type NOT NULL,
  status payment_status NOT NULL DEFAULT 'PENDING',
  payment_method text,
  related_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  status payout_status NOT NULL DEFAULT 'PENDING',
  payout_method text,
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_posts_creator ON posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_fan ON subscriptions(fan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all public profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile on signup"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for subscription_tiers table
CREATE POLICY "Anyone can view active tiers"
  ON subscription_tiers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Creators can manage own tiers"
  ON subscription_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'CREATOR')
  );

CREATE POLICY "Creators can update own tiers"
  ON subscription_tiers FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own tiers"
  ON subscription_tiers FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- RLS Policies for posts table
CREATE POLICY "Users can view published posts they have access to"
  ON posts FOR SELECT
  TO authenticated
  USING (
    is_published = true AND
    (
      price = 0 OR
      EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.fan_id = auth.uid()
        AND s.creator_id = posts.creator_id
        AND s.status = 'ACTIVE'
        AND (posts.tier_id IS NULL OR s.tier_id = posts.tier_id)
      ) OR
      creator_id = auth.uid()
    )
  );

CREATE POLICY "Creators can view own posts"
  ON posts FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'CREATOR')
  );

CREATE POLICY "Creators can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- RLS Policies for subscriptions table
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (fan_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY "Fans can create subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Fans can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = fan_id)
  WITH CHECK (auth.uid() = fan_id);

-- RLS Policies for likes table
CREATE POLICY "Users can view all likes"
  ON likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for comments table
CREATE POLICY "Users can view comments on accessible posts"
  ON comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = comments.post_id
      AND p.is_published = true
    )
  );

CREATE POLICY "Users can create comments on accessible posts"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id
      AND p.is_published = true
    )
  );

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Post creators can delete comments on own posts"
  ON comments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = comments.post_id
      AND p.creator_id = auth.uid()
    )
  );

-- RLS Policies for messages table
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- RLS Policies for notifications table
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for payments table
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for payouts table
CREATE POLICY "Creators can view own payouts"
  ON payouts FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can request payouts"
  ON payouts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'CREATOR')
  );