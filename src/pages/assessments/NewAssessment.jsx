// /src/pages/assessments/NewAssessment.jsx (FULLY REFACTORED AND CORRECTED)

import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Stepper, Step, StepLabel, Button, Typography, Paper, CircularProgress,
  Stack, TextField, List, ListItem, ListItemText, IconButton, Fab, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import WizardStep from '../../components/assessments/WizardStep';
import Step1Setup from '../../components/assessments/wizard/Step1Setup';
// Step2Questions is now defined inside this file
import Step3Upload from '../../components/assessments/wizard/Step3Upload';
import Step4Review from '../../components/assessments/wizard/Step4Review';

import assessmentService from '../../services/assessmentService';
import classService from '../../services/classService';
import { useSnackbar } from '../../hooks/useSnackbar';

const steps = ['Setup', 'Questions & Rubric', 'Upload Answer Sheets', 'Review & Submit'];
const stepDescriptions = [
  'Define the name of this assessment and select the class it belongs to.',
  'Add one or more questions, each with its own specific grading rubric and max score.',
  'Upload all student answer sheets. You can upload multiple files at once.',
  'Please review all the details below before starting the grading job.'
];

// --- [THE CORE REFACTOR: NEW STATE STRUCTURE] ---
const initialQuestion = () => ({
  id: `q_${Math.random().toString(36).substr(2, 9)}`,
  text: '',
  rubric: '',
  maxScore: 10,
});

const initialState = {
  assessmentName: '',
  classId: '',
  questions: [initialQuestion()], // Start with one empty question
  answerSheetFiles: [],
  includeImprovementTips: false,
};

function wizardReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'SET_STATE': // Used for cloning
      return { ...state, ...action.payload };
    case 'ADD_QUESTION':
      return { ...state, questions: [...state.questions, initialQuestion()] };
    case 'REMOVE_QUESTION':
      // Prevent removing the last question
      if (state.questions.length <= 1) return state;
      return { ...state, questions: state.questions.filter(q => q.id !== action.payload.id) };
    case 'UPDATE_QUESTION_FIELD':
      return {
        ...state,
        questions: state.questions.map(q =>
          q.id === action.payload.id ? { ...q, [action.payload.field]: action.payload.value } : q
        ),
      };
    case 'ADD_ANSWER_SHEETS':
      const newFiles = action.payload.filter(nf => !state.answerSheetFiles.some(ef => ef.name === nf.name && ef.size === nf.size));
      return { ...state, answerSheetFiles: [...state.answerSheetFiles, ...newFiles] };
    case 'REMOVE_ANSWER_SHEET':
      return { ...state, answerSheetFiles: state.answerSheetFiles.filter(f => f.name !== action.payload) };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

// --- [THE NEW, DYNAMIC STEP 2 COMPONENT] ---
const Step2Questions = ({ state, dispatch, disabled }) => {
  const handleQuestionUpdate = (id, field, value) => {
    dispatch({ type: 'UPDATE_QUESTION_FIELD', payload: { id, field, value } });
  };

  return (
    <Stack spacing={4}>
      <List>
        {state.questions.map((q, index) => (
          <React.Fragment key={q.id}>
            <ListItem
              disablePadding
              secondaryAction={
                state.questions.length > 1 && (
                  <IconButton edge="end" aria-label="delete question" onClick={() => dispatch({ type: 'REMOVE_QUESTION', payload: { id: q.id } })} disabled={disabled}>
                    <DeleteIcon />
                  </IconButton>
                )
              }
            >
              <ListItemText primary={<Typography variant="h6" component="div">{`Question ${index + 1}`}</Typography>} />
            </ListItem>
            <Stack spacing={2} sx={{ pl: 2, pt: 1, pb: 2 }}>
              <TextField
                required
                fullWidth
                multiline
                rows={3}
                label="Question Text"
                value={q.text}
                onChange={(e) => handleQuestionUpdate(q.id, 'text', e.target.value)}
                disabled={disabled}
              />
              <TextField
                required
                fullWidth
                multiline
                rows={5}
                label="Grading Rubric for this Question"
                value={q.rubric}
                onChange={(e) => handleQuestionUpdate(q.id, 'rubric', e.target.value)}
                disabled={disabled}
              />
              <TextField
                required
                type="number"
                label="Max Score"
                value={q.maxScore}
                onChange={(e) => handleQuestionUpdate(q.id, 'maxScore', parseInt(e.target.value, 10) || 0)}
                disabled={disabled}
                sx={{ maxWidth: '150px' }}
                inputProps={{ min: 1 }}
              />
            </Stack>
            {index < state.questions.length - 1 && <Divider sx={{ my: 2 }} />}
          </React.Fragment>
        ))}
      </List>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Fab color="primary" aria-label="add question" onClick={() => dispatch({ type: 'ADD_QUESTION' })} disabled={disabled}>
          <AddIcon />
        </Fab>
      </Box>
    </Stack>
  );
};

