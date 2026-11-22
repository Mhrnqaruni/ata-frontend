// The app-wide pop-up messages: a provider that shows them and a hook with showSnackbar(message, severity, reference,
// action). An error with a reference stays until it's closed; an action ({ label, onClick }) adds one button.
// Area: platform

// --- Core React Imports ---
import React, { useState, createContext, useContext, useMemo } from 'react';

// --- MUI Component Imports ---
// Import the components needed to render the notification UI.
import { Snackbar, Alert, Button } from '@mui/material';
import ErrorReference from '../components/common/ErrorReference';
import { formatReference } from '../services/clientErrors';

// --- Create the Context ---
// This context will only hold the function to show a snackbar.
const SnackbarContext = createContext(null);

/**
 * The Provider component that makes the snackbar functionality available to the entire app.
 * It is also responsible for rendering the actual MUI Snackbar and Alert components.
 */
export const SnackbarProvider = ({ children }) => {
  // --- State Management ---
  // This state holds the properties of the snackbar to be displayed.
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: '',
    severity: 'info', // Can be 'error', 'warning', 'info', or 'success'
    reference: null, // An error's reference (error.reference), shown for errors only
    action: null, // One button, { label, onClick }, such as Download when feedback is ready
  });

  // --- Core Functions ---
  // This is the function that will be exposed to the rest of the app.
  // It takes a message and severity and updates the state to show the snackbar.
  const showSnackbar = (message, severity = 'info', reference = null, action = null) => {
    setSnackbarState({ open: true, message, severity, reference, action });
  };

  // This function handles the closing of the snackbar, either by timeout or close button.
  const handleClose = (event, reason) => {
    // We don't want to close the snackbar if the user clicks away.
    if (reason === 'clickaway') {
      return;
    }
    // Set 'open' to false to hide the snackbar.
    setSnackbarState((prev) => ({ ...prev, open: false }));
  };

  // --- Memoize the Context Value ---
  // We memoize the context value to prevent consumers from re-rendering
  // every time the provider's internal state changes.
  const contextValue = useMemo(() => ({ showSnackbar }), []);

  // An error's reference is its last line, and the error then stays until it's closed, so there's time to copy it.
  const reference = snackbarState.severity === 'error' ? snackbarState.reference : null;
  // A message with a button stays 10 s, so there's time to press it; pressing it closes the message.
  const { action } = snackbarState;
  const button = action ? (
    <Button
      color="inherit"
      onClick={() => {
        handleClose();
        action.onClick();
      }}
      size="small"
    >
      {action.label}
    </Button>
  ) : undefined;

  return (
    <SnackbarContext.Provider value={contextValue}>
      {children}

      {/*
        The Snackbar component is rendered here, at the top level.
        It listens to the 'snackbarState' and shows/hides itself accordingly.
      */}
      <Snackbar
        open={snackbarState.open}
        autoHideDuration={formatReference(reference) ? null : action ? 10000 : 4500}
        onClose={handleClose}
        // Position the snackbar at the bottom center of the screen.
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {/*
          The Alert component provides the actual visual style (color, icon)
          for the message, based on the 'severity' state. The onClose prop
          adds the 'X' close button to the alert.
        */}
        <Alert
          action={button}
          className="mst-toast"
          onClose={handleClose}
          severity={snackbarState.severity}
          sx={{ width: '100%' }}
        >
          {snackbarState.message}
          <ErrorReference reference={reference} />
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

/**
 * The custom hook that components will use to access the showSnackbar function.
 */
export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (context === undefined) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};
