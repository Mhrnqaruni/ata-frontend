// /ata-frontend/src/components/chatbot/ChatWelcome.jsx

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';

const ChatWelcome = ({ onSend, entityName }) => {
  const handleClick = () => {
    const prompt = entityName
      ? `Give me a comprehensive overview of ${entityName}.`
      : 'Give me a comprehensive overview of my teaching data.';
    onSend(prompt);
  };

  return (
    <Box
      sx={{
        px: 3,
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 2
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        AI Analytics Ready
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {entityName
          ? `Ask anything about ${entityName} or start with a full overview.`
          : 'Ask me anything about your classes, students, or quizzes.'}
      </Typography>
      <Button
        startIcon={<InsightsIcon />}
        onClick={handleClick}
        sx={{
          background: 'linear-gradient(90deg, #20c5e8 0%, #4d47e0 100%)',
          color: 'white',
          boxShadow: '0 3px 5px 2px rgba(32, 197, 232, .3)',
          fontWeight: 'bold',
          py: 1.5,
          px: 3,
          '&:hover': {
            background: 'linear-gradient(90deg, #1ba5c8 0%, #3d37c0 100%)',
            boxShadow: '0 4px 6px 2px rgba(32, 197, 232, .4)',
          }
        }}
      >
        Give me a comprehensive overview
      </Button>
    </Box>
  );
};

export default ChatWelcome;
