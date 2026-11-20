import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'marketforge-theme';

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = (localStorage.getItem(STORAGE_KEY) || localStorage.getItem('theme')) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return 'system';
}

function applyThemeToDOM(theme: ThemeMode): 'light' | 'dark' {
  const resolved = theme === 'system' ? getSystemPreference() : theme;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Modern color-scheme meta and property sync for native UI (scrollbars, form controls)
    root.style.colorScheme = theme === 'system' ? 'light dark' : theme;
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute('content', theme === 'system' ? 'light dark' : theme);
    }
  }
  return resolved;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme = getInitialTheme();
  const initialResolved = typeof window !== 'undefined'
    ? applyThemeToDOM(initialTheme)
    : 'light';

  // Listen to system OS theme changes
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = () => {
        const current = get().theme;
        if (current === 'system') {
          const resolved = applyThemeToDOM('system');
          set({ resolvedTheme: resolved });
        }
      };
      if (mediaQuery && typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleSystemChange);
      } else if (mediaQuery && typeof (mediaQuery as any).addListener === 'function') {
        (mediaQuery as any).addListener(handleSystemChange);
      }
    } catch {
      // ignore mediaQuery errors in unsupported environments
    }
  }

  // Cross-tab storage sync
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY || e.key === 'theme') {
        const newTheme = (e.newValue as ThemeMode) || 'system';
        const resolved = applyThemeToDOM(newTheme);
        set({ theme: newTheme, resolvedTheme: resolved });
      }
    });
  }

  return {
    theme: initialTheme,
    resolvedTheme: initialResolved,
    setTheme: (mode: ThemeMode) => {
      try {
        if (mode === 'system') {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('theme');
        } else {
          localStorage.setItem(STORAGE_KEY, mode);
          localStorage.setItem('theme', mode);
        }
      } catch {
        // ignore storage errors
      }
      const resolved = applyThemeToDOM(mode);
      set({ theme: mode, resolvedTheme: resolved });
    },
    toggleTheme: () => {
      const { resolvedTheme } = get();
      const nextTheme: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
      get().setTheme(nextTheme);
    },
  };
});
