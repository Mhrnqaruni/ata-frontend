import React, { useState } from 'react';
import { Alert, Box, Button, Stack } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasMode } from '../../services/accountModes';

/** Mode selection never mutates the original role or grants school membership. */
export default function ModeSwitch({ collapsed = false }) {
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
      navigate(destination);
    } catch (e) { setError(e.response?.data?.detail || e.message || 'Could not switch mode.'); }
    finally { setPending(false); }
  }
  return <Box sx={{ px: 1, pb: 1 }}>
    <Stack direction={collapsed ? 'column' : 'row'} spacing={0.5} aria-label="Account mode">
      {['teacher', 'parent'].map(mode => <Button key={mode} size="small" disabled={pending}
        aria-pressed={parent === (mode === 'parent')} onClick={() => select(mode)}
        variant={parent === (mode === 'parent') ? 'contained' : 'text'}
        sx={{ minWidth: 0, flex: 1, fontSize: collapsed ? 10 : 12 }}>
        {`${hasMode(user, mode) ? '' : 'Set up '}${mode === 'teacher' ? 'Teacher' : 'Parent'}`}
      </Button>)}
    </Stack>
    {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
  </Box>;
}
