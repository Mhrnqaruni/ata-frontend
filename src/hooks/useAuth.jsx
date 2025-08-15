// /src/hooks/useAuth.jsx

// --- Core React Imports ---
// Import 'useMemo' for performance optimization.
import React, { createContext, useContext, useState, useMemo } from 'react';

// --- Create the Context ---
// This context object will hold the authentication state and functions.
const AuthContext = createContext(null);

/**
 * The Provider component that makes the authentication state (the user object)
 * available to any component nested inside it.
 */
export const AuthProvider = ({ children }) => { // CORRECTED: Removed stray 'in'
  // --- State Management ---
  // For the V1 demo, we use a simple 'useState' with a hardcoded mock user object.
  // In a V2 application, this would be replaced with logic to verify a session.
  const [user, setUser] = useState({
    name: 'Max Gh',
    email: 'max.gh@example.com',
    initials: 'MG',
  });

  // --- The value to be provided by the context ---
  // The 'useMemo' hook ensures the value object is only recreated when the 'user'
  // state changes. This is a critical performance optimization that prevents
  // unnecessary re-renders of all consuming components.
  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
  }), [user]); // The dependency array ensures this runs only when 'user' changes.

  return (
    // The Provider component makes the memoized 'value' object available to all children.
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * The custom hook that components will use to access the auth context.
 * This simplifies consumption and adds a critical error check.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This error prevents bugs by ensuring the hook is only used
    // within a component tree that is wrapped by AuthProvider.
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};