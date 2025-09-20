// /src/hooks/useAuth.jsx (FINAL, SUPERVISOR-APPROVED - UNIFIED AND FLAWLESS)

// --- Core React Imports ---
import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// --- Service Imports ---
// This file will orchestrate calls to the authentication service.
import authService from '../services/authService';

// --- Create the Context ---
// The context is initialized with a default shape that reflects the provider's value.
const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isAuthLoading: true, // Application starts in an "auth-loading" state.
  login: async (email, password) => {},
  logout: () => {},
  register: async (fullName, email, password) => {},
});

/**
 * The Provider component that makes the authentication state and actions
 * available to the entire application. This is the single source of truth for
 * the user's session.
 */
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  // --- State Management ---
  const [user, setUser] = useState(null);
  // This state is critical for `ProtectedRoute` to prevent UI flashes.
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // --- Session Initialization Effect ---
  // This effect runs only ONCE when the application first loads.
  // Its purpose is to check for an existing token and validate it with the backend.
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');

      if (token) {
        try {
          // A token exists. We must verify it by fetching the user's profile.
          // The request interceptor in `api.js` will automatically attach this token.
          const currentUser = await authService.getMe();
          setUser(currentUser); // On success, the user is logged in.
        } catch (error) {
          // If this fails, the token is invalid (e.g., expired, user deleted).
          // We must clear the bad token and ensure the user is logged out.
          console.error("Initial session validation failed:", error);
          localStorage.removeItem('authToken');
          setUser(null);
        }
      }
      
      // Signal to the rest of the app that the initial authentication check is complete.
      setIsAuthLoading(false);
    };

    initializeAuth();
  }, []); // The empty dependency array ensures this runs only once.


  // --- Core Authentication Actions ---

  // useCallback memoizes these functions, which is a performance best practice.
  const login = useCallback(async (email, password) => {
    try {
      // 1. Get the token from the backend.
      const { access_token } = await authService.login(email, password);
      // 2. Persist the token.
      localStorage.setItem('authToken', access_token);
      // 3. Fetch the user profile.
      const currentUser = await authService.getMe();
      // 4. Update the global state.
      setUser(currentUser);
      // The calling component (`Login.jsx`) will be responsible for navigation.
    } catch (error) {
      // Re-throw the error so the Login page can display it to the user.
      throw error;
    }
  }, []);

  const register = useCallback(async (fullName, email, password) => {
    // We re-throw the error so the Register page can display it.
    // On success, this function does nothing further. The user must manually log in.
    await authService.register(fullName, email, password);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('authToken');
    // For a clean logout, we navigate to the login page.
    navigate('/login');
  }, [navigate]);

  // --- Context Value ---
  // useMemo ensures this object is stable and only recreated when necessary.
  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user, // Derived boolean flag for convenience.
    isAuthLoading,
    login,
    logout,
    register,
  }), [user, isAuthLoading, login, logout, register]);

  // Render the provider, making the value available to all children.
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * The custom hook for consuming the AuthContext.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};