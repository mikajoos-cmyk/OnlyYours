// src/stores/authStore.ts
import { create } from 'zustand';
import { authService, AuthUser } from '../services/authService';
import { Subscription } from '@supabase/supabase-js';
import { useAppStore } from './appStore';

interface AppUser extends AuthUser {}

interface AuthState {
  isAuthenticated: boolean;
  user: AppUser | null;
  isLoading: boolean;
  initialize: () => () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role?: 'fan' | 'creator') => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AppUser) => void;
  updateProfile: (updates: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    banner_url?: string;
    subscription_price?: number;
    role?: 'FAN' | 'CREATOR';
    welcome_message?: string;
    profile_hashtags?: string[]; // <-- Von CreatorProfile
    live_stream_tier_id?: string | null; // <-- Von StreamConfigModal
    live_stream_requires_subscription?: boolean; // <-- Von StreamConfigModal
    is_live?: boolean; // <-- Von StreamConfigModal
  }) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  checkEmailAvailability: (email: string) => Promise<boolean>;
  verifyOtp: (email: string, token: string) => Promise<any>;
  resendOtp: (email: string) => Promise<void>;
}

let authListenerSubscription: Subscription | null = null;
let initializationEnsured = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,

  initialize: () => {
    if (initializationEnsured && authListenerSubscription) {
      console.log("[authStore] Auth listener already initialized. Skipping.");
      return () => { /* No-op */ };
    }
     if (!authListenerSubscription) {
        console.log("[authStore] Initializing auth listener...");

        const authSubscription = authService.onAuthStateChange(async (userFullProfile: AppUser | null) => {
          console.log("[authStore] Auth state change received:", userFullProfile);

          if (userFullProfile) {
            set({
              isAuthenticated: true,
              user: userFullProfile,
              isLoading: false
            });
            useAppStore.getState().completeOnboarding();
            console.log("[authStore] User is Authenticated. Onboarding marked complete.");
          } else {
            set({
              isAuthenticated: false,
              user: null,
              isLoading: false
            });
            useAppStore.getState().resetOnboarding();
            console.log("[authStore] User is NOT Authenticated. Onboarding reset.");
          }

          initializationEnsured = true;
        });

        authListenerSubscription = authSubscription.data.subscription;
     }

    return () => {
      console.log("[authStore] Running unsubscribe function returned by initialize...");
      if (authListenerSubscription) {
        authListenerSubscription.unsubscribe();
        authListenerSubscription = null;
        initializationEnsured = false;
        console.log("Auth listener unsubscribed.");
      }
    };
  },

  login: async (email: string, password: string) => {
    try {
      await authService.login(email, password);
    } catch (error) {
      console.error('Login failed:', error);
      set({ isAuthenticated: false, user: null });
      throw error;
    }
  },
  register: async (username: string, email: string, password: string, role: 'fan' | 'creator' = 'fan') => {
    try {
      await authService.register(username, email, password, role);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },
  logout: async () => {
    try {
       console.log("Calling authService.logout...");
      await authService.logout();
      set({ isAuthenticated: false, user: null });
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  },
  setUser: (user: AppUser) => {
    set({ user });
  },

  updateProfile: async (updates) => {
    const currentUser = get().user;
    if (!currentUser) throw new Error('Not authenticated');
    try {
      await authService.updateProfile(currentUser.id, updates);

      // Profil neu laden, um alle Änderungen (inkl. der neuen Stream-Settings) zu übernehmen
      const updatedUser = await authService.getCurrentUserFullProfile();
      if (updatedUser) {
        set({ user: updatedUser });
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  },

  changePassword: async (newPassword: string) => {
    try {
      await authService.changePassword(newPassword);
    } catch (error) {
       console.error('Password change failed:', error);
       throw error;
    }
  },

  checkUsernameAvailability: async (username: string) => {
    return authService.checkUsernameAvailability(username);
  },
  checkEmailAvailability: async (email: string) => {
    return authService.checkEmailAvailability(email);
  },
  verifyOtp: async (email: string, token: string) => {
    return authService.verifyOtp(email, token);
  },
  resendOtp: async (email: string) => {
    return authService.resendOtp(email);
  }
}));