// /src/components/home/InfoCard.jsx

// --- Core React Import ---
import React from 'react';

// --- MUI Component Imports ---
import { Card, CardContent, Typography, Box } from '@mui/material';

/**
 * A small, non-interactive, purely presentational card to display a single,
 * high-level statistic with an icon.
 *
 * @param {object} props
 * @param {React.ReactElement} props.icon - The icon element to display.
 * @param {string | number} props.value - The primary statistic value to display.
 * @param {string} props.title - The descriptive label for the statistic.
 */
const InfoCard = ({ icon, value, title }) => {
  return (
    // The Card component uses the global styles defined in our theme.
    // 'flex: 1' allows the cards in a flex container to grow equally to fill the space.
    <Card sx={{ flex: 1, width: '100%' }}>
      <CardContent>
        {/* Use a horizontal flexbox to align the icon and text content. */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          
          {/* --- Icon with circular background --- */}
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%', // Creates the circle shape.
              backgroundColor: 'secondary.light', // Uses a color from our theme palette.
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2, // Margin-right for spacing from the text.
            }}
          >
            {/* 
              React.cloneElement is used to add a 'color' prop to the icon
              element that was passed in as a prop. This is a clean way to
              style a child prop without the parent needing to know about it.
            */}
            {React.cloneElement(icon, { color: 'primary' })}
          </Box>

          {/* --- Text content (Value and Title) --- */}
          <Box>
            <Typography variant="h2" color="text.primary">
              {value}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default InfoCard;