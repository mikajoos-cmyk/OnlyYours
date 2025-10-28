import { create } from 'zustand';

interface AppState {
  hasCompletedOnboarding: boolean;
  currentRole: 'fan' | 'creator';
  completeOnboarding: () => void;
  switchRole: (role: 'fan' | 'creator') => void;
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
  currentRole: 'fan', // Standardrolle beibehalten
  completeOnboarding: () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('onlyyours_onboarding', 'true');
            set({ hasCompletedOnboarding: true });
        }
    } catch (e) {
        console.error("Failed to write onboarding status to localStorage", e);
    }
  },
  switchRole: (role: 'fan' | 'creator') => set({ currentRole: role }),
}));