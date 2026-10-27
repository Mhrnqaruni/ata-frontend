// /src/components/common/MathInputWithPreview.jsx

import React from 'react';
import { TextField, Box, Typography } from '@mui/material';
import MathTextDisplay from './MathTextDisplay';
import { normalizeMathText } from '../../utils/mathRenderer';

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
  const sourceValue = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
  const showPreview = /\$|\\\(|\\\[/.test(sourceValue) || normalizeMathText(sourceValue) !== sourceValue;

  return (
    <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
      <TextField
        fullWidth
        value={sourceValue}
        onChange={onChange}
        label={label}
        placeholder={placeholder}
        helperText={helperText}
        {...props}
      />
      {showPreview && (
        <Box 
          sx={{ 
            minWidth: 0, maxWidth: "100%", overflowX: "auto",
            mt: 1, 
            p: 2, 
            border: '1px solid', borderColor: 'divider',
            borderRadius: 1, 
            bgcolor: 'action.hover'
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Preview:
          </Typography>
          <MathTextDisplay text={sourceValue} />
        </Box>
      )}
    </Box>
  );
};

export default MathInputWithPreview;
