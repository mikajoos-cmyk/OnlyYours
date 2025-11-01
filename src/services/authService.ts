// src/services/authService.ts
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
  followersCount: number;
  totalEarnings: number;
  username?: string;
  bio?: string;
  bannerUrl?: string | null;
  subscriptionPrice?: number;
}

export class AuthService {

  /**
   * (AKTUALISIERT) Registriert einen Benutzer.
   * Die Erstellung des 'public.users'-Profils wird jetzt
   * durch den Supabase DB-Trigger 'handle_new_user' übernommen.
   */
  async register(username: string, email: string, password: string, role: 'fan' | 'creator' = 'creator') {

    // --- KORREKTUR HIER ---
    // Wir übergeben alle Profildaten (username, display_name, role)
    // an die 'options.data', damit der DB-Trigger sie lesen kann.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase(),
          display_name: username, // Standardmäßig ist display_name gleich username
          role: role.toUpperCase(), // 'FAN' oder 'CREATOR'
        },
        // E-Mail-Bestätigung ist standardmäßig aktiviert
      },
    });
    // --- ENDE KORREKTUR ---

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');

    // Der manuelle .insert() Aufruf wird entfernt, da der DB-Trigger dies übernimmt.

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

  async checkUsernameAvailability(username: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("Error checking username:", error);
      return false;
    }

    return !data; // true (verfügbar), wenn data null ist
  }


  async login(email: string, password: string): Promise<AuthUser> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Login failed');

    const userProfile = await this.getCurrentUserFullProfile();
    if (!userProfile) throw new Error('User profile not found after login');

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

    // Nur fortfahren, wenn die E-Mail bestätigt wurde
    if (session.user.aud !== 'authenticated') {
        console.warn("User session found, but email not verified.");
        return null;
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !userData) {
        console.error("Fehler beim Abrufen des vollen Profils:", error);
        return null;
    }

    return this.mapUserRowToAuthUser(userData, session.user.email);
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
        // Nur als eingeloggt betrachten, wenn die E-Mail bestätigt ist
        if (session?.user && session.user.aud === 'authenticated') {
          const user = await this.getCurrentUserFullProfile();
          callback(user);
        } else {
          callback(null);
        }
      })();
    });
  }

  private mapUserRowToAuthUser(userData: UserRow, email?: string): AuthUser {
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
    };
  }
}

export const authService = new AuthService();