// The frame of every parent-mode address (Phase 1.37, S2.3a): the calm parent space, "Start Parent mode" while that
// mode is off, the per-tab memory of the current child and the last page, and the pages' loading screen.
// Area: family

import { Suspense, useEffect } from 'react';
import { Alert } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasMode } from '../../services/accountModes';
import FamilyLoading from './FamilyLoading';
import StartParentMode from './StartParentMode';
import { rememberPage } from './familyMemory';
import './family.css';

/** The parent space: its own calm, solid look (scoped by <html data-space="family">, so dialogs and menus follow). */
function useFamilySpace() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-space', 'family');
    return () => root.removeAttribute('data-space');
  }, []);
}

export default function FamilyArea() {
  useFamilySpace();
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  useEffect(() => rememberPage(user?.id, pathname, search), [user?.id, pathname, search]);
  if (user?.role === 'admin') return <Alert severity="info">Use an adult account for family learning.</Alert>;
  if (!hasMode(user, 'parent')) return <StartParentMode />;
  return (
    <Suspense fallback={<FamilyLoading />}>
      <Outlet />
    </Suspense>
  );
}
