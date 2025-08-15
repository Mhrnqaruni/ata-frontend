// /ata-frontend/src/components/chatbot/ExamplePrompts.jsx

import React from 'react';
import { Box, Typography, Grid, Card, CardActionArea } from '@mui/material';

// The static data for the prompts. In V2, this could come from an API.
const prompts = [
  "List all students in my '10th Grade World History' class.",
  "What was the class average on the 'Mid-Term Biology Exam'?",
  "Show me students who scored below 70% on the 'Chapter 5 Quiz'.",
  "Which student has the highest overall grade in '11th Grade Physics'?",
];

/**
 * A UI component that displays a grid of clickable example prompts
 * to help guide the user.
 *
 * @param {object} props
 * @param {function} props.onPromptClick - Callback function invoked when a prompt is clicked.
 */
const ExamplePrompts = ({ onPromptClick }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h4" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
        Not sure where to start? Try one of these:
      </Typography>
      <Grid container spacing={2}>
        {prompts.map((prompt, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderColor: 'divider',
                transition: 'border-color 300ms ease, box-shadow 300ms ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: 2,
                },
              }}
            >
              <CardActionArea
                onClick={() => onPromptClick(prompt)}
                sx={{ p: 2, height: '100%' }}
              >
                <Typography variant="body1" color="text.primary">
                  {prompt}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ExamplePrompts;