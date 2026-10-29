import React, { useState } from 'react';
import { Alert, CircularProgress, ListItemIcon, MenuItem } from '@mui/material';
import FamilyRestroomRounded from '@mui/icons-material/FamilyRestroomRounded';
import SchoolRounded from '@mui/icons-material/SchoolRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasMode } from '../../services/accountModes';

/** Mode selection never mutates the original role or grants school membership. */
export default function ModeSwitch({ onSelected }) {
  const { user, enableMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const parent = location.pathname === '/family';
  if (user?.role === 'admin') return null;
  async function select(mode) {
    setPending(true); setError('');
    try {
      if (!hasMode(user, mode)) await enableMode(mode);
      const currentMode = parent ? 'parent' : 'teacher';
      let destination = mode === 'parent' ? '/family' : '/';
      try {
        sessionStorage.setItem(`mst.route.${user.id}.${currentMode}`, location.pathname + location.search);
        const saved = sessionStorage.getItem(`mst.route.${user.id}.${mode}`);
        if (saved?.startsWith('/') && !saved.startsWith('//') &&
            (mode === 'parent' ? saved.startsWith('/family') : !saved.startsWith('/family'))) destination = saved;
      } catch { /* Navigation still works when browser storage is unavailable. */ }
      navigate(destination); onSelected?.();
    } catch (e) { setError(e.response?.data?.detail || e.message || 'Could not switch. Please try again.'); }
    finally { setPending(false); }
  }
  const Icon = parent ? SchoolRounded : FamilyRestroomRounded;
  return <>
    <MenuItem disabled={pending} onClick={() => select(parent ? 'teacher' : 'parent')} className="mst-mode-item">
      <ListItemIcon>{pending ? <CircularProgress size={18} /> : <Icon fontSize="small" />}</ListItemIcon>
      <span className="mst-mode-text"><span className="mst-mode-title">{parent ? 'Teacher mode' : 'Parent mode'}</span>
        <span className="mst-mode-hint">{parent ? 'Back to your classes' : 'Help your own child at home'}</span></span>
    </MenuItem>
    {error && <Alert severity="error" sx={{ mx: 1, my: 0.5 }}>{error}</Alert>}
  </>;
}
