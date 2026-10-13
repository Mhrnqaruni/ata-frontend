import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, CircularProgress, Alert, TextField, Button, Divider, Grid, Card, Skeleton
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import reviewService from '../../services/reviewService';
import { useSnackbar } from '../../hooks/useSnackbar';
import StatusChip from '../../components/assessments/StatusChip';
import PageHeader from '../../components/common/PageHeader';

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
    <Card className="mst-rim mst-review-q" key={q.questionId}>
      <div className="mst-review-q-head">
        <span aria-hidden="true" className="mst-question-num">{index + 1}</span>
        <h3 className="mst-review-q-title">Question {index + 1}</h3>
        <StatusChip status={q.status} />
      </div>
      <p className="mst-review-q-text">{q.questionText}</p>
      <div className="mst-review-answer">
        <span className="mst-review-answer-label">Student's answer</span>
        <span className="mst-review-answer-text">{q.studentAnswer || "No answer was read from the sheet."}</span>
      </div>
      <div className="mst-review-fields">
        <TextField
          label={`Mark (out of ${q.maxScore})`}
          type="number"
          value={q.grade ?? ''}
          onChange={(e) => handleLocalChange(q.questionId, 'grade', e.target.value)}
          InputProps={{ inputProps: { min: 0, max: q.maxScore } }}
        />
        <TextField
          fullWidth
          label="Feedback for the student"
          multiline
          minRows={3}
          value={q.feedback ?? ''}
          onChange={(e) => handleLocalChange(q.questionId, 'feedback', e.target.value)}
        />
      </div>
      <div className="mst-review-q-foot">
        <Button variant="contained" onClick={() => handleSaveQuestion(q.questionId)}>
          Save question
        </Button>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <Box>
        <Skeleton height={64} sx={{ mb: 3.5, maxWidth: 360 }} variant="rounded" />
        {[0, 1, 2].map((i) => <Skeleton height={260} key={i} sx={{ mb: 2 }} variant="rectangular" />)}
      </Box>
    );
  }

  if (error) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }

  if (!data) {
    return <Container sx={{ mt: 4 }}><Typography>No review data found for this student.</Typography></Container>;
  }

  return (
    <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
      <Box>
        <PageHeader
          backLabel="Back to results"
          backTo={`/assessments/${job_id}/results`}
          breadcrumbs={[{ label: 'Assessments', to: '/assessments' }, { label: data?.assessmentName || 'Results', to: `/assessments/${job_id}/results` }, { label: data?.studentName || 'Review' }]}
          leading={<span aria-hidden="true" className="mst-avatar" data-size="lg">{(data?.studentName || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}</span>}
          subtitle={`${data?.assessmentName}${data?.studentId ? ` · Student ID ${data.studentId}` : ''}`}
          title={data?.studentName || 'Review'}
        />

        {/* Pending Questions Section */}
        {pendingQuestions.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>{pendingQuestions.length} {pendingQuestions.length === 1 ? 'question needs' : 'questions need'} your mark.</strong> The three AI marks didn't agree, so these wait for you.
            </Alert>
            {pendingQuestions.map((q, idx) => {
              // Find the original index for correct question numbering
              const originalIndex = perQ.findIndex(pq => pq.questionId === q.questionId);
              return renderQuestionCard(q, originalIndex);
            })}
          </Box>
        )}

        {/* All Questions Section */}
        <Box>
          <div className="mst-section-label">All questions · {allQuestions.length}</div>
          {allQuestions.map((q, idx) => renderQuestionCard(q, idx))}
        </Box>
      </Box>
    </Box>
  );
};

export default AssessmentReviewPage;