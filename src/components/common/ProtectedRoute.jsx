// /src/components/common/ProtectedRoute.jsx

// --- Core React & Router Imports ---
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// --- MUI Component Imports for Loading State ---
import { Box, CircularProgress } from '@mui/material';

// --- Custom Hook Import for Authentication State ---
// This is the critical link to our global authentication context.
import { useAuth } from '../../hooks/useAuth';

/**
 * A wrapper component that acts as a security checkpoint for private routes.
 *
 * It performs three essential checks:
 * 1. Checks if the initial authentication status is still being determined.
 * 2. If not loading, it checks if the user is authenticated.
 * 3. If authenticated, it renders the requested child component (the page).
 * 4. If not authenticated, it redirects the user to the login page.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - The component/page to render if the user is authenticated.
 */
const ProtectedRoute = ({ children }) => {
  // --- Consume Global Authentication State ---
  // We get both the authentication status and the initial loading status from our context.
  const { isAuthenticated, isAuthLoading } = useAuth();
  
  // The `useLocation` hook from React Router gives us information about the current URL.
  // We need this to remember where the user was trying to go before we redirected them.
  const location = useLocation();

  // --- 1. Handle the Initial Loading State ---
  // This is a crucial UX feature. While the `useAuth` hook is performing its initial
  // check (e.g., verifying a token from localStorage with the backend), we show a
  // full-page loading spinner. This prevents a "flash of unauthenticated content"
  // and provides clear feedback to the user that the application is loading.
  if (isAuthLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh', // Take up the full viewport height
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // --- 2. Handle the Unauthenticated State ---
  // If the initial loading is finished AND the user is NOT authenticated,
  // we must redirect them to the login page.
  if (!isAuthenticated) {
    // The `<Navigate>` component from React Router is the declarative way to
    // perform a redirect.
    // - `to="/login"`: The destination path.
    // - `replace`: This replaces the current entry in the history stack instead of
    //   pushing a new one. This means the user won't be able to click the "back"
    //   button to get back to the protected page they were just redirected from.
    // - `state={{ from: location }}`: This is a critical piece of UX. We pass the
    //   current `location` object along with the redirect. The Login page can
    //   then access this state to redirect the user back to their original
    //   destination after they successfully log in.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // --- 3. Handle the Authenticated State ---
  // If the loading is finished AND the user is authenticated, we simply render
  // the child components that were passed into this ProtectedRoute.
  return children;
};

export default ProtectedRoute;
