// src/services/authService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

// Dieses Interface spiegelt das volle Profil wider, das der authStore halten soll
export interface AuthUser {
  id: string;
  name: string; // display_name
  email: string;
  avatar: string;
  role: 'fan' | 'creator';
  isVerified?: boolean;
  followersCount: number;
  totalEarnings: number;
  // --- Erweiterte Felder für Profilseiten ---
  username?: string;
  bio?: string;
  bannerUrl?: string | null;
  subscriptionPrice?: number;
}

export class AuthService {
  async register(username: string, email: string, password: string, role: 'fan' | 'creator' = 'creator') {
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
        role: role.toUpperCase() as 'CREATOR', // Standard-DB-Enum
        bio: '',
        is_verified: false,
      });

    if (profileError) throw profileError;

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

  async login(email: string, password: string): Promise<AuthUser> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Login failed');

    // Verwende die neue Full-Profile-Funktion
    const userProfile = await this.getCurrentUserFullProfile();
    if (!userProfile) throw new Error('User profile not found after login');

    return userProfile;
  }

  async logout() {
    const { error } = await supabase.signOut();
    if (error) throw error;
  }

  /**
   * (ALT) Beibehalten für Kompatibilität, falls noch woanders genutzt,
   * leitet aber jetzt auf die neue Funktion um.
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    return this.getCurrentUserFullProfile();
  }

  /**
   * (NEU) Lädt das vollständige Benutzerprofil aus der 'users'-Tabelle
   */
  async getCurrentUserFullProfile(): Promise<AuthUser | null> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) return null;

    const { data: userData, error } = await supabase
      .from('users')
      .select('*') // Holt alle Felder
      .eq('id', session.user.id)
      .single();

    if (error || !userData) {
        console.error("Fehler beim Abrufen des vollen Profils:", error);
        return null;
    }

    // Verwende die map-Funktion, die *alle* Felder mappt
    return this.mapUserRowToAuthUser(userData, session.user.email);
  }

  /**
   * (AKTUALISIERT) Akzeptiert jetzt die neuen Felder
   */
  async updateProfile(userId: string, updates: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    banner_url?: string;
    subscription_price?: number;
  }) {
    const { data, error } = await supabase
      .from('users')
      .update(updates) // 'updates' wird direkt durchgereicht
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * (NEU) Ändert das Passwort des angemeldeten Benutzers
   */
  async changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  /**
   * (AKTUALISIERT) Verwendet jetzt getCurrentUserFullProfile
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          // Ruft die neue Funktion auf, um das volle Profil zu laden
          const user = await this.getCurrentUserFullProfile();
          callback(user);
        } else {
          callback(null);
        }
      })();
    });
  }

  /**
   * (AKTUALISIERT) Mappt alle Felder von der DB-Zeile zum AuthUser-Interface
   */
  private mapUserRowToAuthUser(userData: UserRow, email?: string): AuthUser {
    return {
      id: userData.id,
      name: userData.display_name,
      email: email || '', // E-Mail von der Auth-Session übergeben
      avatar: userData.avatar_url || 'https://placehold.co/100x100',
      role: userData.role.toLowerCase() as 'fan' | 'creator',
      isVerified: userData.is_verified,
      followersCount: userData.followers_count || 0,
      totalEarnings: userData.total_earnings || 0,
      // --- Erweiterte Felder ---
      username: userData.username,
      bio: userData.bio,
      bannerUrl: userData.banner_url,
      subscriptionPrice: userData.subscription_price,
    };
  }
}

export const authService = new AuthService();