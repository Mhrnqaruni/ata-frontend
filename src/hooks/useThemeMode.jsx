// /src/hooks/useThemeMode.jsx

// --- Core React Imports ---
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

// --- Create the Context ---
// This context object will hold the current theme mode and the toggle function.
const ThemeModeContext = createContext(null);

/**
 * The Provider component that makes the theme mode and toggle function
 * available to the entire application tree.
 */
export const ThemeModeProvider = ({ children }) => {
  // --- State Management ---
  // Initialize the state by trying to read the value from localStorage.
  // If nothing is found, it defaults to 'light'. This makes the choice persistent.
  const [mode, setMode] = useState(
    () => localStorage.getItem('themeMode') || 'light'
  );

  // --- Side Effect for Persistence ---
  // This useEffect hook runs every time the 'mode' state changes.
  // It saves the new mode to localStorage, so the choice is remembered
  // across browser refreshes and sessions.
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // --- The Toggle Function ---
  // This is the function that other components will call to switch themes.
  const toggleThemeMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // --- Memoize the Context Value ---
  // The 'useMemo' hook ensures that the 'value' object is only recreated
  // when the 'mode' state changes. This is a performance optimization that
  // prevents unnecessary re-renders of components that consume this context.
  const value = useMemo(() => ({ mode, toggleThemeMode }), [mode]);

  // Provide the memoized value to all children of this component.
  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
};

/**
 * The custom hook that components will use to easily access the theme context.
 * This is a best practice that simplifies consumption and adds a check
 * to ensure the context is used within its provider.
 */
export const useThemeMode = () => {
  const context = useContext(ThemeModeContext);
  if (context === undefined) {
    // This error will be thrown if a component tries to use this hook
    // outside of the ThemeModeProvider, which helps catch bugs early.
    throw new Error('useThemeMode must be used within a ThemeModeProvider');
  }
  return context;
};