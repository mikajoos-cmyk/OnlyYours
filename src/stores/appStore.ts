// src/stores/appStore.ts
import { create } from 'zustand';

interface AppState {
  hasCompletedOnboarding: boolean;
  currentRole: 'fan' | 'creator';
  completeOnboarding: () => void;
  switchRole: (role: 'fan' | 'creator') => void;
  resetOnboarding: () => void;
}

// Funktion zum Lesen aus localStorage (außerhalb, um sicher aufzurufen)
const checkOnboardingStatus = (): boolean => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('onlyyours_onboarding') === 'true';
  }
  return false; // Fallback, falls localStorage nicht verfügbar ist
};

// --- NEU: Funktion zum Lesen der Rolle aus localStorage ---
const getInitialRole = (): 'fan' | 'creator' => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedRole = localStorage.getItem('onlyyours_current_role');
    if (storedRole === 'creator') {
      return 'creator';
    }
  }
  return 'fan'; // Standard-Fallback
};
// --- ENDE NEU ---


export const useAppStore = create<AppState>((set) => ({
  // Initialisiere den State direkt aus localStorage
  hasCompletedOnboarding: checkOnboardingStatus(),
  currentRole: getInitialRole(), // <-- KORREKTUR: Initialen Status aus localStorage setzen

  completeOnboarding: () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            console.log("[appStore] Setting onboarding to 'true' in localStorage.");
            localStorage.setItem('onlyyours_onboarding', 'true');
            set({ hasCompletedOnboarding: true });
        }
    } catch (e) {
        console.error("Failed to write onboarding status to localStorage", e);
    }
  },

  // --- KORREKTUR: Rolle im localStorage speichern ---
  switchRole: (role: 'fan' | 'creator') => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            // Speichere die Auswahl im localStorage
            localStorage.setItem('onlyyours_current_role', role);
        }
    } catch (e) {
        console.error("Failed to write role to localStorage", e);
    }
    // Setze den State in der App
    set({ currentRole: role });
  },
  // --- ENDE KORREKTUR ---

  /**
   * Setzt den Onboarding-Status UND die Rolle im localStorage und im State zurück.
   * (Wird bei Logout aufgerufen)
   */
  resetOnboarding: () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            // Onboarding-Status zurücksetzen
            if (localStorage.getItem('onlyyours_onboarding') === 'true') {
                 localStorage.removeItem('onlyyours_onboarding');
                 set({ hasCompletedOnboarding: false });
                 console.log("[appStore] Onboarding status RESET.");
            }

            // --- KORREKTUR: Rolle beim Logout zurücksetzen ---
            if (localStorage.getItem('onlyyours_current_role')) {
                localStorage.removeItem('onlyyours_current_role');
                // Setze den State zurück auf 'fan'
                set({ currentRole: 'fan' });
                console.log("[appStore] Role RESET to fan.");
            } else {
                // Nur zur Sicherheit, falls localStorage schon leer ist
                set({ currentRole: 'fan' });
            }
            // --- ENDE KORREKTUR ---
        }
    } catch (e) {
        console.error("Failed to reset app state in localStorage", e);
    }
  }
}));