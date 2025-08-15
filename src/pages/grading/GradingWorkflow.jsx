// /src/pages/grading/GradingWorkflow.jsx

import React, { useEffect, useReducer, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Grid, AppBar, Toolbar, Button, IconButton, Typography,
  CircularProgress, Alert, AlertTitle
} from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';

import RubricPanel from '../../components/assessments/RubricPanel';
import AnswerSheetViewer from '../../components/assessments/AnswerSheetViewer';
import AIGradingPanel from '../../components/assessments/AIGradingPanel';
import assessmentService from '../../services/assessmentService';
import { useSnackbar } from '../../hooks/useSnackbar';

const initialState = {
  isLoading: true,
  error: null,
  jobData: null,
  currentStudentIndex: 0,
  currentQuestionIndex: 0,
  teacherOverrides: {}, // Shape: { studentId: { questionId: { grade, feedback } } }
  isSubmitting: false,
};

function gradingReducer(state, action) {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, jobData: action.payload };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'CHANGE_STUDENT': {
      const newIndex = state.currentStudentIndex + action.payload;
      if (newIndex >= 0 && newIndex < state.jobData.students.length) {
        return { ...state, currentStudentIndex: newIndex, currentQuestionIndex: 0 };
      }
      return state;
    }
    case 'UPDATE_OVERRIDE': {
      const { studentId, questionId, field, value } = action.payload;
      return {
        ...state,
        teacherOverrides: {
          ...state.teacherOverrides,
          [studentId]: {
            ...state.teacherOverrides[studentId],
            [questionId]: {
              ...state.teacherOverrides[studentId]?.[questionId],
              [field]: value,
            },
          },
        },
      };
    }
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true };
    case 'SUBMIT_FINISH':
      return { ...state, isSubmitting: false };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

const GradingWorkflow = () => {
  const { job_id } = useParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [state, dispatch] = useReducer(gradingReducer, initialState);

  useEffect(() => {
    assessmentService.getJobResults(job_id)
      .then(data => dispatch({ type: 'FETCH_SUCCESS', payload: data }))
      .catch(err => dispatch({ type: 'FETCH_ERROR', payload: "Could not load grading session." }));
  }, [job_id]);

  const currentStudent = useMemo(() => state.jobData?.students[state.currentStudentIndex], [state.jobData, state.currentStudentIndex]);
  const currentQuestion = useMemo(() => state.jobData?.questions[state.currentQuestionIndex], [state.jobData, state.currentQuestionIndex]);
  
  const aiResultForCurrent = useMemo(() => {
    if (!currentStudent || !currentQuestion) return null;
    return state.jobData.results[currentStudent.id]?.[currentQuestion.id] ?? { grade: '', feedback: 'AI could not grade this question.' };
  }, [state.jobData, currentStudent, currentQuestion]);

  const overrideForCurrent = useMemo(() => {
    if (!currentStudent || !currentQuestion) return {};
    return state.teacherOverrides[currentStudent.id]?.[currentQuestion.id] ?? {};
  }, [state.teacherOverrides, currentStudent, currentQuestion]);

  const handleUpdateOverride = (field, value) => {
    dispatch({ type: 'UPDATE_OVERRIDE', payload: { studentId: currentStudent.id, questionId: currentQuestion.id, field, value }});
  };

  const handleApproveAndNext = async () => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      // For V1, we will patch on every "next" click. V2 might have a single "Save All" button.
      await assessmentService.saveOverrides(job_id, currentStudent.id, state.teacherOverrides[currentStudent.id] || {});
      showSnackbar(`Grades for ${currentStudent.name} approved!`, 'success');
      
      if (state.currentStudentIndex === state.jobData.students.length - 1) {
        showSnackbar('All students have been reviewed!', 'info');
        navigate(`/assessments/${job_id}/results`);
      } else {
        dispatch({ type: 'CHANGE_STUDENT', payload: 1 });
      }
    } catch (err) {
      showSnackbar(err.message, 'error');
    } finally {
      dispatch({ type: 'SUBMIT_FINISH' });
    }
  };

  if (state.isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }
  if (state.error) {
    return <Box sx={{ p: 4 }}><Alert severity="error"><AlertTitle>Error</AlertTitle>{state.error}</Alert></Box>;
  }
  if (!state.jobData || !currentStudent || !currentQuestion) {
    return <Box sx={{ p: 4 }}><Alert severity="info">No data available for this grading session.</Alert></Box>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <AppBar position="sticky" color="default" sx={{ boxShadow: 'none', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <IconButton onClick={() => dispatch({ type: 'CHANGE_STUDENT', payload: -1 })} disabled={state.currentStudentIndex === 0 || state.isSubmitting}><ChevronLeft /></IconButton>
          <Typography sx={{ textAlign: 'center', minWidth: '250px' }}>
            Student {state.currentStudentIndex + 1} of {state.jobData.students.length}: <strong>{currentStudent.name}</strong>
          </Typography>
          <IconButton onClick={() => dispatch({ type: 'CHANGE_STUDENT', payload: 1 })} disabled={state.currentStudentIndex >= state.jobData.students.length - 1 || state.isSubmitting}><ChevronRight /></IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" onClick={handleApproveAndNext} disabled={state.isSubmitting}>
            {state.isSubmitting ? <CircularProgress size={24} /> : 'Approve & Next'}
          </Button>
        </Toolbar>
      </AppBar>

      <Grid container spacing={2} sx={{ flexGrow: 1, p: 2, overflow: 'hidden' }}>
        <Grid item xs={12} md={3} sx={{ height: '100%' }}>
          <RubricPanel question={currentQuestion} rubric={state.jobData.rubric} />
        </Grid>
        <Grid item xs={12} md={5} sx={{ height: '100%' }}>
          <AnswerSheetViewer fileUrl={currentStudent.answerSheetUrl} studentName={currentStudent.name} />
        </Grid>
        <Grid item xs={12} md={4} sx={{ height: '100%' }}>
          <AIGradingPanel
            suggestedGrade={aiResultForCurrent.grade}
            suggestedFeedback={aiResultForCurrent.feedback}
            overrideGrade={overrideForCurrent.grade}
            overrideFeedback={overrideForCurrent.feedback}
            onGradeChange={(val) => handleUpdateOverride('grade', val)}
            onFeedbackChange={(val) => handleUpdateOverride('feedback', val)}
            maxScore={JSON.parse(state.jobData.config || '{}').maxScore}
            disabled={state.isSubmitting}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default GradingWorkflow;