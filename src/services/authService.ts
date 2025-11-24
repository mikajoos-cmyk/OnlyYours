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
  profileHashtags?: string[] | null; // Creator-Tags
  interests?: string[] | null;       // NEU: Fan-Interessen
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
    console.log("[authService] register SUCCEEDED. User needs to verify email.");
    return authData;
  }

  async verifyOtp(email: string, token: string) {
    console.log("[authService] verifyOtp CALLED");
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) {
       console.error("[authService] verifyOtp FAILED:", error);
       throw error;
    }
    console.log("[authService] verifyOtp SUCCEEDED.");
    return data;
  }

  async resendOtp(email: string) {
    console.log("[authService] resendOtp CALLED");
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    if (error) throw error;
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    console.log(`[authService] checkUsernameAvailability: ${username}`);
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username.toLowerCase())
      .maybeSingle();
    if (error) {
      console.error("Error checking username:", error);
      return false;
    }
    console.log(`[authService] Username available: ${!data}`);
    return !data;
  }

  async checkEmailAvailability(email: string): Promise<boolean> {
    console.log(`[authService] checkEmailAvailability: ${email}`);
    const { data, error } = await supabase.rpc('check_email_exists', {
      email_to_check: email.toLowerCase(),
    });
    if (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
    console.log(`[authService] Email available: ${!data}`);
    return !data;
  }

  async login(email: string, password: string): Promise<AuthUser> {
    console.log("[authService] login CALLED");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('Login failed');

    const userProfile = await this.getCurrentUserFullProfile();

    if (!userProfile) {
      console.error("[authService] login FAILED: User profile not found or email not confirmed after login.");
      throw new Error('E-Mail-Adresse noch nicht bestätigt. Bitte prüfen Sie Ihr Postfach.');
    }

    console.log("[authService] login SUCCEEDED and profile fetched.");
    return userProfile;
  }

  async logout() {
    console.log("[authService] logout CALLED");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return this.getCurrentUserFullProfile();
  }

  async getCurrentUserFullProfile(): Promise<AuthUser | null> {
    console.log("[authService] getCurrentUserFullProfile CALLED");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log("[authService] No session found. Returning null.");
      return null;
    }

    const { data: { user: freshUser }, error: userError } = await supabase.auth.getUser();

    if (userError || !freshUser) {
       console.warn("[authService] Error fetching fresh user (auth.getUser):", userError);
       return null;
    }

    console.log(`[authService] Fresh user email_confirmed_at: ${freshUser.email_confirmed_at}`);
    if (!freshUser.email_confirmed_at) {
      console.warn("[authService] User email NOT confirmed. Returning null.");
      return null;
    }

    console.log("[authService] User email IS confirmed. Fetching public.users profile.");
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', freshUser.id)
      .single();

    if (error || !userData) {
        console.error("[authService] Error fetching public.users profile:", error);
        return null;
    }

    console.log("[authService] Successfully fetched full profile.");
    return this.mapUserRowToAuthUser(userData, freshUser.email);
  }

  async updateProfile(userId: string, updates: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    banner_url?: string;
    subscription_price?: number;
    role?: 'FAN' | 'CREATOR';
    welcome_message?: string;
    profile_hashtags?: string[];
    interests?: string[]; // <-- NEU
    live_stream_tier_id?: string | null;
    live_stream_requires_subscription?: boolean;
    is_live?: boolean;
  }) {
    const dbUpdates: UserUpdate = { ...updates };

    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
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
      console.log(`[authService] onAuthStateChange FIRED. Event: ${_event}, Session: ${!!session}`);
      (async () => {
        if (session?.user) {
          console.log("[authService] Session found, checking full profile (incl. email verification)...");
          const user = await this.getCurrentUserFullProfile();
          callback(user);
        } else {
          console.log("[authService] No session. Calling callback(null).");
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
      interests: userData.interests || [], // <-- NEU: Interessen mappen
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