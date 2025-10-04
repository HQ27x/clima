import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('clima-app-theme');
    return savedTheme || 'dark';
  });

  // Paletas de colores actualizadas
  const colorPalettes = {
    dark: {
      // Colores base
      primary: '#2563EB',      // Azul
      secondary: '#10B981',    // Verde
      background: '#0B1220',   // Azul oscuro
      surface: '#1E293B',      // Azul gris oscuro

      // Texto para modo oscuro (blanco y grises claros)
      textPrimary: '#FFFFFF',         // Blanco para textos principales
      textSecondary: '#9CA3AF',       // Gris claro para textos secundarios
      textTertiary: '#6B7280',        // Gris medio para textos menos importantes

      // Colores del clima (más vibrantes para modo oscuro)
      sunny: '#FBBF24',        // Amarillo sol más vibrante
      cloudy: '#6B7280',       // Gris nublado
      rainy: '#3B82F6',        // Azul lluvia brillante
      stormy: '#7C3AED',       // Púrpura tormenta
      snowy: '#E5E7EB',        // Blanco nieve
      foggy: '#9CA3AF',        // Gris niebla

      // Estados
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',

      // Transparencias
      overlay: 'rgba(11, 18, 32, 0.95)',
      card: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      hover: 'rgba(255, 255, 255, 0.1)'
    },
    light: {
      // Colores base
      primary: '#2563EB',      // Azul
      secondary: '#10B981',    // Verde
      background: '#F8FAFC',   // Blanco gris muy claro
      surface: '#FFFFFF',      // Blanco puro

      // Texto para modo claro (grises oscuros y negros suaves)
      textPrimary: '#1F2937',         // Gris muy oscuro para texto principal
      textSecondary: '#4B5563',       // Gris oscuro para texto secundario
      textTertiary: '#6B7280',        // Gris medio

      // Colores del clima (ligeramente más suaves para modo claro)
      sunny: '#FBBF24',        // Amarillo sol vibrante
      cloudy: '#9CA3AF',       // Gris nublado más claro
      rainy: '#3B82F6',        // Azul lluvia
      stormy: '#8B5CF6',       // Púrpura tormenta
      snowy: '#F3F4F6',        // Blanco nieve
      foggy: '#D1D5DB',        // Gris niebla

      // Estados
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',

      // Transparencias
      overlay: 'rgba(248, 250, 252, 0.95)',
      card: 'rgba(255, 255, 255, 0.8)',
      border: 'rgba(0, 0, 0, 0.1)',
      hover: 'rgba(0, 0, 0, 0.05)'
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('clima-app-theme', newTheme);
  };

  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${theme}`);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Aplicar colores dinámicamente a las variables CSS
    const colors = colorPalettes[theme];
    const root = document.documentElement;
    
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--surface', colors.surface);
    root.style.setProperty('--text', colors.textPrimary);
    root.style.setProperty('--textSecondary', colors.textSecondary);
    root.style.setProperty('--textTertiary', colors.textTertiary);
    root.style.setProperty('--sunny', colors.sunny);
    root.style.setProperty('--cloudy', colors.cloudy);
    root.style.setProperty('--rainy', colors.rainy);
    root.style.setProperty('--stormy', colors.stormy);
    root.style.setProperty('--snowy', colors.snowy);
    root.style.setProperty('--foggy', colors.foggy);
    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--warning', colors.warning);
    root.style.setProperty('--error', colors.error);
    root.style.setProperty('--info', colors.info);
    root.style.setProperty('--overlay', colors.overlay);
    root.style.setProperty('--card', colors.card);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--hover', colors.hover);
  }, [theme, colorPalettes]);

  const value = {
    theme,
    colors: colorPalettes[theme],
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
