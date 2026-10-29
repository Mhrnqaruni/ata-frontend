import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import api from '../services/api';
import { resetTeacherSession, sessionGeneration } from '../services/queryCache.js';

const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const restore = async (initial = false) => {
      const generation = resetTeacherSession({ preserveDrafts: initial && Boolean(localStorage.getItem('authToken')) });
      setUser(null);
      setIsAuthLoading(true);
      try {
        if (localStorage.getItem('authToken')) {
          const current = await authService.getMe();
          if (mounted && generation === sessionGeneration()) setUser(current);
        }
      } catch {
        if (generation === sessionGeneration()) localStorage.removeItem('authToken');
      } finally {
        if (mounted && generation === sessionGeneration()) setIsAuthLoading(false);
      }
    };
    // Another tab's login/logout replaces this tab's entire authenticated cache.
    const changed = event => { if (event.key === 'authToken' || event.key === null) void restore(); else if(event.key==='mst-account-update') void refreshName(); };
    void restore(true);
    const expired = () => { setUser(null); setIsAuthLoading(false); };
    const refreshName=async()=>{const g=sessionGeneration();try{const current=await authService.getMe();if(mounted&&g===sessionGeneration())setUser(current);}catch{/* Existing auth interceptor owns expiration. */}};
    window.addEventListener('mst-account-changed',refreshName);
    window.addEventListener('storage', changed);
    window.addEventListener('mst-session-expired', expired);
    return () => { mounted = false; window.removeEventListener('mst-account-changed',refreshName); window.removeEventListener('storage', changed); window.removeEventListener('mst-session-expired', expired); };
  }, []);

  const login = useCallback(async (email, password) => {
    const generation = resetTeacherSession();
    setUser(null);
    localStorage.removeItem('authToken');
    setIsAuthLoading(true);
    try {
      const { access_token } = await authService.login(email, password);
      if (generation !== sessionGeneration()) throw new Error('Sign-in was superseded. Please try again.');
      localStorage.setItem('authToken', access_token);
      const current = await authService.getMe();
      if (generation !== sessionGeneration()) throw new Error('Sign-in was superseded. Please try again.');
      setUser(current);
      return current;
    } catch (error) {
      if (generation === sessionGeneration()) localStorage.removeItem('authToken');
      throw error;
    } finally {
      if (generation === sessionGeneration()) setIsAuthLoading(false);
    }
  }, []);
  const logout = useCallback(() => {
    resetTeacherSession();
    setUser(null);
    setIsAuthLoading(false);
    localStorage.removeItem('authToken');
    navigate('/login');
  }, [navigate]);
  const enableMode = useCallback(async mode => {
    const generation = sessionGeneration();
    const { data } = await api.put(`/api/auth/modes/${mode}`);
    if (generation !== sessionGeneration()) throw new Error('Your session changed. Please sign in again.');
    setUser(data);
    return data;
  }, []);
  const register = useCallback(payload => authService.register(payload), []);
  const value = useMemo(() => ({ user, isAuthenticated: !!user, isAuthLoading, login, logout, register, enableMode }),
    [user, isAuthLoading, login, logout, register, enableMode]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
