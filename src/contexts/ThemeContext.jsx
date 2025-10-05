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
      primary: '#5b7c99',      // Azul acero vintage
      secondary: '#7d9bb5',    // Azul niebla
      accent: '#4A90E2',       // Azul vintage vibrante
      background: '#1a2332',   // Azul marino profundo
      surface: '#243447',      // Azul slate medio

      // Texto para modo oscuro (azul claro y tonos fríos)
      textPrimary: '#e8eef5',         // Blanco azulado suave
      textSecondary: '#B8D4F0',       // Azul claro para textos secundarios
      textTertiary: '#8BB3D9',        // Azul medio para textos menos importantes

      // Colores del clima vintage
      sunny: '#f5b342',        // Dorado
      cloudy: '#94a3b8',       // Gris azulado
      rainy: '#6b8caf',        // Azul agua
      stormy: '#6A5ACD',       // Púrpura lavanda para tormentas
      snowy: '#d4e4f7',        // Azul hielo claro
      foggy: '#C0C0C0',        // Gris plata para niebla

      // Estados vintage
      success: '#90EE90',      // Verde claro
      warning: '#FFB347',      // Naranja suave
      error: '#FF6B6B',        // Rojo coral
      info: '#87CEEB',         // Azul cielo

      // Transparencias
      overlay: 'rgba(26, 35, 50, 0.95)',
      card: 'rgba(45, 63, 90, 0.4)',
      border: 'rgba(232, 238, 245, 0.15)',
      hover: 'rgba(232, 238, 245, 0.12)',
      buttonText: '#FFFFFF'     // Texto blanco para botones
    },
    light: {
      // Colores base amarillo vibrante
      primary: '#ffb300',      // Mostaza vibrante
      secondary: '#ffd54f',    // Amarillo dorado
      accent: '#ffc93c',       // Amarillo sol
      background: '#fffbf0',   // Amarillo muy claro, casi blanco
      surface: '#fff4d9',      // Amarillo mantequilla suave

      // Texto para modo claro (gris oscuro cálido)
      textPrimary: '#2d2a1f',         // Gris carbón cálido
      textSecondary: '#5D4E37',       // Marrón oscuro para texto secundario
      textTertiary: '#8B7355',        // Marrón medio

      // Colores del clima vintage
      sunny: '#ffa500',        // Naranja dorado para sol
      cloudy: '#708090',       // Azul gris para nubes
      rainy: '#4682B4',        // Azul acero para lluvia
      stormy: '#6A5ACD',       // Púrpura lavanda para tormentas
      snowy: '#87CEEB',        // Azul cielo para nieve
      foggy: '#A9A9A9',        // Gris oscuro para niebla

      // Estados vintage
      success: '#228B22',      // Verde oscuro
      warning: '#CD853F',      // Marrón dorado
      error: '#DC143C',        // Rojo oscuro
      info: '#4682B4',         // Azul acero

      // Transparencias
      overlay: 'rgba(255, 251, 240, 0.95)',
      card: 'rgba(255, 244, 217, 0.6)',
      border: 'rgba(45, 42, 31, 0.15)',
      hover: 'rgba(255, 179, 0, 0.1)',
      buttonText: '#2d2a1f'     // Texto oscuro para botones
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