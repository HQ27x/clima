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

  // Paletas de colores vintage actualizadas
  const colorPalettes = {
    dark: {
      // Colores base azul vintage
      primary: '#4A90E2',      // Azul vintage
      secondary: '#7BB3F0',    // Azul claro vintage
      accent: '#B8D4F0',       // Azul muy claro vintage
      background: '#0F1419',   // Azul muy oscuro vintage
      surface: '#1A2332',      // Azul gris oscuro vintage

      // Texto para modo oscuro (azul claro y tonos fríos)
      textPrimary: '#E8F4FD',         // Azul muy claro para textos principales
      textSecondary: '#B8D4F0',       // Azul claro para textos secundarios
      textTertiary: '#8BB3D9',        // Azul medio para textos menos importantes

      // Colores del clima vintage
      sunny: '#FFD700',        // Dorado para sol
      cloudy: '#B0C4DE',       // Azul gris claro para nubes
      rainy: '#4682B4',        // Azul acero para lluvia
      stormy: '#6A5ACD',       // Púrpura lavanda para tormentas
      snowy: '#F0F8FF',        // Azul blanco para nieve
      foggy: '#C0C0C0',        // Gris plata para niebla

      // Estados vintage
      success: '#90EE90',      // Verde claro
      warning: '#FFB347',      // Naranja suave
      error: '#FF6B6B',        // Rojo coral
      info: '#87CEEB',         // Azul cielo

      // Transparencias
      overlay: 'rgba(15, 20, 25, 0.95)',
      card: 'rgba(232, 244, 253, 0.08)',
      border: 'rgba(232, 244, 253, 0.15)',
      hover: 'rgba(232, 244, 253, 0.12)',
      buttonText: '#FFFFFF'     // Texto blanco para botones
    },
    light: {
      // Colores base vintage
      primary: '#8B5A3C',      // Marrón vintage
      secondary: '#A67C52',    // Marrón dorado
      accent: '#D4AF37',       // Dorado vintage
      background: '#FDF5E6',   // Beige muy claro vintage
      surface: '#FFF8DC',      // Beige crema

      // Texto para modo claro (marrón y grises oscuros)
      textPrimary: '#2F2F2F',         // Gris muy oscuro para texto principal
      textSecondary: '#5D4E37',       // Marrón oscuro para texto secundario
      textTertiary: '#8B7355',        // Marrón medio

      // Colores del clima vintage
      sunny: '#DAA520',        // Dorado oscuro para sol
      cloudy: '#708090',       // Azul gris para nubes
      rainy: '#4682B4',        // Azul acero para lluvia
      stormy: '#6A5ACD',       // Púrpura lavanda para tormentas
      snowy: '#F0F8FF',        // Azul blanco para nieve
      foggy: '#A9A9A9',        // Gris oscuro para niebla

      // Estados vintage
      success: '#228B22',      // Verde oscuro
      warning: '#CD853F',      // Marrón dorado
      error: '#DC143C',        // Rojo oscuro
      info: '#4682B4',         // Azul acero

      // Transparencias
      overlay: 'rgba(253, 245, 230, 0.95)',
      card: 'rgba(255, 248, 220, 0.7)',
      border: 'rgba(139, 90, 60, 0.2)',
      hover: 'rgba(139, 90, 60, 0.1)',
      buttonText: '#FFFFFF'     // Texto blanco para botones
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
    root.style.setProperty('--accent', colors.accent);
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
    root.style.setProperty('--buttonText', colors.buttonText);
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
