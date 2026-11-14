// The owner's sign-in (/owner/sign-in): email and password, then on to where they were heading (design §3.1).
// No sign-up and no Google sign-in: only the owner, made on the server, can sign in here.
// Area: owner

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, CircularProgress } from '@mui/material';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import LabeledField from '../../../components/auth/LabeledField';
import { useThemeMode } from '../../../hooks/useThemeMode';
import lightLogo from '../../../assets/mst_logo_no_bg.png';
import darkLogo from '../../../assets/mst_logo_dark_no_bg.png';
import { signIn } from '../ownerApi';
import usePageTitle from '../usePageTitle';
import '../owner.css';

// Only a panel page can be the way back, never another site or a teacher page.
const safeNext = (next) => (next && next.startsWith('/owner') && !next.startsWith('//') ? next : '/owner');

function firstMessage(params) {
  if (params.get('ended')) return { severity: 'info', text: 'Your session ended. Sign in again.' };
  if (params.get('signed_out')) return { severity: 'info', text: 'You signed out.' };
  return null;
}

function failure(error) {
  const status = error?.response?.status;
  if (status === 429) return { severity: 'warning', text: 'Too many tries. Wait 15 minutes.' };
  if (status === 401 || status === 422) return { severity: 'error', text: 'Email or password is wrong.' };
  return { severity: 'error', text: "Couldn't sign in. Check the connection, then try again." };
}

export default function SignInPage() {
  usePageTitle('Sign in');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(() => firstMessage(params));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await signIn(email, password);
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (error) {
      setMessage(failure(error));
      setBusy(false);
    }
  };

  return (
    <div className="owner-signin">
      <div className="owner-signin-card">
        <img alt="MySmartTeach" className="owner-signin-logo" src={mode === 'dark' ? darkLogo : lightLogo} />
        <span className="owner-mark">
          <AdminPanelSettingsOutlined aria-hidden="true" />
          Admin
        </span>
        <h1>Sign in to Admin</h1>
        <form className="owner-signin-form" noValidate onSubmit={submit}>
          <LabeledField
            autoComplete="username"
            autoFocus
            disabled={busy}
            id="owner-email"
            label="Email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
          <LabeledField
            autoComplete="current-password"
            disabled={busy}
            id="owner-password"
            label="Password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          {message ? <Alert severity={message.severity}>{message.text}</Alert> : null}
          <Button data-mst="owner-sign-in" disabled={busy} fullWidth type="submit" variant="contained">
            {busy ? <CircularProgress aria-label="Signing in" color="inherit" size={22} /> : 'Sign in'}
          </Button>
        </form>
        <p className="owner-signin-foot">Only the owner can sign in here.</p>
      </div>
    </div>
  );
}
