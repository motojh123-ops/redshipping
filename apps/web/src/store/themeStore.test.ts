import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from './themeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    useThemeStore.setState({ theme: 'dark', isDark: true });
  });

  it('defaults to dark theme', () => {
    const state = useThemeStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.isDark).toBe(true);
  });

  it('toggles between dark and light, updating the DOM class and localStorage', () => {
    useThemeStore.getState().toggleTheme();

    expect(useThemeStore.getState().theme).toBe('light');
    expect(useThemeStore.getState().isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('banna_theme')).toBe('light');

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('applies an explicit theme via setTheme and persists it', () => {
    useThemeStore.getState().setTheme('light');

    expect(useThemeStore.getState().theme).toBe('light');
    expect(localStorage.getItem('banna_theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('resolves the system preference for the system mode', () => {
    useThemeStore.getState().setTheme('system');

    // The jsdom matchMedia stub reports "light" (matches: false)
    expect(useThemeStore.getState().theme).toBe('system');
    expect(useThemeStore.getState().isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