// --- [THE MAIN WIZARD ORCHESTRATOR - REFACTORED] ---
const NewAssessment = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();
  const cloneFromJobId = searchParams.get('cloneFromJobId');

  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const classData = await classService.getAllClasses();
        setClasses(classData);
        if (cloneFromJobId) {
          const config = await assessmentService.getAssessmentConfig(cloneFromJobId);
          // Clone feature now works with the new data structure
          dispatch({
            type: 'SET_STATE', payload: {
              assessmentName: `${config.assessmentName} (Copy)`,
              questions: config.questions,
              includeImprovementTips: config.includeImprovementTips,
            }
          });
          showSnackbar('Assessment configuration cloned successfully!', 'success');
        }
      } catch (error) { showSnackbar(error.message || 'Failed to load initial data.', 'error'); } 
      finally { setIsLoading(false); }
    }
    fetchData();
  }, [cloneFromJobId, showSnackbar]);

  const isStepValid = useCallback(() => {
    switch (activeStep) {
      case 0:
        return !!state.assessmentName.trim() && !!state.classId;
      case 1:
        // Validate that every question has non-empty text and rubric
        return state.questions.every(q => q.text.trim() && q.rubric.trim() && q.maxScore > 0);
      case 2:
        return state.answerSheetFiles.length > 0;
      default:
        return true;
    }
  }, [activeStep, state]);

  const handleSubmit = async () => {
    if (!isStepValid()) {
      showSnackbar('Please complete all required fields before proceeding.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      // --- CORE LOGIC FIX: Construct the config object to match the new backend model ---
      const config = {
        assessmentName: state.assessmentName,
        classId: state.classId,
        questions: state.questions,
        includeImprovementTips: state.includeImprovementTips,
      };
      
      formData.append('config', JSON.stringify(config));
      state.answerSheetFiles.forEach(file => formData.append('answer_sheets', file));
      
      await assessmentService.createAssessmentJob(formData);
      showSnackbar('Assessment job created! Grading has begun.', 'success');
      navigate('/assessments');
    } catch (error) {
      showSnackbar(error.message || 'An unexpected error occurred.', 'error');
      setIsSubmitting(false);
    }
  };
  
  const handleUpdateField = useCallback((field, value) => {
    dispatch({ type: 'UPDATE_FIELD', payload: { field, value } });
  }, []);

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);
  
  const getStepContent = (step) => {
    switch (step) {
      case 0: return <Step1Setup state={state} handleUpdateField={handleUpdateField} classes={classes} disabled={isSubmitting} />;
      case 1: return <Step2Questions state={state} dispatch={dispatch} disabled={isSubmitting} />;
      case 2: return <Step3Upload state={state} dispatch={dispatch} disabled={isSubmitting} />;
      case 3: return <Step4Review state={state} classes={classes} />;
      default: return 'Unknown step';
    }
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, mx: 'auto', maxWidth: '900px' }}>
      <Typography variant="h2" sx={{ mb: 4 }}>New Assessment</Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      <WizardStep title={steps[activeStep]} description={stepDescriptions[activeStep]}>
        {getStepContent(activeStep)}
      </WizardStep>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <Button disabled={activeStep === 0 || isSubmitting} onClick={handleBack} sx={{ mr: 1 }}>Back</Button>
        <Button variant="contained" onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext} disabled={!isStepValid() || isSubmitting} startIcon={isSubmitting && activeStep === steps.length - 1 ? <CircularProgress size={20} color="inherit" /> : null}>
          {activeStep === steps.length - 1 ? 'Start Grading' : 'Next'}
        </Button>
      </Box>
    </Paper>
  );
};

export default NewAssessment;