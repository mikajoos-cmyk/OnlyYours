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
  async getUserByUsername(username: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

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

  async searchCreators(query: string, filters?: {
    minPrice?: number;
    maxPrice?: number;
    verified?: boolean;
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

  async getTopCreators(limit: number = 20) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
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
    };
  }
}

export const userService = new UserService();
