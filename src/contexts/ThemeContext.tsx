import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { ThemeContext, type Theme } from './useTheme';

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function isTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('onespace-theme');
    return isTheme(saved) ? saved : 'dark';
  });
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(getSystemTheme);
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  // Apply the derived theme without mirroring it into another state variable.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system theme changes when theme === 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemTheme(getSystemTheme());
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
      .maybeSingle()
      .then(({ data, error }) => {
        const savedTheme = data?.theme || null;
        if (!error && isTheme(savedTheme)) {
          setThemeState(savedTheme);
          localStorage.setItem('onespace-theme', savedTheme);
        }
      });
  }, [user]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    const previousTheme = theme;
    setThemeState(newTheme);
    localStorage.setItem('onespace-theme', newTheme);

    if (user) {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: user.id, theme: newTheme, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );

      if (error) {
        setThemeState(previousTheme);
        localStorage.setItem('onespace-theme', previousTheme);
        return { error: error as Error };
      }
    }
    return { error: null };
  }, [theme, user]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
