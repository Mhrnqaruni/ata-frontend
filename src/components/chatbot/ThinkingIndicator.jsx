// /ata-frontend/src/components/chatbot/ThinkingIndicator.jsx

import React, { useEffect, useState } from 'react';
import { Box, Stack, Typography, Avatar, CircularProgress } from '@mui/material';
import AutoAwesome from '@mui/icons-material/AutoAwesome';

const PHRASES = [
  'Analyzing responses...',
  'Summarizing trends...',
  'Finding key insights...',
  'Checking performance patterns...',
  'Preparing the answer...'
];

const ThinkingIndicator = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PHRASES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Avatar sx={{ width: 40, height: 40, bgcolor: 'secondary.light', color: 'primary.main' }}>
        <AutoAwesome />
      </Avatar>
      <Box
        sx={{
          p: '10px 14px',
          bgcolor: 'grey.100',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <CircularProgress size={14} />
        <Typography variant="body2" color="text.secondary">
          {PHRASES[index]}
        </Typography>
      </Box>
    </Stack>
  );
};

export default ThinkingIndicator;
