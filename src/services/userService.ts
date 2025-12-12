// src/services/userService.ts
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  role: 'FAN' | 'CREATOR';
  isVerified: boolean;
  subscriptionPrice: number;
  followersCount: number;
  totalEarnings: number;
  createdAt: string;
  profileHashtags: string[] | null;
  mux_stream_key: string | null;
  mux_playback_id: string | null;
  is_live: boolean;
  live_stream_tier_id: string | null;
  live_stream_requires_subscription: boolean | null;
}

export class UserService {

  async getUserByUsername(username: string): Promise<UserProfile | null> {
    const normalizedUsername = username.toLowerCase();
    console.log("userService searching for username (lowercase):", normalizedUsername);

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const publicSelect = 'id, username, display_name, bio, avatar_url, banner_url, role, is_verified, followers_count, created_at, profile_hashtags, mux_playback_id, is_live, live_stream_tier_id, live_stream_requires_subscription';

    const { data, error } = await supabase
      .from('users')
      .select(publicSelect)
      .eq('username', normalizedUsername)
      .maybeSingle();

    if (error) {
        console.error("Supabase error in getUserByUsername:", error);
        throw error;
    }
    if (!data) {
        console.log("No user found for username:", normalizedUsername);
        return null;
    }

    if (currentUser && currentUser.id === data.id) {
        const { data: privateData, error: privateError } = await supabase
            .from('users')
            .select('mux_stream_key')
            .eq('id', currentUser.id)
            .single();

        if (privateError) {
          console.warn("Konnte Stream-Key für eigenen Benutzer nicht laden", privateError.message);
        }

        return this.mapToUserProfile({ ...data, ...privateData });
    }

    return this.mapToUserProfile(data);
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToUserProfile(data);
  }

  async searchCreators(query: string) {
    const cleanedQuery = query.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleanedQuery) return [];

    const publicSelect = 'id, username, display_name, bio, avatar_url, banner_url, role, is_verified, followers_count, created_at, profile_hashtags, mux_playback_id, is_live, live_stream_tier_id, live_stream_requires_subscription';

    let queryBuilder = supabase
      .from('users')
      .select(publicSelect)
      .eq('role', 'CREATOR')
      .or(
        `username.ilike.%${cleanedQuery}%,` +
        `display_name.ilike.%${cleanedQuery}%,` +
        `profile_hashtags.cs.{${cleanedQuery}}`
      );

    const { data, error } = await queryBuilder
      .order('followers_count', { ascending: false })
      .limit(50);

    if (error) {
      console.error("Fehler bei der Creator-Suche:", error);
      throw error;
    }

    return (data || []).map(user => this.mapToUserProfile(user));
  }

  async getLiveCreators(limit: number = 50) {
    const publicSelect = 'id, username, display_name, bio, avatar_url, banner_url, role, is_verified, followers_count, created_at, profile_hashtags, mux_playback_id, is_live, live_stream_tier_id, live_stream_requires_subscription';

    const { data, error } = await supabase
      .from('users')
      .select(publicSelect)
      .eq('role', 'CREATOR')
      .eq('is_live', true)
      .order('followers_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Fehler beim Laden der Live-Creators:", error);
      throw error;
    }

    return (data || []).map(user => this.mapToUserProfile(user));
  }

  async getTopCreators(limit: number = 20) {
    const publicSelect = 'id, username, display_name, bio, avatar_url, banner_url, role, is_verified, followers_count, created_at, profile_hashtags, mux_playback_id, is_live, live_stream_tier_id, live_stream_requires_subscription';

    const { data, error } = await supabase
      .from('users')
      .select(publicSelect)
      .eq('role', 'CREATOR')
      .order('followers_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(user => this.mapToUserProfile(user));
  }

  // --- NEUE METHODE ---
  async updateLastSeen() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Wir aktualisieren nur public.users
    // Fire & Forget, wir warten nicht auf das Ergebnis
    supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) console.error("Failed to update last_seen:", error);
      });
  }
  // --------------------

  async updateUserStats(userId: string, stats: {
    totalEarnings?: number;
  }) {
    // Veraltet, Trigger übernimmt das
  }

  private mapToUserProfile(data: any): UserProfile {
    return {
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      bio: data.bio,
      avatarUrl: data.avatar_url,
      bannerUrl: data.banner_url,
      role: data.role,
      isVerified: data.is_verified,
      subscriptionPrice: parseFloat(data.subscription_price),
      followersCount: data.followers_count,
      totalEarnings: parseFloat(data.total_earnings),
      createdAt: data.created_at,
      profileHashtags: data.profile_hashtags || [],
      mux_stream_key: data.mux_stream_key || null,
      mux_playback_id: data.mux_playback_id || null,
      is_live: data.is_live || false,
      live_stream_tier_id: data.live_stream_tier_id || null,
      live_stream_requires_subscription: data.live_stream_requires_subscription === null ? true : data.live_stream_requires_subscription,
    };
  }
}

export const userService = new UserService();