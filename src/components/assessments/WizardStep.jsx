// /src/components/assessments/WizardStep.jsx

import React from 'react';
import { Box, Typography, Divider } from '@mui/material';

const WizardStep = ({ title, description, children }) => {
  return (
    <Box>
      <Typography variant="h3">{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {description}
      </Typography>
      <Divider sx={{ my: 3 }} />
      <Box>
        {children}
      </Box>
    </Box>
  );
};

export default WizardStep;