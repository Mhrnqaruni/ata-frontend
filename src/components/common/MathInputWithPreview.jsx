// /src/components/common/MathInputWithPreview.jsx

import React from 'react';
import { TextField, Box, Typography } from '@mui/material';
import MathTextDisplay from './MathTextDisplay';

/**
 * TextField with live math formula preview
 * Shows rendered preview when $ or $$ is detected
 */
const MathInputWithPreview = ({ 
  value, 
  onChange, 
  label, 
  placeholder, 
  helperText,
  ...props 
}) => {
  const showPreview = (value || '').includes('$');

  return (
    <Box>
      <TextField
        fullWidth
        value={value}
        onChange={onChange}
        label={label}
        placeholder={placeholder}
        helperText={helperText}
        {...props}
      />
      {showPreview && (
        <Box 
          sx={{ 
            mt: 1, 
            p: 2, 
            border: '1px solid #e0e0e0', 
            borderRadius: 1, 
            bgcolor: '#f9f9f9' 
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Preview:
          </Typography>
          <MathTextDisplay text={value} />
        </Box>
      )}
    </Box>
  );
};

export default MathInputWithPreview;
