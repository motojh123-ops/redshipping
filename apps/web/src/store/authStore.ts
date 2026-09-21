import { create } from 'zustand';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  companyName: string;
  currencyDefault: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const savedUser = localStorage.getItem('banna_user');
  const savedToken = localStorage.getItem('banna_access_token');

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    token: savedToken || null,
    isAuthenticated: !!savedToken,

    login: (user, token, refreshToken) => {
      localStorage.setItem('banna_user', JSON.stringify(user));
      localStorage.setItem('banna_access_token', token);
      localStorage.setItem('banna_refresh_token', refreshToken);
      set({ user, token, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem('banna_user');
      localStorage.removeItem('banna_access_token');
      localStorage.removeItem('banna_refresh_token');
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});
