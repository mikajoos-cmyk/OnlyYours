import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { storageService } from './storageService'; // Import hinzugefügt

type UserUpdate = Database['public']['Tables']['users']['Update'];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'fan' | 'creator' | 'admin';
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
  is_banned?: boolean;
}

export class AuthService {

  async register(username: string, email: string, password: string, country: string, birthdate: string, role: 'fan' | 'creator' = 'creator') {
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');

    if (cleanUsername.length < 3) {
      throw new Error("Benutzername muss mindestens 3 Zeichen lang sein (nur Buchstaben, Zahlen, _).");
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          full_name: username,
          role: role.toUpperCase(),
          country: country,
          birthdate: birthdate,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed - no user returned');

    return authData;
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername || cleanUsername.length < 3) return false;

    try {
      const { data: exists, error } = await supabase.rpc('check_username_exists', {
        username_to_check: cleanUsername
      });

      if (error) {
        console.warn("RPC check_username_exists failed:", error);
        return false;
      }
      return !exists;
    } catch (e) {
      return false;
    }
  }

  async checkEmailAvailability(email: string): Promise<boolean> {
    try {
      const { data: exists, error } = await supabase.rpc('check_email_exists', {
        email_to_check: email.toLowerCase().trim(),
      });
      if (error) return false;
      return !exists;
    } catch (e) {
      return false;
    }
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

  async loginWithOAuth(provider: 'google' | 'apple') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
    return data;
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('Login failed');

    let retries = 3;
    let userProfile = null;

    while (retries > 0 && !userProfile) {
      userProfile = await this.getCurrentUserFullProfile();
      if (!userProfile) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retries--;
      }
    }

    // @ts-ignore
    if (userProfile && userProfile.is_banned) {
      await this.logout();
      throw new Error('Ihr Konto wurde gesperrt. Bitte kontaktieren Sie den Support.');
    }

    if (!userProfile) {
      throw new Error('Login erfolgreich, aber Profil wird noch erstellt. Bitte gleich nochmal versuchen.');
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

    const freshUser = session.user;

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', freshUser.id)
      .single();

    if (error || !userData) {
      return null;
    }

    // --- FIX: Avatar URL auflösen, falls es ein Storage-Pfad ist ---
    if (userData.avatar_url && !userData.avatar_url.startsWith('http')) {
      const signedUrl = await storageService.getSignedUrl(userData.avatar_url);
      if (signedUrl) {
        userData.avatar_url = signedUrl;
      }
    }
    // --- ENDE FIX ---

    let decryptedEarnings = 0;
    try {
      const { data: earnings } = await supabase.rpc('get_my_decrypted_earnings', {
        p_user_id: freshUser.id
      });
      decryptedEarnings = earnings || 0;
    } catch (e) {
      // Earnings ignorieren bei Fehler
    }

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
      role: userData.role.toLowerCase() as 'fan' | 'creator' | 'admin',
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
      // @ts-ignore
      is_banned: userData.is_banned
    };
  }
}

export const authService = new AuthService();