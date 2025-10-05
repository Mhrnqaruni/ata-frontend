// /src/pages/assessments/ReviewPage.jsx (FINAL, FLAWLESS IMPLEMENTATION)

// --- Core React & Router Imports ---
import React, { useEffect, useReducer, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

// --- MUI Component Imports ---
import {
  Box, Typography, Button, CircularProgress, Alert, AlertTitle,
  Breadcrumbs, Link as MuiLink, Stack, Paper
} from '@mui/material';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';

// --- Custom Component & Service Imports ---
import assessmentService from '../../services/assessmentService';
import { useSnackbar } from '../../hooks/useSnackbar';
import QuestionReviewCard from '../../components/assessments/QuestionReviewCard'; // NEW: Import child component
import ConfirmationModal from '../../components/common/ConfirmationModal';

// --- State Management (useReducer for Complex State) ---

const initialState = {
  isLoading: true,
  error: null,
  reviewData: null,       // Will hold the entire payload from the backend
  overrides: {},          // Tracks teacher edits: { resultId: { grade, feedback } }
  isSaving: false,
  isFinalizing: false,
};

function reviewReducer(state, action) {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, reviewData: action.payload, error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'UPDATE_OVERRIDE': {
      const { resultId, field, value } = action.payload;
      return {
        ...state,
        overrides: {
          ...state.overrides,
          [resultId]: { ...state.overrides[resultId], [field]: value },
        },
      };
    }
    case 'SAVE_START':
      return { ...state, isSaving: true };
    case 'SAVE_SUCCESS':
      // After saving, optimistically update main data and clear the overrides
      return { ...state, isSaving: false, teacherOverrides: {}, reviewData: action.payload };
    case 'SAVE_FAILURE':
      return { ...state, isSaving: false };
    case 'FINALIZE_START':
      return { ...state, isFinalizing: true };
    case 'FINALIZE_FINISH':
      return { ...state, isFinalizing: false };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

// --- The Main Page Component ---

const ReviewPage = () => {
  const { job_id, student_id } = useParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [state, dispatch] = useReducer(reviewReducer, initialState);
  const [isConfirmOpen, setConfirmOpen] = React.useState(false);

  // --- Data Fetching Effect ---
  const fetchDetails = useCallback(async () => {
    try {
      const data = await assessmentService.getStudentReviewDetails(job_id, student_id);
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', payload: err.message || "Could not load review session." });
    }
  }, [job_id, student_id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // --- Memoized Selectors for Derived State ---
  const studentData = useMemo(() => state.reviewData?.student, [state.reviewData]);
  const hasUnsavedChanges = useMemo(() => Object.keys(state.overrides).length > 0, [state.overrides]);

  const questionsWithOverrides = useMemo(() => {
    if (!studentData?.questions) return [];
    // This is the core logic for our optimistic UI. It merges the server data with
    // any local, unsaved changes from the teacher.
    return studentData.questions.map(q => {
      const overrideData = state.overrides[q.resultId];
      return overrideData ? { ...q, ...overrideData } : q;
    });
  }, [studentData, state.overrides]);
  
  const isFinalizable = useMemo(() => {
    // A job is finalizable only if EVERY question has a valid grade and is not pending.
    if (!questionsWithOverrides.length) return false;
    return questionsWithOverrides.every(q => 
        q.status !== 'pending_review' && 
        q.grade !== null && 
        q.grade !== ''
    );
  }, [questionsWithOverrides]);


  // --- Event Handlers ---

  // Lifts state from QuestionReviewCard up to our reducer
  const handleUpdateOverride = (resultId, field, value) => {
    dispatch({ type: 'UPDATE_OVERRIDE', payload: { resultId, field, value } });
  };

  // Handles saving all changed questions to the backend
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges) return;
    dispatch({ type: 'SAVE_START' });

    // Create an array of promises for each pending save operation.
    const savePromises = Object.entries(state.overrides).map(([resultId, data]) => {
      const grade = parseFloat(data.grade);
      // Construct a payload that matches the TeacherOverrideRequest Pydantic model
      const payload = { ...data, grade: isNaN(grade) ? null : grade };
      return assessmentService.saveTeacherOverride(resultId, payload);
    });

    try {
      await Promise.all(savePromises);
      // For the best user experience and data consistency, we re-fetch the
      // entire dataset from the server after a successful save.
      await fetchDetails();
      showSnackbar('Your changes have been saved!', 'success');
    } catch (err) {
      dispatch({ type: 'SAVE_FAILURE' });
      showSnackbar(err.message || 'An error occurred while saving.', 'error');
    }
  };

  // Handles the final submission of the reviewed job
  const handleFinalize = async () => {
    setConfirmOpen(false); // Close confirmation modal first.
    dispatch({ type: 'FINALIZE_START' });
    try {
      await assessmentService.finalizeJobReview(job_id);
      showSnackbar('Assessment finalized! Analytics are now updated.', 'success');
      navigate(`/assessments/${job_id}/results`);
    } catch (err) {
      showSnackbar(err.message || 'Failed to finalize assessment.', 'error');
      dispatch({ type: 'FINALIZE_FINISH' });
    }
  };

  // --- Render Logic ---

  if (state.isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }
  if (state.error) {
    return <Alert severity="error" sx={{ m: 3 }}><AlertTitle>Error</AlertTitle>{state.error}</Alert>;
  }
  if (!state.reviewData || !studentData) {
    return <Alert severity="info" sx={{ m: 3 }}>No review data found.</Alert>;
  }

  return (
    <>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <MuiLink component={RouterLink} underline="hover" color="inherit" to="/assessments">Assessments</MuiLink>
        <MuiLink component={RouterLink} underline="hover" color="inherit" to={`/assessments/${job_id}/results`}>{state.reviewData.assessmentName}</MuiLink>
        <Typography color="text.primary">Review: {studentData.name}</Typography>
      </Breadcrumbs>
      
      {/* Top action bar */}
      <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: 3, position: 'sticky', top: '72px', zIndex: 1100 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
          <Box>
            <Typography variant="h2">Reviewing: {studentData.name}</Typography>
            <Typography color="text.secondary">{state.reviewData.assessmentName} - {questionsWithOverrides.length} Questions</Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={handleSaveChanges}
              disabled={!hasUnsavedChanges || state.isSaving || state.isFinalizing}
              startIcon={state.isSaving ? <CircularProgress size={20} /> : <SaveOutlined />}
            >
              {state.isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="contained"
              onClick={() => setConfirmOpen(true)}
              disabled={!isFinalizable || hasUnsavedChanges || state.isFinalizing || state.isSaving}
              startIcon={state.isFinalizing ? <CircularProgress size={20} /> : <FactCheckOutlined />}
            >
              {state.isFinalizing ? 'Finalizing...' : 'Finalize & View Results'}
            </Button>
          </Stack>
        </Stack>
        {/* Conditional alerts to guide the user */}
        {hasUnsavedChanges && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You have unsaved changes. Click "Save Changes" to persist them.
          </Alert>
        )}
        {!isFinalizable && !hasUnsavedChanges && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This job cannot be finalized until all questions have been graded.
          </Alert>
        )}
      </Paper>
      
      {/* List of question review cards */}
      <Stack spacing={3}>
        {questionsWithOverrides.map((q, index) => (
          <QuestionReviewCard
            key={q.resultId || q.questionId}
            questionData={q}
            questionNumber={index + 1}
            onUpdate={handleUpdateOverride}
            disabled={state.isSaving || state.isFinalizing}
          />
        ))}
      </Stack>

      <ConfirmationModal
          open={isConfirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleFinalize}
          title="Finalize Assessment Review?"
          description="This action will lock all grades for this job, recalculate analytics, and mark it as 'Completed'. You will no longer be able to make changes. Are you sure you wish to proceed?"
      />
    </>
  );
};

export default ReviewPage;