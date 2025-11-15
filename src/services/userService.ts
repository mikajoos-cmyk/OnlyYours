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
  // --- NEUE FELDER ---
  mux_stream_key: string | null;
  mux_playback_id: string | null;
  is_live: boolean;
  // --- ENDE ---
}

export class UserService {

  async getUserByUsername(username: string): Promise<UserProfile | null> {
    const normalizedUsername = username.toLowerCase();
    console.log("userService searching for username (lowercase):", normalizedUsername);

    // 1. Prüfen, wer der aktuell eingeloggte Benutzer ist
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // 2. Öffentliche Daten des Ziel-Creators abfragen (ohne Stream-Key)
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, bio, avatar_url, banner_url, role, is_verified, followers_count, created_at, profile_hashtags, mux_playback_id, is_live')
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

    // 3. Wenn der gesuchte User der eingeloggte User ist, den privaten Stream-Key laden
    if (currentUser && currentUser.id === data.id) {
        const { data: privateData, error: privateError } = await supabase
            .from('users')
            .select('mux_stream_key') // Holt *nur* den Stream-Key dank RLS-Policy
            .eq('id', currentUser.id)
            .single();

        if (privateError) {
          console.warn("Konnte Stream-Key für eigenen Benutzer nicht laden (vielleicht noch nicht gesetzt?)", privateError.message);
        }

        // Kombiniere öffentliche und private Daten
        return this.mapToUserProfile({ ...data, ...privateData });
    }

    // 4. Für alle anderen (Zuschauer) nur öffentliche Daten zurückgeben
    console.log("User found by username (public view):", data);
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

  /**
   * (AKTUALISIERT) Sucht Creators nur noch nach Text (Name, Username, Hashtags).
   * Filter wurden entfernt.
   */
  async searchCreators(query: string) {
    const cleanedQuery = query.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleanedQuery) return [];

    let queryBuilder = supabase
      .from('users')
      .select('id, username, display_name, bio, avatar_url, banner_url, role, is_verified, followers_count, created_at, profile_hashtags, mux_playback_id, is_live') // Ohne Stream-Key
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

  // --- NEUE FUNKTION ---
  /**
   * Holt alle Creator, die aktuell live sind.
   */
  async getLiveCreators(limit: number = 50) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, bio, avatar_url, banner_url, role, is_verified, followers_count, created_at, profile_hashtags, mux_playback_id, is_live') // Ohne Stream-Key
      .eq('role', 'CREATOR')
      .eq('is_live', true) // <-- Der wichtige Filter
      .order('followers_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Fehler beim Laden der Live-Creators:", error);
      throw error;
    }

    return (data || []).map(user => this.mapToUserProfile(user));
  }
  // --- ENDE NEUE FUNKTION ---


  async getTopCreators(limit: number = 20) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, bio, avatar_url, banner_url, role, is_verified, followers_count, created_at, profile_hashtags, mux_playback_id, is_live') // Ohne Stream-Key
      .eq('role', 'CREATOR')
      .order('followers_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(user => this.mapToUserProfile(user));
  }

  async updateUserStats(userId: string, stats: {
    totalEarnings?: number;
  }) {
    // ... (unverändert) ...
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
      // --- NEUE FELDER ---
      mux_stream_key: data.mux_stream_key || null,
      mux_playback_id: data.mux_playback_id || null,
      is_live: data.is_live || false,
      // --- ENDE ---
    };
  }
}

export const userService = new UserService();