// src/services/authService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type UserUpdate = Database['public']['Tables']['users']['Update'];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'fan' | 'creator';
  isVerified?: boolean;
  followersCount: number;
  totalEarnings: number;
  username?: string;
  bio?: string;
  bannerUrl?: string | null;
  subscriptionPrice?: number;
  welcomeMessage?: string;
  profileHashtags?: string[] | null;
  interests?: string[] | null;
  mux_stream_key?: string | null;
  mux_playback_id?: string | null;
  is_live?: boolean;
  live_stream_tier_id?: string | null;
  live_stream_requires_subscription?: boolean;
  stripe_account_id?: string;
  stripe_onboarding_complete?: boolean;
}

export class AuthService {

  async register(username: string, email: string, password: string, role: 'fan' | 'creator' = 'creator') {
    console.log("[authService] register CALLED");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase(),
          display_name: username,
          role: role.toUpperCase(),
        },
      },
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');
    return authData;
  }

  async verifyOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
    return data;
  }

  async resendOtp(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    if (error) throw error;
  }

  // --- NEU: OAuth Login (Apple/Google) ---
  async loginWithOAuth(provider: 'google' | 'apple') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin, // Kehrt nach Login zur App zurück
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
    return data;
  }
  // --- ENDE NEU ---

  async checkUsernameAvailability(username: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username.toLowerCase())
      .maybeSingle();
    if (error) return false;
    return !data;
  }

  async checkEmailAvailability(email: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_email_exists', {
      email_to_check: email.toLowerCase(),
    });
    if (error) return false;
    return !data;
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('Login failed');

    const userProfile = await this.getCurrentUserFullProfile();
    if (!userProfile) {
      throw new Error('E-Mail-Adresse noch nicht bestätigt oder Profil fehlt.');
    }
    return userProfile;
  }

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return this.getCurrentUserFullProfile();
  }

  async getCurrentUserFullProfile(): Promise<AuthUser | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    if (!freshUser?.email_confirmed_at) return null;

    // 1. Profildaten laden (ohne Earnings, da binär/verschlüsselt)
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', freshUser.id)
      .single();

    if (error || !userData) {
        console.error("Error fetching profile:", error);
        return null;
    }

    // 2. Einnahmen sicher entschlüsseln
    let decryptedEarnings = 0;
    try {
        const { data: earnings } = await supabase.rpc('get_my_decrypted_earnings', {
            p_user_id: freshUser.id
        });
        decryptedEarnings = earnings || 0;
    } catch (e) {
        console.error("Error decrypting earnings:", e);
    }

    // 3. Zusammenfügen
    const safeUserData = {
        ...userData,
        total_earnings: decryptedEarnings
    };

    return this.mapUserRowToAuthUser(safeUserData, freshUser.email);
  }

  async updateProfile(userId: string, updates: Partial<UserUpdate>) {
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
          const user = await this.getCurrentUserFullProfile();
          callback(user);
        } else {
          callback(null);
        }
      })();
    });
  }

  private mapUserRowToAuthUser(userData: any, email?: string): AuthUser {
    return {
      id: userData.id,
      name: userData.display_name,
      email: email || '',
      avatar: userData.avatar_url || 'https://placehold.co/100x100',
      role: userData.role.toLowerCase() as 'fan' | 'creator',
      isVerified: userData.is_verified,
      followersCount: userData.followers_count || 0,
      totalEarnings: userData.total_earnings || 0,
      username: userData.username,
      bio: userData.bio,
      bannerUrl: userData.banner_url,
      subscriptionPrice: userData.subscription_price,
      welcomeMessage: userData.welcome_message || '',
      profileHashtags: userData.profile_hashtags || [],
      interests: userData.interests || [],
      mux_stream_key: userData.mux_stream_key,
      mux_playback_id: userData.mux_playback_id,
      is_live: userData.is_live,
      live_stream_tier_id: userData.live_stream_tier_id,
      live_stream_requires_subscription: userData.live_stream_requires_subscription,
      stripe_account_id: userData.stripe_account_id,
      stripe_onboarding_complete: userData.stripe_onboarding_complete,
    };
  }
}

export const authService = new AuthService();