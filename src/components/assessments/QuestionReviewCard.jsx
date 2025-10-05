// /src/components/assessments/QuestionReviewCard.jsx

import React from 'react';
import {
  Box, Grid, Card, CardHeader, CardContent, TextField, Chip, Divider,
  Tooltip, Typography, Paper, IconButton, Stack 
} from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import Edit from '@mui/icons-material/Edit';
import InfoOutlined from '@mui/icons-material/InfoOutlined';

/**
 * A detailed, editable card for reviewing a single graded question.
 */
const QuestionReviewCard = ({
  questionData,
  questionNumber,
  onUpdate, // Function to lift state changes up
  disabled
}) => {
  const isPendingManualReview = questionData.status === 'pending_review';

  // Helper to determine which chip to show based on the question's status.
  const getStatusChip = () => {
    switch (questionData.status) {
      case 'ai_graded':
        return <Chip icon={<CheckCircleOutline />} label="AI Graded" color="success" size="small" variant="outlined"/>;
      case 'pending_review':
        return <Chip icon={<RateReviewOutlined />} label="Needs Your Grade" color="warning" size="small" />;
      case 'teacher_graded':
        return <Chip icon={<Edit />} label="Graded by You" color="primary" size="small" />;
      default:
        return <Chip label={questionData.status} size="small" />;
    }
  };

  return (
    <Card>
      <CardHeader
        title={`Question ${questionNumber}`}
        subheader={questionData.questionText}
        action={getStatusChip()}
        titleTypographyProps={{ variant: 'h4' }}
        subheaderTypographyProps={{ variant: 'body1', color: 'text.secondary', whiteSpace: 'pre-wrap', mt: 1 }}
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* Left Column: Student's Answer */}
          <Grid item xs={12} md={6}>
            <Typography variant="overline" color="text.secondary">Student's Transcribed Answer</Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 1, whiteSpace: 'pre-wrap', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100', minHeight: 150, fontFamily: 'monospace' }}>
              {questionData.studentAnswer || "No answer was extracted for this question."}
            </Paper>
          </Grid>

          {/* Right Column: Teacher's Grading Inputs */}
          <Grid item xs={12} md={6}>
            <Typography variant="overline" color="text.secondary">Your Evaluation</Typography>
            <Stack spacing={2} mt={1}>
              <TextField
                label={`Your Grade (out of ${questionData.maxScore})`}
                type="number"
                fullWidth
                value={questionData.grade ?? ''} // Use nullish coalescing to show an empty string for null/undefined
                onChange={(e) => onUpdate(questionData.resultId, 'grade', e.target.value)}
                disabled={disabled}
                error={isPendingManualReview && (questionData.grade === null || questionData.grade === '')}
                helperText={isPendingManualReview && (questionData.grade === null || questionData.grade === '') ? 'This question requires your grade.' : ''}
              />
              <TextField
                label="Your Feedback"
                multiline
                rows={4}
                fullWidth
                value={questionData.feedback ?? ''}
                onChange={(e) => onUpdate(questionData.resultId, 'feedback', e.target.value)}
                disabled={disabled}
              />
            </Stack>
          </Grid>
        </Grid>

        {/* Optional Section: AI Audit Trail */}
        {questionData.aiResponses?.attempts && (
          <Box mt={3}>
            <Divider>AI Audit Trail</Divider>
            <Stack spacing={2} mt={2}>
              {questionData.aiResponses.attempts.map(attempt => (
                <Paper key={attempt.attempt} variant="outlined" sx={{ p: 2, opacity: 0.8 }}>
                   <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                        AI Grader #{attempt.attempt}:
                    </Typography>
                    <Tooltip
                        placement="top-start"
                        title={
                          <Box sx={{ p: 1, whiteSpace: 'pre-wrap', maxWidth: 400, maxHeight: 300, overflow: 'auto' }}>
                            <Typography variant="caption">{JSON.stringify(attempt.raw_response, null, 2)}</Typography>
                          </Box>
                        }
                    >
                        <IconButton size="small"><InfoOutlined fontSize="inherit" /></IconButton>
                    </Tooltip>
                  </Stack>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', mt: 1 }}>
                    {attempt.error
                      ? <Typography component="span" color="error">{attempt.error}</Typography>
                      : `Suggested Grade: ${attempt.grade} — Feedback: "${attempt.feedback}"`
                    }
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default QuestionReviewCard;