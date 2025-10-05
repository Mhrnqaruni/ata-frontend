// /src/pages/Login.jsx (ENHANCED A+ VERSION)

// --- Core React & Router Imports ---
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';

// --- MUI Component Imports ---
import {
  Box, Paper, Typography, TextField, Button, Stack,
  CircularProgress, Alert, Link, FormControlLabel, Checkbox,
  Grid, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, InputAdornment
} from '@mui/material';

// --- MUI Icon Imports ---
import CloseIcon from '@mui/icons-material/Close';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

// --- Custom Hook & Asset Imports ---
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { useThemeMode } from '../hooks/useThemeMode';
import lightLogo from '../assets/mst_logo_no_bg.png';
import darkLogo from '../assets/mst_logo_dark_no_bg.png';


/**
 * The A+ enhanced Login page component with "Remember Me", "Forgot Password",
 * and a password visibility toggle.
 */
const Login = () => {
  // --- Hook Initialization ---
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { mode } = useThemeMode();

  // --- Local State Management ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // A+ ENHANCEMENT: State for password visibility
  const [showPassword, setShowPassword] = useState(false);

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const from = location.state?.from?.pathname || '/';

  // --- Side Effect for "Remember Me" ---
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);


  // --- Event Handlers ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      showSnackbar('Login successful!', 'success');

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Check if this is the admin user
      if (email === 'mehran.gharuni.admin@admin.com') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // A+ ENHANCEMENT: Handlers for the visibility toggle
  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handlePasswordRecovery = () => {
    if (recoveryEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
      showSnackbar('Password recovery is a future feature. Thank you for your interest!', 'info');
      setRecoveryEmail('');
      setIsForgotModalOpen(false);
    } else {
      showSnackbar('Please enter a valid email address.', 'warning');
    }
  };
  
  const canSubmit = email.trim() !== '' && password.trim() !== '';

  return (
    <>
      <Box
        sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh',
          backgroundColor: (theme) => theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.background.default,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column',
            alignItems: 'center', maxWidth: '400px', width: '100%',
          }}
        >
          <Box
            component="img"
            src={mode === 'light' ? lightLogo : darkLogo}
            sx={{ height: 100, mb: 2 }}
            alt="My Smart Teach Logo"
          />

          <Typography component="h1" variant="h2" sx={{ mb: 3 }}>
            Sign In
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
            <Stack spacing={2}>
              <TextField required fullWidth id="email" label="Email Address" name="email"
                autoComplete="email" autoFocus value={email}
                onChange={(e) => setEmail(e.target.value)} disabled={isLoading}
              />
              <TextField required fullWidth name="password" label="Password"
                id="password" autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} disabled={isLoading}
                // A+ ENHANCEMENT: Dynamic type and visibility toggle icon
                type={showPassword ? 'text' : 'password'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Grid container alignItems="center" justifyContent="space-between">
                <Grid item>
                  <FormControlLabel
                    control={<Checkbox value="remember" color="primary"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Remember me</Typography>}
                  />
                </Grid>
                <Grid item>
                  <Button
                    variant="text" size="small"
                    onClick={() => setIsForgotModalOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 'normal' }}
                  >
                    Forgot password?
                  </Button>
                </Grid>
              </Grid>

              <Button
                type="submit" fullWidth variant="contained"
                disabled={isLoading || !canSubmit}
                sx={{ mt: 1, mb: 2, py: 1.5 }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
            {"Don't have an account? "}
            <Link component={RouterLink} to="/register" variant="body2">Sign Up</Link>
          </Typography>
        </Paper>
      </Box>

      {/* "Forgot Password" Modal Dialog */}
      <Dialog open={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Reset Password
          <IconButton edge="end" onClick={() => setIsForgotModalOpen(false)} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This feature is coming soon. For now, this is a placeholder.
          </Typography>
          <TextField
            autoFocus margin="dense" id="recovery-email" label="Email Address"
            type="email" fullWidth variant="outlined" value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setIsForgotModalOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handlePasswordRecovery} variant="contained">
            Send Recovery Link
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Login;