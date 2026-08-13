import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { ThemeContext, type Theme } from './useTheme';

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('onespace-theme') as Theme | null;
    return saved || 'dark';
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
