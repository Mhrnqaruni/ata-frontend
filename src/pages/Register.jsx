// /src/pages/Register.jsx (ENHANCED, UNIFIED, AND FLAWLESS)

// --- Core React & Router Imports ---
import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

// --- MUI Component Imports ---
import {
  Box, Paper, Typography, TextField, Button, Stack,
  CircularProgress, Alert, Link, Avatar, FormControlLabel, Checkbox
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';

// --- Custom Hook & Asset Imports ---
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { useThemeMode } from '../hooks/useThemeMode';
import lightLogo from '../assets/mst_logo_no_bg.png';
import darkLogo from '../assets/mst_logo_dark_no_bg.png';

/**
 * The enhanced Register page with client-side validation and terms agreement.
 */
const Register = () => {
  // --- Hook Initialization ---
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { mode } = useThemeMode();

  // --- Local State Management ---
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // --- Real-time Validation Logic ---
  const validateField = (name, value) => {
    let errorMsg = '';
    if (name === 'fullName' && value.trim().length > 0 && value.trim().length < 3) {
      errorMsg = 'Full name must be at least 3 characters.';
    }
    if (name === 'email' && value.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errorMsg = 'Please enter a valid email address.';
    }
    if (name === 'password' && value.length > 0 && value.length < 8) {
      errorMsg = 'Password must be at least 8 characters.';
    }
    return errorMsg;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Validate on change and clear the error if the input becomes valid
    const validationError = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: validationError }));
  };
  
  // --- Form Submission Handler ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    setIsLoading(true);

    try {
      // Final validation before submitting
      const finalErrors = {};
      Object.keys(formData).forEach(key => {
        const error = validateField(key, formData[key]);
        if (error) finalErrors[key] = error;
      });

      if (Object.keys(finalErrors).length > 0) {
        setErrors(finalErrors);
        throw new Error("Please correct the errors before submitting.");
      }

      await register(formData.fullName, formData.email, formData.password);
      showSnackbar('Account created successfully! Please sign in.', 'success');
      navigate('/login');
    } catch (err) {
      // Errors from the validate function will be caught here,
      // as well as errors from the backend.
      setServerError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if the form is valid and terms are agreed to for enabling the submit button.
  const canSubmit = 
    !Object.values(errors).some(error => error !== '') &&
    formData.fullName.trim().length >= 3 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formData.password.length >= 8 &&
    agreedToTerms;

  return (
    <Box
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', py: 4,
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
          sx={{ height: 60, mb: 2 }}
          alt="My Smart Teach Logo"
        />
        <Typography component="h1" variant="h2" sx={{ mb: 3 }}>
          Create Account
        </Typography>

        {serverError && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
          <Stack spacing={2}>
            <TextField
              required fullWidth id="fullName" label="Full Name" name="fullName"
              autoComplete="name" autoFocus value={formData.fullName} onChange={handleChange}
              disabled={isLoading} error={!!errors.fullName} helperText={errors.fullName}
            />
            <TextField
              required fullWidth id="email" label="Email Address" name="email"
              autoComplete="email" value={formData.email} onChange={handleChange}
              disabled={isLoading} error={!!errors.email} helperText={errors.email}
            />
            <TextField
              required fullWidth name="password" label="Password" type="password"
              id="password" autoComplete="new-password" value={formData.password} onChange={handleChange}
              disabled={isLoading} error={!!errors.password} 
              helperText={errors.password || "Must be at least 8 characters long."}
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  name="terms"
                  color="primary"
                  disabled={isLoading}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  I agree to the{' '}
                  <Link href="https://www.mysmartteach.com/terms" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="https://www.mysmartteach.com/privacy" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </Link>.
                </Typography>
              }
            />

            <Button
              type="submit" fullWidth variant="contained"
              disabled={isLoading || !canSubmit}
              sx={{ mt: 1, mb: 2, py: 1.5 }}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
          {"Already have an account? "}
          <Link component={RouterLink} to="/login" variant="body2">
            Sign In
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Register;