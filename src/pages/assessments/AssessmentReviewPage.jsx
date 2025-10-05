import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, CircularProgress, Alert, TextField, Button,
  Divider, Grid
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import reviewService from '../../services/reviewService';
import { useSnackbar } from '../../hooks/useSnackbar';
import StatusChip from '../../components/assessments/StatusChip';

const AssessmentReviewPage = () => {
  const navigate = useNavigate();
  const { job_id, entity_id } = useParams();

  const { showSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!job_id || !entity_id) {
        setError("Job ID or Entity ID is missing from the URL.");
        setLoading(false);
        return;
    };

    const fetchReviewData = async () => {
      try {
        setLoading(true);
        const fetchedData = await reviewService.getStudentReview(job_id, entity_id);
        setData(fetchedData);
      } catch (err) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    };
    fetchReviewData();
  }, [job_id, entity_id]);

  const handleLocalChange = (questionId, field, value) => {
    setData(prev => {
        if (!prev) return null;
        const updatedPerQuestion = prev.perQuestion.map(q =>
            q.questionId === questionId ? { ...q, [field]: value } : q
        );
        return { ...prev, perQuestion: updatedPerQuestion };
    });
  };

  const handleSaveQuestion = async (questionId) => {
    const questionToSave = data.perQuestion.find(q => q.questionId === questionId);
    if (!questionToSave) {
        showSnackbar('Error: Could not find the question to save.', 'error');
        return;
    }

    const payload = {
      grade: Number(questionToSave.grade ?? 0),
      feedback: questionToSave.feedback ?? '',
    };

    const maxScore = questionToSave.maxScore || 100;
    if (payload.grade < 0 || payload.grade > maxScore) {
        showSnackbar(`Grade must be between 0 and ${maxScore}.`, 'error');
        return;
    }

    try {
      // Use the entity_id from the URL for the API call.
      await reviewService.saveQuestion(job_id, entity_id, questionId, payload);
      showSnackbar('Changes saved successfully!', 'success');
      // Optimistically update the status of the question in the UI
      setData(prev => {
        if (!prev) return null;
        const updatedPerQuestion = prev.perQuestion.map(q =>
            q.questionId === questionId ? { ...q, status: 'TEACHER_GRADED' } : q
        );
        return { ...prev, perQuestion: updatedPerQuestion };
      });
    } catch (err) {
      showSnackbar(err.message || 'Failed to save changes.', 'error');
    }
  };

  const perQ = data?.perQuestion ?? [];

  // Separate pending and non-pending questions
  const pendingQuestions = perQ.filter(q => q.status === 'PENDING_REVIEW');
  const allQuestions = perQ;

  // Render a single question card
  const renderQuestionCard = (q, index) => (
    <Paper key={q.questionId} sx={{ p: 3, mb: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Question {index + 1}</Typography>
          <StatusChip status={q.status} />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{q.questionText}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary">Student's Answer:</Typography>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, minHeight: 80, whiteSpace: 'pre-wrap', bgcolor: '#f9f9f9' }}>
            <Typography variant="body2">{q.studentAnswer || "No answer extracted."}</Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label={`Grade (out of ${q.maxScore})`}
            type="number"
            value={q.grade ?? ''}
            onChange={(e) => handleLocalChange(q.questionId, 'grade', e.target.value)}
            InputProps={{ inputProps: { min: 0, max: q.maxScore } }}
          />
        </Grid>
        <Grid item xs={8}>
          <TextField
            fullWidth
            label="Feedback"
            multiline
            rows={3}
            value={q.feedback ?? ''}
            onChange={(e) => handleLocalChange(q.questionId, 'feedback', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={() => handleSaveQuestion(q.questionId)}>
            Save Question
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );

  if (loading) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Container>;
  }

  if (error) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }

  if (!data) {
    return <Container sx={{ mt: 4 }}><Typography>No review data found for this student.</Typography></Container>;
  }

  return (
    <Box sx={{ flexGrow: 1, mb: 8 }}>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(`/assessments/${job_id}/results`)}>
            Back to Results
          </Button>
        </Box>

        <Typography variant="h4">{data?.assessmentName}</Typography>
        <Typography variant="h6" color="text.secondary">Reviewing: {data?.studentName} ({data?.studentId})</Typography>
        <Divider sx={{ my: 2 }} />

        {/* Pending Questions Section */}
        {pendingQuestions.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                mb: 3,
                p: 2,
                bgcolor: '#FFF4E5',
                borderLeft: '4px solid #FF9800',
                borderRadius: 1
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#663C00', mb: 0.5 }}>
                Pending Review
              </Typography>
              <Typography variant="body2" sx={{ color: '#8D6708' }}>
                The following {pendingQuestions.length} {pendingQuestions.length === 1 ? 'question requires' : 'questions require'} your attention and grading.
              </Typography>
            </Box>
            {pendingQuestions.map((q, idx) => {
              // Find the original index for correct question numbering
              const originalIndex = perQ.findIndex(pq => pq.questionId === q.questionId);
              return renderQuestionCard(q, originalIndex);
            })}
          </Box>
        )}

        {/* All Questions Section */}
        <Box>
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: '#E3F2FD',
              borderLeft: '4px solid #2196F3',
              borderRadius: 1
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#0D47A1', mb: 0.5 }}>
              All Questions
            </Typography>
            <Typography variant="body2" sx={{ color: '#1565C0' }}>
              Complete overview of all {allQuestions.length} questions with their grades and feedback.
            </Typography>
          </Box>
          {allQuestions.map((q, idx) => renderQuestionCard(q, idx))}
        </Box>
      </Container>
    </Box>
  );
};

export default AssessmentReviewPage;