import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: async () => {},
});

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('onespace-theme') as Theme | null;
    return saved || 'dark';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

  // Apply theme on mount and whenever theme changes
  useEffect(() => {
    const resolved = applyTheme(theme);
    setResolvedTheme(resolved);
  }, [theme]);

  // Listen for system theme changes when theme === 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = applyTheme('system');
      setResolvedTheme(resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Load saved theme from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_settings')
      .select('theme')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.theme) {
          const savedTheme = data.theme as Theme;
          setThemeState(savedTheme);
          localStorage.setItem('onespace-theme', savedTheme);
        }
      });
  }, [user]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('onespace-theme', newTheme);

    if (user) {
      // Upsert user_settings with new theme
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        await supabase
          .from('user_settings')
          .update({ theme: newTheme, updated_at: new Date().toISOString() } as never)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_settings')
          .insert({ user_id: user.id, theme: newTheme } as never);
      }
    }
  }, [user]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
