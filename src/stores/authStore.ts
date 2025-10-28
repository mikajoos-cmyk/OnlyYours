// src/stores/authStore.ts
import { create } from 'zustand';
import { authService, AuthUser } from '../services/authService';
import { Subscription } from '@supabase/supabase-js'; // Subscription Typ importieren

// Interface (ggf. anpassen oder importieren)
interface AppUser extends AuthUser {}

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
    // Wenn der Listener bereits aktiv ist (z.B. durch StrictMode double mount), nichts tun und Dummy-Unsubscribe zurückgeben
    if (initializationEnsured && authListenerSubscription) {
      console.log("Auth listener already initialized. Skipping.");
      return () => { /* No-op, da der eigentliche Unsubscriber schon zurückgegeben wurde */ };
    }
     if (!authListenerSubscription) { // Nur abonnieren, wenn noch kein Listener aktiv ist
        console.log("Initializing auth listener...");

        const { data: { subscription } } = authService.onAuthStateChange(async (userAuthData: AppUser | null) => {
          console.log("Auth state change received in store:", userAuthData);
          const currentlyLoading = get().isLoading; // Prüfen, ob dies der *initiale* Ladevorgang ist

          let finalUser: AppUser | null = null;
          let finalIsAuthenticated = false;

          if (userAuthData) {
            // Hole *immer* das aktuellste Profil, da userAuthData ggf. veraltet sein kann
            const userProfile = await authService.getCurrentUser();
            if (userProfile) {
              finalUser = userProfile;
              finalIsAuthenticated = true;
            } else {
              console.error("Authenticated user found by Supabase, but profile data missing!");
              // In diesem Fall den Benutzer ausloggen, um inkonsistenten Zustand zu beheben
               await authService.logout(); // Führt dazu, dass dieser Callback erneut mit null aufgerufen wird
               finalUser = null;
               finalIsAuthenticated = false;
            }
          } else {
            finalUser = null;
            finalIsAuthenticated = false;
          }

          // Setze isLoading nur beim *ersten* Mal auf false, wenn der Status geklärt ist
          set({
            isAuthenticated: finalIsAuthenticated,
            user: finalUser,
            isLoading: currentlyLoading ? false : get().isLoading // Nur auf false setzen, wenn wir initial geladen haben
          });

          console.log("Auth state updated:", { isAuthenticated: finalIsAuthenticated, user: finalUser, isLoading: get().isLoading });
          initializationEnsured = true; // Markieren, dass die erste Prüfung durch ist
        });

        authListenerSubscription = subscription; // Das aktive Abonnement speichern
     } else {
         console.log("Auth listener subscription already exists.");
     }


    // Gib die Unsubscribe-Funktion zurück
    return () => {
      console.log("Running unsubscribe function returned by initialize...");
      if (authListenerSubscription) {
        authListenerSubscription.unsubscribe();
        authListenerSubscription = null; // Wichtig: Zurücksetzen, damit es neu erstellt werden kann
        initializationEnsured = false; // Zurücksetzen für den Fall eines echten Unmounts/Remounts
        console.log("Auth listener unsubscribed.");
        // Setze isLoading NICHT zurück, nur der initiale Load sollte es tun.
      } else {
          console.log("No active auth listener subscription to unsubscribe from.");
      }
    };
  },

  // --- login, register, logout, setUser, updateProfile bleiben wie zuvor ---
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