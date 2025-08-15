// /src/components/home/NavCard.jsx

// --- Core React & Router Imports ---
import React from 'react';
import { useNavigate } from 'react-router-dom';

// --- MUI Component Imports ---
import { Grid, Card, CardActionArea, Typography, Box } from '@mui/material';

/**
 * A large, responsive, clickable navigation card for the Home page.
 */
const NavCard = ({ item }) => {
  const navigate = useNavigate();

  return (
    // <<< CORRECTION: Changed 'xs' from 12 to 6.
    // This makes the card take up half the width on the smallest screens,
    // creating a 2x2 grid on mobile instead of a 1x4 vertical stack.
    <Grid item xs={6} md={6}>
      <Card
        sx={{
          minHeight: 180,
          transition: 'transform 300ms ease, box-shadow 300ms ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 6,
          },
        }}
      >
        <CardActionArea
          onClick={() => navigate(item.path)}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 2, sm: 3 }, // Use slightly less padding on very small screens
          }}
        >
          <Box
            sx={{
              width: { xs: 48, sm: 56 }, // Make icon slightly smaller on mobile
              height: { xs: 48, sm: 56 },
              borderRadius: '50%',
              backgroundColor: item.iconBgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.cloneElement(item.icon, {
              sx: { color: item.iconColor, fontSize: { xs: '28px', sm: '32px' } },
            })}
          </Box>
          <Typography 
            variant="h3" 
            sx={{ 
              mt: 2,
              fontSize: { xs: '1rem', sm: '1.25rem' } // Scale down font size on mobile
            }}
          >
            {item.title}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ 
              mt: 0.5, 
              textAlign: 'center', 
              maxWidth: '90%',
              display: { xs: 'none', sm: 'block' } // Hide description on smallest screens
            }}
          >
            {item.description}
          </Typography>
        </CardActionArea>
      </Card>
    </Grid>
  );
};

export default NavCard;