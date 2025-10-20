// /src/pages/assessments/NewAssessmentV2.jsx (FINAL, DUAL-UPLOAD VERSION)

import React, { useState, useReducer, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Stepper, Step, StepLabel, Button, Typography, Paper, Alert, CircularProgress, Grid } from '@mui/material';

// Import our full suite of components
import DocumentUploader from '../../components/assessments/uploader/DocumentUploader';
import StructureReviewer from '../../components/assessments/uploader/StructureReviewer';
import GradingModeSelector from '../../components/assessments/uploader/GradingModeSelector';
import ScoringConfigurator from '../../components/assessments/uploader/ScoringConfigurator';
import Step1Setup from '../../components/assessments/wizard/Step1Setup';
import Step3Upload from '../../components/assessments/wizard/Step3Upload';
import WizardStep from '../../components/assessments/WizardStep';

import assessmentService from '../../services/assessmentService';
import classService from '../../services/classService';
import { useSnackbar } from '../../hooks/useSnackbar';
import { wizardReducer, initialState } from './NewAssessment.state';

const steps = ['Setup', 'Define Assessment', 'Upload Answers', 'Submit'];

const stepDescriptions = [
  'Define the name of this assessment and select the class it belongs to.',
  'Upload the question paper and the answer key for the AI to analyze.',
  'Upload all student answer sheets for the AI to grade.',
  'Review your configuration and begin the grading process.'
];

const NewAssessment = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const [activeStep, setActiveStep] = useState(0);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load class list on mount (unchanged)
  useEffect(() => {
    classService.getAllClasses()
      .then(setClasses)
      .catch(err => showSnackbar(err.message || 'Failed to load class list.', 'error'))
      .finally(() => setIsLoading(false));
  }, [showSnackbar]);

  // NEW Handler for structuring documents
  const handleStructure = useCallback(async () => {
    if (!state.questionFile || !state.answerKeyFile) {
      showSnackbar('Please upload both the Question Document and the Answer Key.', 'error');
      return;
    }
    dispatch({ type: 'START_PARSING' });
    try {
      const parsedConfig = await assessmentService.parseDocument(
        state.questionFile,
        state.answerKeyFile,
        state.classId,
        state.assessmentName,
        state.scoringMethod
      );
      dispatch({ type: 'PARSE_SUCCESS', payload: parsedConfig });
      showSnackbar('Document(s) analyzed successfully!', 'success');
    } catch (error) {
      dispatch({ type: 'PARSE_FAILURE', payload: error.message || 'Failed to parse document.' });
    }
  }, [state.questionFile, state.answerKeyFile, state.classId, state.assessmentName, showSnackbar]);

  // handleSubmit is now simpler, as the config is already in state (unchanged)
  const handleSubmit = async () => {
    dispatch({ type: 'START_SUBMITTING' });
    try {
      const formData = new FormData();
      formData.append('config', JSON.stringify(state.config));
      state.answerSheetFiles.forEach(file => formData.append('answer_sheets', file));

      await assessmentService.createAssessmentJob(formData);
      showSnackbar('Assessment job created! Grading has begun.', 'success');
      navigate('/assessments');
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred.';
      dispatch({ type: 'SUBMIT_FAILURE', payload: errorMessage });
      showSnackbar(errorMessage, 'error');
    }
  };

  const isStepValid = useCallback(() => {
    switch (activeStep) {
      case 0:
        return !!state.assessmentName.trim() && !!state.classId;
      case 1:
        // Rubric is optional, so only check that text exists and maxScore is valid
        return !!state.config && state.config.sections.every(s => s.questions.every(q => q.text.trim() && q.maxScore != null && q.maxScore >= 0));
      case 2:
        return state.answerSheetFiles.length > 0;
      case 3:
        return true;
      default:
        return true;
    }
  }, [activeStep, state]);

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const getStepContent = (step) => {
    const isProcessing = state.status === 'parsing' || state.status === 'submitting';
    switch (step) {
      case 0:
        return <Step1Setup state={state} handleUpdateField={(field, value) => dispatch({ type: 'UPDATE_FIELD', payload: { field, value } })} classes={classes} disabled={isProcessing} />;
      case 1:
        return (
          <Box>
            <ScoringConfigurator
              scoringMethod={state.scoringMethod}
              dispatch={dispatch}
              disabled={isProcessing}
            />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <DocumentUploader
                  title="Question Document"
                  onFileSelect={(file) => dispatch({ type: 'SET_QUESTION_FILE', payload: file })}
                  selectedFile={state.questionFile}
                  disabled={isProcessing}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DocumentUploader
                  title="Answer Key"
                  onFileSelect={(file) => dispatch({ type: 'SET_ANSWER_KEY_FILE', payload: file })}
                  selectedFile={state.answerKeyFile}
                  disabled={isProcessing}
                />
              </Grid>
            </Grid>

            <Button variant="contained" onClick={handleStructure} disabled={!state.questionFile || !state.answerKeyFile || isProcessing} sx={{ mt: 2 }}>
              {isProcessing ? <CircularProgress size={24} /> : 'Analyze Document(s)'}
            </Button>

            {state.error && <Alert severity="error" sx={{ mt: 2 }}>{state.error}</Alert>}

            {state.config && (
              <Box mt={4}>
                <Typography variant="h6" gutterBottom>Review & Configure</Typography>
                <StructureReviewer config={state.config} dispatch={dispatch} disabled={isProcessing} />
                <GradingModeSelector config={state.config} dispatch={dispatch} disabled={isProcessing} />
              </Box>
            )}
          </Box>
        );
      case 2:
        return <Step3Upload state={state} dispatch={dispatch} disabled={isProcessing} />;
      case 3:
        // A simple review step for the end
        return <Typography>Review your settings and click 'Start Grading' to begin.</Typography>;
      default:
        return 'Unknown step';
    }
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, mx: 'auto', maxWidth: '900px' }}>
      <Typography variant="h2" sx={{ mb: 4 }}>New Assessment</Typography>
      {state.error && <Alert severity="error" sx={{ mb: 2 }}>{state.error}</Alert>}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      <WizardStep title={steps[activeStep]} description={stepDescriptions[activeStep]}>
        {getStepContent(activeStep)}
      </WizardStep>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <Button disabled={activeStep === 0 || state.status === 'parsing' || state.status === 'submitting'} onClick={handleBack} sx={{ mr: 1 }}>Back</Button>
        <Button variant="contained" onClick={handleNext} disabled={!isStepValid() || state.status === 'parsing' || state.status === 'submitting'}>
          {activeStep === steps.length - 1 ? 'Start Grading' : 'Next'}
        </Button>
      </Box>
    </Paper>
  );
};

export default NewAssessment;