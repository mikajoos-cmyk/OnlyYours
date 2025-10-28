import { create } from 'zustand';
import { authService } from '../services/authService';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'fan' | 'creator';
  isVerified?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role?: 'fan' | 'creator') => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  updateProfile: (updates: { display_name?: string; bio?: string; avatar_url?: string; banner_url?: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  initialize: async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        set({ isAuthenticated: true, user, isLoading: false });
      } else {
        set({ isAuthenticated: false, user: null, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isAuthenticated: false, user: null, isLoading: false });
    }

    authService.onAuthStateChange((user) => {
      if (user) {
        set({ isAuthenticated: true, user });
      } else {
        set({ isAuthenticated: false, user: null });
      }
    });
  },
  login: async (email: string, password: string) => {
    try {
      const user = await authService.login(email, password);
      set({ isAuthenticated: true, user });
    } catch (error) {
      console.error('Login failed:', error);
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
      await authService.logout();
      set({ isAuthenticated: false, user: null });
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  },
  setUser: (user: User) => {
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
