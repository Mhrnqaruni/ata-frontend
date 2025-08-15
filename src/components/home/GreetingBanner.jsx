// /src/components/home/GreetingBanner.jsx

// --- Core React & Hook Imports ---
import React from 'react';

// --- MUI Component Imports ---
import { Box, Typography } from '@mui/material';

// --- Custom Hook Import for Global State ---
// This component consumes the global authentication state to get the user's name.
import { useAuth } from '../../hooks/useAuth';

/**
 * A purely presentational component that displays a personalized banner.
 * It greets the user by name with a message that changes based on the time of day.
 */
const GreetingBanner = () => {
  // --- Consume Global State ---
  const { user } = useAuth();

  // --- Internal Helper Functions for Dynamic Content ---
  
  /**
   * Determines the correct greeting based on the current hour.
   * @returns {string} The greeting string (e.g., "Good morning,").
   */
  const getGreeting = () => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      return 'Good morning,';
    } else if (currentHour < 17) { // 5 PM
      return 'Good afternoon,';
    } else {
      return 'Good evening,';
    }
  };

  /**
   * Gets the user's display name, with a graceful fallback.
   * @returns {string} The user's name or a generic fallback.
   */
  const getUserDisplayName = () => {
    // In V2, this could be updated to parse the first name from the full name.
    // For now, it simply returns a placeholder.
    // now i just comment  user.name, so we can show a simple name, later we should make it based on users
    if (user && user.name) {
      // return user.name;
      return 'Dear Teacher'
    }
    // This fallback prevents the UI from breaking if the user object is not yet loaded.
    return 'there';
  };

  return (
    // Add a bottom margin for spacing from the elements below it.
    <Box sx={{ mb: 4 }}>
      {/* 
        The 'h1' variant is used for the main page heading for semantic HTML.
        'display: inline' is used to allow the two Typography components to sit
        on the same line, overriding the default block behavior of the h1 tag.
      */}
      <Typography variant="h1" color="text.primary" sx={{ display: 'inline' }}>
        {getGreeting()}
      </Typography>
      
      {/* This ensures a space is rendered between the two components. */}
      {' '}
      
      <Typography variant="h1" color="primary" sx={{ display: 'inline' }}>
        {`${getUserDisplayName()}!`}
      </Typography>
    </Box>
  );
};

export default GreetingBanner;