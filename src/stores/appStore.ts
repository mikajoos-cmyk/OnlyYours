import { create } from 'zustand';

interface AppState {
  hasCompletedOnboarding: boolean;
  currentRole: 'fan' | 'creator';
  completeOnboarding: () => void;
  switchRole: (role: 'fan' | 'creator') => void;
}

export const useAppStore = create<AppState>((set) => ({
  hasCompletedOnboarding: false,
  currentRole: 'fan',
  completeOnboarding: () => {
    localStorage.setItem('onlyyours_onboarding', 'true');
    set({ hasCompletedOnboarding: true });
  },
  switchRole: (role: 'fan' | 'creator') => set({ currentRole: role }),
}));
