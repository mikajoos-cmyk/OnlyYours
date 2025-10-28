import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'fan' | 'creator';
  isVerified?: boolean;
}

export class AuthService {
  async register(username: string, email: string, password: string, role: 'fan' | 'creator' = 'fan') {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          role,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');

    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        username: username.toLowerCase(),
        display_name: username,
        role: role.toUpperCase() as 'FAN' | 'CREATOR',
        bio: '',
        is_verified: false,
      });

    if (profileError) throw profileError;

    return authData;
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Login failed');

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) throw userError;
    if (!userData) throw new Error('User profile not found');

    return this.mapUserToAuthUser(userData);
  }

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) return null;

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !userData) return null;

    return this.mapUserToAuthUser(userData);
  }

  async updateProfile(userId: string, updates: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    banner_url?: string;
    subscription_price?: number;
  }) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          const user = await this.getCurrentUser();
          callback(user);
        } else {
          callback(null);
        }
      })();
    });
  }

  private mapUserToAuthUser(userData: UserRow): AuthUser {
    return {
      id: userData.id,
      name: userData.display_name,
      email: '',
      avatar: userData.avatar_url || 'https://placehold.co/100x100',
      role: userData.role.toLowerCase() as 'fan' | 'creator',
      isVerified: userData.is_verified,
    };
  }
}

export const authService = new AuthService();
