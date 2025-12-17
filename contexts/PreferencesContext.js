'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const PreferencesContext = createContext({
  sidebarCompact: false,
  setSidebarCompact: () => {},
  primaryColor: '#4f46e5',
  setPrimaryColor: () => {}
});

// Couleurs prédéfinies avec leurs variantes HSL
const colorVariants = {
  '#4f46e5': { h: 239, s: 84, l: 67 },  // Indigo (défaut)
  '#0ea5e9': { h: 199, s: 89, l: 48 },  // Sky
  '#10b981': { h: 160, s: 84, l: 39 },  // Emerald
  '#f59e0b': { h: 38, s: 92, l: 50 },   // Amber
  '#ef4444': { h: 0, s: 84, l: 60 },    // Red
  '#8b5cf6': { h: 258, s: 90, l: 66 }   // Violet
};

function hexToHSL(hex) {
  // Vérifier si c'est une couleur prédéfinie
  if (colorVariants[hex]) {
    return colorVariants[hex];
  }

  // Convertir hex en RGB puis HSL
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }

  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function PreferencesProvider({ children }) {
  const [sidebarCompact, setSidebarCompactState] = useState(false);
  const [primaryColor, setPrimaryColorState] = useState('#4f46e5');
  const [mounted, setMounted] = useState(false);

  // Charger les préférences depuis localStorage au montage
  useEffect(() => {
    const savedSidebarCompact = localStorage.getItem('pm_sidebar_compact') === 'true';
    const savedPrimaryColor = localStorage.getItem('pm_primary_color') || '#4f46e5';

    setSidebarCompactState(savedSidebarCompact);
    setPrimaryColorState(savedPrimaryColor);
    setMounted(true);
  }, []);

  // Appliquer la couleur principale
  const applyPrimaryColor = useCallback((color) => {
    const root = document.documentElement;
    const hsl = hexToHSL(color);

    // Définir les variables CSS pour la couleur principale
    root.style.setProperty('--primary-h', hsl.h);
    root.style.setProperty('--primary-s', `${hsl.s}%`);
    root.style.setProperty('--primary-l', `${hsl.l}%`);
    root.style.setProperty('--primary-color', color);

    // Mettre à jour les classes Tailwind dynamiquement
    // On utilise des variables CSS personnalisées
    root.style.setProperty('--color-primary', color);
  }, []);

  // Appliquer la couleur quand elle change
  useEffect(() => {
    if (mounted) {
      applyPrimaryColor(primaryColor);
    }
  }, [primaryColor, mounted, applyPrimaryColor]);

  const setSidebarCompact = (value) => {
    setSidebarCompactState(value);
    localStorage.setItem('pm_sidebar_compact', value.toString());
  };

  const setPrimaryColor = (color) => {
    setPrimaryColorState(color);
    localStorage.setItem('pm_primary_color', color);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <PreferencesContext.Provider value={{
      sidebarCompact,
      setSidebarCompact,
      primaryColor,
      setPrimaryColor
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
