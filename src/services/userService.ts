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
}

export class UserService {

  /**
   * (WIEDERHERGESTELLT) Ruft ein Benutzerprofil anhand seines eindeutigen @username ab.
   * Wird von der Creator-Profilseite (CreatorProfile.tsx) verwendet.
   */
  async getUserByUsername(username: string): Promise<UserProfile | null> {
    // Stellt sicher, dass die Abfrage immer kleingeschrieben erfolgt,
    // da Ihr DB-Schema dies für 'username' vorsieht.
    const normalizedUsername = username.toLowerCase();

    console.log("userService searching for username (lowercase):", normalizedUsername);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', normalizedUsername) // Sucht in der 'username'-Spalte
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
      .select('*')
      .eq('id', userId) // Sucht korrekt in der 'id'-Spalte
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToUserProfile(data);
  }

  async searchCreators(query: string, filters?: {
    minPrice?: number;
    maxPrice?: number;
    verified?: boolean;
    // --- HINWEIS: Filter (price/type) aus SearchPage sind hier nicht implementiert ---
  }) {
    let queryBuilder = supabase
      .from('users')
      .select('*')
      .eq('role', 'CREATOR')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);

    if (filters?.minPrice !== undefined) {
      queryBuilder = queryBuilder.gte('subscription_price', filters.minPrice);
    }

    if (filters?.maxPrice !== undefined) {
      queryBuilder = queryBuilder.lte('subscription_price', filters.maxPrice);
    }

    if (filters?.verified === true) {
      queryBuilder = queryBuilder.eq('is_verified', true);
    }

    const { data, error } = await queryBuilder
      .order('followers_count', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data || []).map(user => this.mapToUserProfile(user));
  }

  // Dies ist die Standardfunktion, die alle Creators lädt (sortiert nach Followern)
  async getTopCreators(limit: number = 20) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'CREATOR') // <-- Stellt sicher, dass nur Creators geladen werden
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
    };
  }
}

export const userService = new UserService();