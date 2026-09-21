import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('banna_theme') as ThemeMode;
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'dark'; // Default to sleek dark mode like Fleeex
};

const applyTheme = (theme: ThemeMode): boolean => {
  if (typeof window === 'undefined') return false;
  
  let isDark = false;
  if (theme === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else {
    isDark = theme === 'dark';
  }

  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  return isDark;
};

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme = getInitialTheme();
  const isDark = applyTheme(initialTheme);

  return {
    theme: initialTheme,
    isDark,
    setTheme: (theme: ThemeMode) => {
      localStorage.setItem('banna_theme', theme);
      const isDark = applyTheme(theme);
      set({ theme, isDark });
    },
    toggleTheme: () => {
      const current = get().theme;
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('banna_theme', next);
      const isDark = applyTheme(next);
      set({ theme: next, isDark });
    },
  };
});

// Initialize immediately on module load
if (typeof window !== 'undefined') {
  applyTheme(getInitialTheme());
}
