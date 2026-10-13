import React, { useMemo, useState } from 'react';
import parentLogo from '../assets/mst_logo_no_bg.png';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';

import { useAuth } from '../hooks/useAuth';
import { parentPortalService } from '../services/parentPortalService';


const ParentPortalPending = () => {
  const { user, logout } = useAuth();
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState('');

  const displayName = useMemo(() => user?.fullName || user?.email || 'your parent account', [user]);

  const handleLaunch = async () => {
    setLaunching(true);
    setLaunchError('');

    try {
      const payload = await parentPortalService.issueBridgeToken();
      const launchUrl = parentPortalService.buildLaunchUrl(payload?.bridgeToken || payload?.bridge_token);
      window.location.assign(launchUrl);
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to open the parent portal.';
      setLaunchError(detail);
      setLaunching(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Paper className="mst-rim" sx={{ maxWidth: 560, width: '100%', p: { xs: 3, sm: 4 }, borderRadius: '24px' }}>
        <Stack spacing={2}>
          <img alt="MySmartTeach" className="mst-join-logo" src={parentLogo} style={{ margin: '0 0 8px' }} />
          <Typography component="h1" variant="h1">Welcome to your parent workspace</Typography>
          <Typography variant="body1" color="text.secondary">
            {`Signed in as ${displayName}.`}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Open your dedicated parent workspace to review linked children, manage learning settings,
            and use the parent study tools in a portal built for families.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We will securely continue your session in the parent portal and bring you into the right workspace.
          </Typography>
          {launchError ? <Alert severity="error">{launchError}</Alert> : null}
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button variant="contained" onClick={handleLaunch} disabled={launching}>
              {launching ? <CircularProgress size={20} color="inherit" /> : 'Open my workspace'}
            </Button>
            <Button variant="outlined" onClick={logout} disabled={launching}>
              Sign out
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};


export default ParentPortalPending;
