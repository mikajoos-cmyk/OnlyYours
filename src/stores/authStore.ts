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
  loginWithOAuth: (provider: 'google' | 'apple') => Promise<void>; // <-- NEU
  register: (username: string, email: string, password: string, role?: 'fan' | 'creator') => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AppUser) => void;
  updateProfile: (updates: any) => Promise<void>;
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
      return () => { };
    }
     if (!authListenerSubscription) {
        const authSubscription = authService.onAuthStateChange(async (userFullProfile: AppUser | null) => {
          if (userFullProfile) {
            set({
              isAuthenticated: true,
              user: userFullProfile,
              isLoading: false
            });
            useAppStore.getState().completeOnboarding();
          } else {
            set({
              isAuthenticated: false,
              user: null,
              isLoading: false
            });
            useAppStore.getState().resetOnboarding();
          }
          initializationEnsured = true;
        });
        authListenerSubscription = authSubscription.data.subscription;
     }

    return () => {
      if (authListenerSubscription) {
        authListenerSubscription.unsubscribe();
        authListenerSubscription = null;
        initializationEnsured = false;
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

  // --- NEU: OAuth Handler ---
  loginWithOAuth: async (provider: 'google' | 'apple') => {
    try {
      await authService.loginWithOAuth(provider);
      // Hinweis: Da OAuth einen Redirect auslöst, wird der Code hiernach oft nicht mehr ausgeführt,
      // bis der User zurückkehrt (handled by onAuthStateChange).
    } catch (error) {
      console.error('OAuth Login failed:', error);
      throw error;
    }
  },
  // --- ENDE NEU ---

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