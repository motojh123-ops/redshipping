import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, type AuthUser } from './authStore';

const mockUser: AuthUser = {
  id: 'user-1',
  name: 'عمر البنا',
  email: 'admin@banna-logistics.com',
  role: 'company_admin',
  companyId: 'comp-demo-1',
  companyName: 'Banna Logistics',
  currencyDefault: 'USD',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store to a logged-out state between tests
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('starts unauthenticated when localStorage is empty', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('persists session to localStorage on login and marks authenticated', () => {
    useAuthStore.getState().login(mockUser, 'access-token-1', 'refresh-token-1');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('access-token-1');
    expect(state.isAuthenticated).toBe(true);

    expect(JSON.parse(localStorage.getItem('banna_user')!)).toEqual(mockUser);
    expect(localStorage.getItem('banna_access_token')).toBe('access-token-1');
    expect(localStorage.getItem('banna_refresh_token')).toBe('refresh-token-1');
  });

  it('clears the session from localStorage and state on logout', () => {
    useAuthStore.getState().login(mockUser, 'access-token-1', 'refresh-token-1');

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('banna_user')).toBeNull();
    expect(localStorage.getItem('banna_access_token')).toBeNull();
    expect(localStorage.getItem('banna_refresh_token')).toBeNull();
  });
});
