// /src/pages/Login.jsx (ENHANCED A+ VERSION)

// --- Core React & Router Imports ---
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";

// --- MUI Component Imports ---
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Link,
  FormControlLabel,
  Checkbox,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
} from "@mui/material";

// --- MUI Icon Imports ---
import CloseIcon from "@mui/icons-material/Close";
import Visibility from "@mui/icons-material/VisibilityOutlined";
import VisibilityOff from "@mui/icons-material/VisibilityOffOutlined";

// --- Custom Hook & Asset Imports ---
import { useAuth } from "../hooks/useAuth";
import { useSnackbar } from "../hooks/useSnackbar";
import { useThemeMode } from "../hooks/useThemeMode";
import lightLogo from "../assets/mst_logo_no_bg.png";
import darkLogo from "../assets/mst_logo_dark_no_bg.png";
import AuthFrame from "../components/auth/AuthFrame";
import LabeledField from "../components/auth/LabeledField";

/**
 * The A+ enhanced Login page component with "Remember Me", "Forgot Password",
 * and a password visibility toggle.
 */
const Login = () => {
  // --- Hook Initialization ---
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isAuthLoading, user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { mode } = useThemeMode();

  // --- Local State Management ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // A+ ENHANCEMENT: State for password visibility
  const [showPassword, setShowPassword] = useState(false);

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");

  // FIX: Track autofill state to enable button when browser autofills
  const [isEmailAutofilled, setIsEmailAutofilled] = useState(false);
  const [isPasswordAutofilled, setIsPasswordAutofilled] = useState(false);

  const from = location.state?.from?.pathname || "/";

  // --- Side Effect for "Remember Me" ---
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading || isLoading || !isAuthenticated) {
      return;
    }

    if (user?.role === "admin") {
      navigate("/admin", { replace: true });
    } else if (user?.role === "parent") {
      navigate("/family", { replace: true });
    } else if (user?.role === "teacher") {
      navigate("/", { replace: true });
    }
  }, [isAuthLoading, isLoading, isAuthenticated, user, navigate]);

  // --- Event Handlers ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    // FIX: Get values from DOM if autofilled (state might be empty)
    const formEmail = event.target.email.value;
    const formPassword = event.target.password.value;

    // Validate that fields are not empty
    if (!formEmail.trim() || !formPassword.trim()) {
      setError("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await login(formEmail, formPassword);
      showSnackbar("Login successful!", "success");

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", formEmail);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      if (currentUser?.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (currentUser?.role === "parent") {
        navigate("/family", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(
        err.message || "An unexpected error occurred. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // A+ ENHANCEMENT: Handlers for the visibility toggle
  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  // FIX: Handler for detecting browser autofill using Chrome's animation event
  const handleAutofill = (fieldName) => (event) => {
    // Chrome fires an 'animationstart' event when autofilling
    if (
      event.animationName === "mui-auto-fill" ||
      event.animationName === "onAutoFillStart"
    ) {
      if (fieldName === "email") {
        setIsEmailAutofilled(true);
        // Also update state from DOM value
        setEmail(event.target.value);
      } else if (fieldName === "password") {
        setIsPasswordAutofilled(true);
        // Also update state from DOM value
        setPassword(event.target.value);
      }
    }
  };

  const handlePasswordRecovery = () => {
    if (
      recoveryEmail.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)
    ) {
      showSnackbar(
        "Password recovery is a future feature. Thank you for your interest!",
        "info",
      );
      setRecoveryEmail("");
      setIsForgotModalOpen(false);
    } else {
      showSnackbar("Please enter a valid email address.", "warning");
    }
  };

  // Note: Button is always enabled (user request) - validation happens on submit
  // Previously checked: const canSubmit = (email.trim() !== '' && password.trim() !== '')

  return (
    <>
      <AuthFrame
        title="Sign in"
        description="Your classes, assessments and feedback, together."
      >
        {error && (
          <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ width: "100%" }}
        >
          <Stack spacing={2}>
            {/* Labels sit above the fields (no floating label, no notch in the border). */}
            <LabeledField
              required
              id="email"
              label="Email address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onAnimationStart={handleAutofill("email")}
              disabled={isLoading}
              error={Boolean(error) && !email.trim()}
            />
            <LabeledField
              required
              name="password"
              label="Password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onAnimationStart={handleAutofill("password")}
              disabled={isLoading}
              error={Boolean(error) && !password.trim()}
              // A+ ENHANCEMENT: Dynamic type and visibility toggle icon
              type={showPassword ? "text" : "password"}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
            />

            <Grid container alignItems="center" justifyContent="space-between">
              <Grid item>
                <FormControlLabel
                  control={
                    <Checkbox
                      value="remember"
                      color="primary"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                  }
                  label={<Typography variant="body2">Remember me</Typography>}
                />
              </Grid>
              <Grid item>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setIsForgotModalOpen(true)}
                  sx={{ textTransform: "none", fontWeight: "normal" }}
                >
                  Forgot password?
                </Button>
              </Grid>
            </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{ mt: 1, mb: 2, py: 1.5 }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Sign in"
              )}
            </Button>
          </Stack>
        </Box>

        <Typography
          className="mst-auth-signup"
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 1 }}
        >
          {"Don't have an account? "}
          <Link component={RouterLink} to="/register" variant="body2">
            Sign up
          </Link>
        </Typography>
      </AuthFrame>

      {/* "Forgot Password" Modal Dialog */}
      <Dialog
        open={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ className: "mst-glass mst-dialog", "data-mode": mode }}
        slotProps={{ backdrop: { className: `mst-dialog-backdrop is-${mode}` } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Password recovery
          <IconButton
            edge="end"
            onClick={() => setIsForgotModalOpen(false)}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Password recovery is not available yet. Your account has not been
            changed.
          </Typography>
          <LabeledField
            autoFocus
            id="recovery-email"
            label="Email address"
            type="email"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setIsForgotModalOpen(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button disabled variant="contained">
            Not available yet
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Login;
