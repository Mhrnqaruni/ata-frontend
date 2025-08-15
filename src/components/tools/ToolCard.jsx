// /src/components/tools/ToolCard.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Card, CardActionArea, Typography, Box } from '@mui/material';

/**
 * A presentational card for displaying a single AI Tool in a grid.
 * It is a fully interactive target that navigates to the specific tool's
 * page on click.
 *
 * @param {object} props
 * @param {object} props.tool - The data object for the tool.
 */
const ToolCard = ({ tool }) => {
  const navigate = useNavigate();

  return (
    // Grid item defines its own responsive behavior
    <Grid item xs={12} md={6} lg={4}>
      <Card
        sx={{
          height: '100%',
          // Use a transparent border that gains color on hover for a smooth transition
          border: '1px solid transparent',
          transition: 'border-color 300ms ease, box-shadow 300ms ease',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: 4, // Use a standard theme elevation for the hover shadow
          },
        }}
      >
        <CardActionArea
          onClick={() => navigate(tool.path)}
          sx={{
            height: '100%',
            p: 3, // 24px padding
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* The Icon, cloned to apply specific styles */}
            {React.cloneElement(tool.icon, {
              sx: { color: 'primary.main', fontSize: 40 },
            })}

            {/* The Text Content */}
            <Box sx={{ ml: 2 }}>
              <Typography variant="h3">{tool.title}</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                {tool.description}
              </Typography>
            </Box>
          </Box>
        </CardActionArea>
      </Card>
    </Grid>
  );
};

export default ToolCard;