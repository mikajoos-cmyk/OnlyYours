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
}

export class UserService {

  /**
   * (WIEDERHERGESTELLT) Ruft ein Benutzerprofil anhand seines eindeutigen @username ab.
   * Wird von der Creator-Profilseite (CreatorProfile.tsx) verwendet.
   */
  async getUserByUsername(username: string): Promise<UserProfile | null> {
    const normalizedUsername = username.toLowerCase();
    console.log("userService searching for username (lowercase):", normalizedUsername);

    const { data, error } = await supabase
      .from('users')
      .select('*') // Holt alle Spalten, inkl. profile_hashtags
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

    console.log("User found by username:", data);
    return this.mapToUserProfile(data);
  }

  /**
   * Ruft ein Benutzerprofil anhand seiner UUID (id) ab.
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*') // Holt alle Spalten, inkl. profile_hashtags
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
      .select('*')
      .eq('role', 'CREATOR')
      .or(
        `username.ilike.%${cleanedQuery}%,` +
        `display_name.ilike.%${cleanedQuery}%,` +
        `profile_hashtags.cs.{${cleanedQuery}}` // cs = contains (für text[])
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

  // Dies ist die Standardfunktion, die alle Creators lädt (sortiert nach Followern)
  async getTopCreators(limit: number = 20) {
    const { data, error } = await supabase
      .from('users')
      .select('*') // Holt alle Spalten, inkl. profile_hashtags
      .eq('role', 'CREATOR')
      .order('followers_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(user => this.mapToUserProfile(user));
  }

  async updateUserStats(userId: string, stats: {
    totalEarnings?: number;
  }) {
    const updates: any = {};

    if (stats.totalEarnings !== undefined) {
      updates.total_earnings = stats.totalEarnings;
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
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
    };
  }
}

export const userService = new UserService();