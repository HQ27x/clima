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
    // Verificar si hay un tema guardado en localStorage
    const savedTheme = localStorage.getItem('clima-app-theme');
    return savedTheme || 'dark';
  });

  // Paletas de colores
  const colorPalettes = {
    dark: {
      // Colores base
      primary: '#2563EB',      // Azul
      secondary: '#10B981',    // Verde
      background: '#0B1220',   // Azul oscuro
      surface: '#1E293B',      // Azul gris oscuro
      text: '#FFFFFF',         // Blanco
      textSecondary: '#9CA3AF', // Gris claro
      
      // Colores del clima
      sunny: '#F59E0B',        // Amarillo sol
      cloudy: '#6B7280',       // Gris nublado
      rainy: '#2563EB',        // Azul lluvia
      stormy: '#7C3AED',       // Púrpura tormenta
      snowy: '#E5E7EB',        // Blanco nieve
      foggy: '#9CA3AF',        // Gris niebla
      
      // Estados
      success: '#10B981',      // Verde éxito
      warning: '#F59E0B',      // Amarillo advertencia
      error: '#EF4444',        // Rojo error
      info: '#3B82F6',         // Azul información
      
      // Transparencias
      overlay: 'rgba(11, 18, 32, 0.95)',
      card: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      hover: 'rgba(255, 255, 255, 0.1)'
    },
    light: {
      // Colores base
      primary: '#2563EB',      // Azul (mismo)
      secondary: '#10B981',    // Verde (mismo)
      background: '#F8FAFC',   // Blanco gris muy claro
      surface: '#FFFFFF',      // Blanco puro
      text: '#1F2937',         // Gris muy oscuro
      textSecondary: '#6B7280', // Gris medio
      
      // Colores del clima
      sunny: '#F59E0B',        // Amarillo sol (mismo)
      cloudy: '#9CA3AF',       // Gris nublado más claro
      rainy: '#3B82F6',        // Azul lluvia más claro
      stormy: '#8B5CF6',       // Púrpura tormenta más claro
      snowy: '#F3F4F6',        // Blanco nieve
      foggy: '#D1D5DB',        // Gris niebla más claro
      
      // Estados
      success: '#10B981',      // Verde éxito (mismo)
      warning: '#F59E0B',      // Amarillo advertencia (mismo)
      error: '#EF4444',        // Rojo error (mismo)
      info: '#3B82F6',         // Azul información (mismo)
      
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

  // Aplicar tema al body
  useEffect(() => {
    // Limpiar clases anteriores
    document.body.classList.remove('theme-dark', 'theme-light');
    // Aplicar nueva clase
    document.body.classList.add(`theme-${theme}`);
    // También aplicar data-theme para CSS
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
