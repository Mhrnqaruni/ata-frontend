// /src/components/tools/ToolPageLayout.jsx

import React from 'react';
import { Box, Typography, Grid, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

/**
 * A standard, reusable two-column layout for all individual AI tool pages.
 * It provides a consistent structure with a settings panel and an output panel.
 *
 * @param {object} props
 * @param {string} props.title - The title of the tool.
 * @param {React.ReactElement} props.icon - The icon for the tool.
 * @param {React.ReactElement} props.settingsPanel - The component for the left settings column.
 * @param {React.ReactElement} props.outputPanel - The component for the right output column.
 */
const ToolPageLayout = ({ title, icon, settingsPanel, outputPanel }) => {
  return (
    <Box>
      {/* 1. Page Header with Breadcrumbs for navigational context */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <MuiLink component={RouterLink} underline="hover" color="inherit" to="/tools">
          AI Tools
        </MuiLink>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {React.cloneElement(icon, { sx: { mr: 1, fontSize: '1.25rem' } })}
          <Typography color="text.primary">{title}</Typography>
        </Box>
      </Breadcrumbs>

      <Typography variant="h2" sx={{ mb: 4 }}>
        {title}
      </Typography>

      {/* 2. Responsive Two-Column Grid */}
      <Grid container spacing={4}>
        {/* Left Column: Settings Panel Slot */}
        <Grid item xs={12} md={4}>
          {settingsPanel}
        </Grid>

        {/* Right Column: Output Panel Slot */}
        <Grid item xs={12} md={8}>
          {outputPanel}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ToolPageLayout;