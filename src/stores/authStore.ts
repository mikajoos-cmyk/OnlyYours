import { create } from 'zustand';

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
  initialize: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  initialize: () => {
    const stored = localStorage.getItem('onlyyours_auth');
    if (stored) {
      const { user } = JSON.parse(stored);
      set({ isAuthenticated: true, user });
    }
  },
  login: async (email: string, password: string) => {
    // In a real app, you'd call your API here.
    // For simulation, we'll create a dummy user.
    const user: User = {
      id: '1',
      name: 'Demo User',
      email,
      avatar: 'https://placehold.co/100x100',
      role: 'fan',
      isVerified: true, // Assume user is verified on login
    };
    localStorage.setItem('onlyyours_auth', JSON.stringify({ user }));
    set({ isAuthenticated: true, user });
  },
  register: async (username: string, email: string, password: string) => {
    // Simulate API call
    console.log('Registering user:', { username, email, password });
    // In a real app, you would get the user object back from the API.
    // For now, we don't log the user in automatically after registration.
    // The user will have to verify their email first.
    return Promise.resolve();
  },
  logout: () => {
    localStorage.removeItem('onlyyours_auth');
    set({ isAuthenticated: false, user: null });
  },
  setUser: (user: User) => {
    localStorage.setItem('onlyyours_auth', JSON.stringify({ user }));
    set({ user });
  },
}));
