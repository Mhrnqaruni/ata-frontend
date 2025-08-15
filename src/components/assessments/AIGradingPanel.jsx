// /src/components/assessments/AIGradingPanel.jsx
import React from 'react';
import { Card, CardHeader, CardContent, TextField, Typography, Box } from '@mui/material';

const AIGradingPanel = ({
  suggestedGrade,
  suggestedFeedback,
  overrideGrade,
  overrideFeedback,
  onGradeChange,
  onFeedbackChange,
  maxScore,
  disabled
}) => {
  const displayGrade = overrideGrade ?? suggestedGrade;
  const displayFeedback = overrideFeedback ?? suggestedFeedback;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader title="AI Suggestion & Review" />
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Grade (out of {maxScore || 10})
          </Typography>
          <TextField
            fullWidth variant="outlined" type="number"
            value={displayGrade}
            onChange={(e) => onGradeChange(e.target.value)}
            disabled={disabled}
            InputProps={{ sx: { fontSize: '2rem', fontWeight: 700 } }}
          />
        </Box>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
            Feedback
          </Typography>
          <TextField
            fullWidth multiline rows={10}
            value={displayFeedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
            helperText="You can edit the AI's feedback here."
            disabled={disabled}
            sx={{ flexGrow: 1, '& .MuiInputBase-root': { height: '100%' } }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
export default AIGradingPanel;