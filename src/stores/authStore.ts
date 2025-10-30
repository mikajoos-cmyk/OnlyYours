// src/stores/authStore.ts
import { create } from 'zustand';
import { authService, AuthUser } from '../services/authService';
import { Subscription } from '@supabase/supabase-js'; // Subscription Typ importieren

// Interface (ggf. anpassen oder importieren)
interface AppUser extends AuthUser {
  // Zukünftige, App-spezifische User-Eigenschaften können hier hin
  // Die neuen Felder `followersCount` und `totalEarnings`
  // werden bereits durch `AuthUser` abgedeckt.
}

interface AuthState {
  isAuthenticated: boolean;
  user: AppUser | null;
  isLoading: boolean; // Initialer Ladezustand
  initialize: () => () => void; // Gibt jetzt die Unsubscribe-Funktion zurück
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role?: 'fan' | 'creator') => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AppUser) => void;
  updateProfile: (updates: { display_name?: string; bio?: string; avatar_url?: string; banner_url?: string }) => Promise<void>;
}

// Variable außerhalb des Stores, um das Abonnement zu halten (wird nicht bei jedem Render neu erstellt)
let authListenerSubscription: Subscription | null = null;
let initializationEnsured = false; // Flag um sicherzustellen, dass die Logik nur einmal pro "echtem" Mount läuft

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true, // Starte immer mit isLoading = true

  initialize: () => {
    // ... (Rest der initialize-Funktion bleibt unverändert) ...
    if (initializationEnsured && authListenerSubscription) {
      console.log("Auth listener already initialized. Skipping.");
      return () => { /* No-op, da der eigentliche Unsubscriber schon zurückgegeben wurde */ };
    }
     if (!authListenerSubscription) {
        console.log("Initializing auth listener...");

        const { data: { subscription } } = authService.onAuthStateChange(async (userAuthData: AppUser | null) => {
          console.log("Auth state change received in store:", userAuthData);
          const currentlyLoading = get().isLoading;

          let finalUser: AppUser | null = null;
          let finalIsAuthenticated = false;

          if (userAuthData) {
            const userProfile = await authService.getCurrentUser();
            if (userProfile) {
              finalUser = userProfile;
              finalIsAuthenticated = true;
            } else {
              console.error("Authenticated user found by Supabase, but profile data missing!");
               await authService.logout();
               finalUser = null;
               finalIsAuthenticated = false;
            }
          } else {
            finalUser = null;
            finalIsAuthenticated = false;
          }

          set({
            isAuthenticated: finalIsAuthenticated,
            user: finalUser,
            isLoading: currentlyLoading ? false : get().isLoading
          });

          console.log("Auth state updated:", { isAuthenticated: finalIsAuthenticated, user: finalUser, isLoading: get().isLoading });
          initializationEnsured = true;
        });

        authListenerSubscription = subscription;
     } else {
         console.log("Auth listener subscription already exists.");
     }


    return () => {
      console.log("Running unsubscribe function returned by initialize...");
      if (authListenerSubscription) {
        authListenerSubscription.unsubscribe();
        authListenerSubscription = null;
        initializationEnsured = false;
        console.log("Auth listener unsubscribed.");
      } else {
          console.log("No active auth listener subscription to unsubscribe from.");
      }
    };
  },

  login: async (email: string, password: string) => {
    try {
      const user = await authService.login(email, password);
      // State wird durch onAuthStateChange aktualisiert
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
      set({ isAuthenticated: false, user: null }); // Setze sofort für UI Feedback
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
      const updatedUser = await authService.getCurrentUser();
      if (updatedUser) {
        set({ user: updatedUser });
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  },
}));