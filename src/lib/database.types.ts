export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          display_name: string
          bio: string
          avatar_url: string | null
          banner_url: string | null
          role: 'FAN' | 'CREATOR'
          is_verified: boolean
          subscription_price: number
          followers_count: number
          total_earnings: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          bio?: string
          avatar_url?: string | null
          banner_url?: string | null
          role?: 'FAN' | 'CREATOR'
          is_verified?: boolean
          subscription_price?: number
          followers_count?: number
          total_earnings?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string
          bio?: string
          avatar_url?: string | null
          banner_url?: string | null
          role?: 'FAN' | 'CREATOR'
          is_verified?: boolean
          subscription_price?: number
          followers_count?: number
          total_earnings?: number
          created_at?: string
          updated_at?: string
        }
      }
      subscription_tiers: {
        Row: {
          id: string
          creator_id: string
          name: string
          price: number
          description: string
          benefits: Json
          position: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          name: string
          price: number
          description?: string
          benefits?: Json
          position?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          name?: string
          price?: number
          description?: string
          benefits?: Json
          position?: number
          is_active?: boolean
          created_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          creator_id: string
          media_url: string
          media_type: 'IMAGE' | 'VIDEO'
          thumbnail_url: string | null
          caption: string
          hashtags: string[]
          price: number
          tier_id: string | null
          likes_count: number
          comments_count: number
          views_count: number
          is_published: boolean
          scheduled_for: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          media_url: string
          media_type: 'IMAGE' | 'VIDEO'
          thumbnail_url?: string | null
          caption?: string
          hashtags?: string[]
          price?: number
          tier_id?: string | null
          likes_count?: number
          comments_count?: number
          views_count?: number
          is_published?: boolean
          scheduled_for?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          media_url?: string
          media_type?: 'IMAGE' | 'VIDEO'
          thumbnail_url?: string | null
          caption?: string
          hashtags?: string[]
          price?: number
          tier_id?: string | null
          likes_count?: number
          comments_count?: number
          views_count?: number
          is_published?: boolean
          scheduled_for?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          fan_id: string
          creator_id: string
          tier_id: string | null
          status: 'ACTIVE' | 'CANCELED' | 'EXPIRED'
          price: number
          start_date: string
          end_date: string | null
          auto_renew: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fan_id: string
          creator_id: string
          tier_id?: string | null
          status?: 'ACTIVE' | 'CANCELED' | 'EXPIRED'
          price: number
          start_date?: string
          end_date?: string | null
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fan_id?: string
          creator_id?: string
          tier_id?: string | null
          status?: 'ACTIVE' | 'CANCELED' | 'EXPIRED'
          price?: number
          start_date?: string
          end_date?: string | null
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      likes: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          is_read?: boolean
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          content: string
          data: Json
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          content: string
          data?: Json
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          content?: string
          data?: Json
          is_read?: boolean
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          type: 'SUBSCRIPTION' | 'TIP' | 'PAY_PER_VIEW'
          status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
          payment_method: string | null
          related_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          currency?: string
          type: 'SUBSCRIPTION' | 'TIP' | 'PAY_PER_VIEW'
          status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
          payment_method?: string | null
          related_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          currency?: string
          type?: 'SUBSCRIPTION' | 'TIP' | 'PAY_PER_VIEW'
          status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
          payment_method?: string | null
          related_id?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      payouts: {
        Row: {
          id: string
          creator_id: string
          amount: number
          status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
          payout_method: string | null
          requested_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          creator_id: string
          amount: number
          status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
          payout_method?: string | null
          requested_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          creator_id?: string
          amount?: number
          status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
          payout_method?: string | null
          requested_at?: string
          completed_at?: string | null
        }
      }
    }
  }
}
