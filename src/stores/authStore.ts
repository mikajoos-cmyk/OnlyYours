// src/stores/authStore.ts
import { create } from 'zustand';
import { authService, AuthUser } from '../services/authService';
import { Subscription } from '@supabase/supabase-js';

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
  }) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;

  // --- NEUE METHODEN ---
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  verifyOtp: (email: string, token: string) => Promise<any>;
  resendOtp: (email: string) => Promise<void>;
  // --- ENDE NEUE METHODEN ---
}

let authListenerSubscription: Subscription | null = null;
let initializationEnsured = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,

  initialize: () => {
    if (initializationEnsured && authListenerSubscription) {
      console.log("Auth listener already initialized. Skipping.");
      return () => { /* No-op */ };
    }
     if (!authListenerSubscription) {
        console.log("Initializing auth listener...");

        const { data: { subscription } } = authService.onAuthStateChange(async (userFullProfile: AppUser | null) => {
          console.log("Auth state change received in store:", userFullProfile);

          set({
            isAuthenticated: !!userFullProfile,
            user: userFullProfile,
            isLoading: false
          });

          console.log("Auth state updated:", { isAuthenticated: !!userFullProfile, user: userFullProfile, isLoading: false });
          initializationEnsured = true;
        });

        authListenerSubscription = subscription;
     }

    return () => {
      console.log("Running unsubscribe function returned by initialize...");
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

  // --- IMPLEMENTIERUNG DER NEUEN METHODEN ---
  checkUsernameAvailability: async (username: string) => {
    return authService.checkUsernameAvailability(username);
  },

  verifyOtp: async (email: string, token: string) => {
    return authService.verifyOtp(email, token);
  },

  resendOtp: async (email: string) => {
    return authService.resendOtp(email);
  }
  // --- ENDE IMPLEMENTIERUNG ---
}));