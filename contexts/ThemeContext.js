'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  resolvedTheme: 'light'
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('system');
  const [resolvedTheme, setResolvedTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Charger le thème depuis localStorage au montage
  useEffect(() => {
    const savedTheme = localStorage.getItem('pm_theme') || 'system';
    setThemeState(savedTheme);
    setMounted(true);
  }, []);

  // Appliquer le thème
  useEffect(() => {
    if (!mounted) return;

    const applyTheme = (isDark) => {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        setResolvedTheme('dark');
      } else {
        root.classList.remove('dark');
        setResolvedTheme('light');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handler = (e) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme, mounted]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('pm_theme', newTheme);
  };

  // Éviter le flash de contenu non stylé
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
