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


export const useAppStore = create<AppState>((set) => ({
  // Initialisiere den State direkt aus localStorage
  hasCompletedOnboarding: checkOnboardingStatus(),
  currentRole: 'fan',
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
  switchRole: (role: 'fan' | 'creator') => set({ currentRole: role }),

  /**
   * Setzt den Onboarding-Status im localStorage und im State zurück.
   */
  resetOnboarding: () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            // Nur zurücksetzen, wenn es nicht schon false ist
            if (localStorage.getItem('onlyyours_onboarding') === 'true') {
                 localStorage.removeItem('onlyyours_onboarding');
                 set({ hasCompletedOnboarding: false });
                 console.log("[appStore] Onboarding status RESET.");
            }
        }
    } catch (e) {
        console.error("Failed to reset onboarding status in localStorage", e);
    }
  }
}));