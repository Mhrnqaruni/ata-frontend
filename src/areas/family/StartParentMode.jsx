// "Start Parent mode": the screen at any family address until the account has Parent mode (design §3.15). Moved from
// FamilyHome.jsx unchanged (Phase 1.37, S2.3a).
// Area: family

import { useState } from 'react';
import { Alert, Button, Typography, useMediaQuery } from '@mui/material';
import AccountMenu from '../../components/common/AccountMenu';
import logo from '../../assets/mst_logo_no_bg.png';
import darkLogo from '../../assets/mst_logo_dark_no_bg.png';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useAuth } from '../../hooks/useAuth';

export default function StartParentMode() {
  const { enableMode } = useAuth();
  const { mode } = useThemeMode();
  const phone = useMediaQuery('(max-width:599px)');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="fam-app">
      <header className="fam-top" data-mst="family-top">
        <img src={mode === 'dark' ? darkLogo : logo} alt="MySmartTeach" className="fam-logo" />
        <span className="fam-top-label">Parent mode</span>
        <span className="fam-grow" />
        <AccountMenu compact={phone} />
      </header>
      <main className="fam-centre-page">
        <section className="fam-welcome">
          <Typography component="h1" className="fam-title">
            Start Parent mode
          </Typography>
          <Typography className="fam-lead">
            Help your own child at home. Your family space stays separate from your teaching.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await enableMode('parent');
              } catch (e) {
                setError(e.message || 'Could not start Parent mode.');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Starting…' : 'Start Parent mode'}
          </Button>
        </section>
      </main>
    </div>
  );
}
