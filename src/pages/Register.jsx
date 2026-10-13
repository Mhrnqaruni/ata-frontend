// /src/pages/Register.jsx (ENHANCED, UNIFIED, AND FLAWLESS)

// --- Core React & Router Imports ---
import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";

// --- MUI Component Imports ---
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Link,
  FormControlLabel,
  Checkbox,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  IconButton,
  InputAdornment,
} from "@mui/material";
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

const ACCOUNT_TYPES = [
  {
    value: "teacher",
    label: "Teacher",
    help: "Classes, quizzes, assessments and analytics.",
  },
  {
    value: "parent",
    label: "Parent",
    help: "The parent portal. Students can be linked later.",
  },
];

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
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    accountType: "teacher",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // --- Real-time Validation Logic ---
  const validateField = (name, value) => {
    let errorMsg = "";
    if (
      name === "fullName" &&
      value.trim().length > 0 &&
      value.trim().length < 3
    ) {
      errorMsg = "Full name must be at least 3 characters.";
    }
    if (
      name === "email" &&
      value.trim().length > 0 &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      errorMsg = "Please enter a valid email address.";
    }
    if (name === "password" && value.length > 0 && value.length < 8) {
      errorMsg = "Password must be at least 8 characters.";
    }
    return errorMsg;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Validate on change and clear the error if the input becomes valid
    const validationError = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: validationError }));
  };

  // --- Form Submission Handler ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError("");
    setIsLoading(true);

    try {
      // Final validation before submitting
      const finalErrors = {};
      Object.keys(formData).forEach((key) => {
        const error = validateField(key, formData[key]);
        if (error) finalErrors[key] = error;
      });

      if (Object.keys(finalErrors).length > 0) {
        setErrors(finalErrors);
        throw new Error("Please correct the errors before submitting.");
      }

      await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        accountType: formData.accountType,
      });
      const accountLabel =
        formData.accountType === "parent" ? "Parent" : "Teacher";
      showSnackbar(
        `${accountLabel} account created successfully! Please sign in.`,
        "success",
      );
      navigate("/login");
    } catch (err) {
      // Errors from the validate function will be caught here,
      // as well as errors from the backend.
      setServerError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if the form is valid and terms are agreed to for enabling the submit button.
  const canSubmit =
    !Object.values(errors).some((error) => error !== "") &&
    formData.fullName.trim().length >= 3 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formData.password.length >= 8 &&
    agreedToTerms;

  const accountType =
    ACCOUNT_TYPES.find((type) => type.value === formData.accountType) ||
    ACCOUNT_TYPES[0];

  return (
    <AuthFrame
      title="Create your account"
      description="A clearer workspace for teaching and feedback."
    >
      {serverError && (
        <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ width: "100%" }}
      >
        <Stack className="mst-auth-stack" spacing={2}>
          {/* Account type: real radio buttons, drawn as one segmented control. */}
          <fieldset
            className="mst-seg"
            data-value={accountType.value}
            disabled={isLoading}
          >
            <legend className="mst-field-label">I am a</legend>
            <div className="mst-seg-track">
              <span aria-hidden="true" className="mst-seg-thumb" />
              {ACCOUNT_TYPES.map((type) => (
                <label className="mst-seg-option" key={type.value}>
                  <input
                    aria-describedby="account-type-help"
                    checked={formData.accountType === type.value}
                    name="accountType"
                    onChange={handleChange}
                    type="radio"
                    value={type.value}
                  />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
            <p className="mst-seg-help" id="account-type-help">
              {accountType.help}
            </p>
          </fieldset>
          <LabeledField
            required
            id="fullName"
            label="Full name"
            name="fullName"
            autoComplete="name"
            autoFocus
            value={formData.fullName}
            onChange={handleChange}
            disabled={isLoading}
            error={!!errors.fullName}
            helperText={errors.fullName}
          />
          <LabeledField
            required
            id="email"
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            error={!!errors.email}
            helperText={errors.email}
          />
          <LabeledField
            required
            id="password"
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            error={!!errors.password}
            helperText={errors.password || "At least 8 characters."}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((show) => !show)}
                  onMouseDown={(event) => event.preventDefault()}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />

          <FormControlLabel
            className="mst-auth-terms"
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
              <Typography variant="body2">
                I agree to the{" "}
                <Link
                  href="https://www.mysmartteach.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of{"\u00a0"}Service
                </Link>{" "}
                and{" "}
                <Link
                  href="https://www.mysmartteach.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy{"\u00a0"}Policy
                </Link>
                .
              </Typography>
            }
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading || !canSubmit}
            sx={{ py: 1.5 }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Create account"
            )}
          </Button>
        </Stack>
      </Box>

      <Typography
        className="mst-auth-signup"
        variant="body2"
        color="text.secondary"
        align="center"
        sx={{ mt: 2 }}
      >
        {"Already have an account? "}
        <Link component={RouterLink} to="/login" variant="body2">
          Sign in
        </Link>
      </Typography>
    </AuthFrame>
  );
};

export default Register;
