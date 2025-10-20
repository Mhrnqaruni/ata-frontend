// /src/pages/assessments/NewAssessmentV2.jsx (FINAL, DUAL-UPLOAD VERSION)

import React, { useState, useReducer, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Stepper, Step, StepLabel, Button, Typography, Paper, Alert, CircularProgress, Grid, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, TextField, Stack, useMediaQuery, useTheme } from '@mui/material';

// Import our full suite of components
import DocumentUploader from '../../components/assessments/uploader/DocumentUploader';
import StructureReviewer from '../../components/assessments/uploader/StructureReviewer';
import GradingModeSelector from '../../components/assessments/uploader/GradingModeSelector';
import Step1Setup from '../../components/assessments/wizard/Step1Setup';
import Step3Upload from '../../components/assessments/wizard/Step3Upload';
import ManualUploader from '../../components/assessments/uploader/ManualUploader';
import WizardStep from '../../components/assessments/WizardStep';

import assessmentService from '../../services/assessmentService';
import classService from '../../services/classService';
import { useSnackbar } from '../../hooks/useSnackbar';
import { wizardReducerV2, initialStateV2 } from './NewAssessmentV2.state';

const steps = ['Setup', 'Define Assessment', 'Upload Answers', 'Submit'];

const stepDescriptions = [
  'Define the name of this assessment and select the class it belongs to.',
  'Upload the question paper and an optional answer key for the AI to analyze.',
  'Upload all student answer sheets for the AI to grade.',
  'Review your configuration and begin the grading process.'
];

const NewAssessmentV2 = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [state, dispatch] = useReducer(wizardReducerV2, initialStateV2);
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

  // Count pages when question and answer key files are selected
  useEffect(() => {
    const countPages = async () => {
      if (state.questionFile && state.answerKeyFile) {
        try {
          const files = [state.questionFile, state.answerKeyFile];
          const result = await assessmentService.countPages(files);
          dispatch({ type: 'SET_ESTIMATED_TIME', payload: result.estimated_seconds });
        } catch (error) {
          console.error('Failed to count pages:', error);
          // Set a default estimate if page counting fails
          dispatch({ type: 'SET_ESTIMATED_TIME', payload: 30 });
        }
      }
    };
    countPages();
  }, [state.questionFile, state.answerKeyFile]);

  // Countdown timer effect during parsing
  useEffect(() => {
    if (state.status === 'parsing' && state.countdownSeconds > 0) {
      const timer = setInterval(() => {
        dispatch({ type: 'UPDATE_COUNTDOWN', payload: state.countdownSeconds - 1 });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [state.status, state.countdownSeconds]);

  // NEW Handler for structuring documents
  const handleStructure = useCallback(async () => {
    if (!state.questionFile || !state.answerKeyFile) {
      showSnackbar('Please upload both the question paper and the answer key.', 'error');
      return;
    }
    dispatch({ type: 'START_PARSING' });
    try {
      // Step 1: Always parse the documents first to get the structure.
      let parsedConfig = await assessmentService.parseDocument(
        state.questionFile,
        state.answerKeyFile,
        state.classId,
        state.assessmentName
      );

      // Step 2: If AI marking is selected, make a second call to distribute scores.
      if (state.markingStrategy === 'ai') {
        showSnackbar('Documents analyzed. Now, asking AI to assign marks...', 'info');
        parsedConfig = await assessmentService.distributeScoresWithAI(parsedConfig, state.totalMarks);
      }

      dispatch({ type: 'PARSE_SUCCESS', payload: parsedConfig });
      showSnackbar('Assessment structure is ready for review!', 'success');
    } catch (error) {
      dispatch({ type: 'PARSE_FAILURE', payload: error.message || 'Failed to process documents.' });
    }
  }, [state.questionFile, state.answerKeyFile, state.classId, state.assessmentName, state.markingStrategy, state.totalMarks, showSnackbar]);

  // handleSubmit is now simpler, as the config is already in state (unchanged)
  const handleSubmit = async () => {
    dispatch({ type: 'START_SUBMITTING' });

    try {
      // The service call is now chosen based on the upload mode.
      if (state.uploadMode === 'manual') {
        await assessmentService.createAssessmentJobWithManualUploads({
          config: state.config,
          manualStudentFiles: state.manualStudentFiles,
          outsiders: state.outsiders,
        });
      } else {
        const formData = new FormData();
        formData.append('config', JSON.stringify(state.config));
        state.answerSheetFiles.forEach(file => formData.append('answer_sheets', file));
        await assessmentService.createAssessmentJobV2(formData);
      }
      
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
        // Rubric is optional, so only check that text exists and maxScore > 0
        return !!state.config && state.config.sections.every(s => s.questions.every(q => q.text.trim() && q.maxScore > 0));
      case 2:
        if (state.uploadMode === 'batch') {
          return state.answerSheetFiles.length > 0;
        }
        if (state.uploadMode === 'manual') {
          // Valid if at least one student/outsider has at least one file staged.
          return Object.values(state.manualStudentFiles).some(fileList => fileList.length > 0);
        }
        return false; // Should not happen
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

            <FormControl component="fieldset" sx={{ mt: 3 }}>
              <FormLabel component="legend">Marking Strategy</FormLabel>
              <RadioGroup
                row
                aria-label="marking strategy"
                name="marking-strategy-group"
                value={state.markingStrategy}
                onChange={(e) => dispatch({ type: 'UPDATE_FIELD', payload: { field: 'markingStrategy', value: e.target.value } })}
              >
                <FormControlLabel value="document" control={<Radio />} label="Find marks in document" />
                <FormControlLabel value="ai" control={<Radio />} label="Use AI to assign marks" />
              </RadioGroup>
              {state.markingStrategy === 'ai' && (
                <TextField
                  fullWidth
                  type="number"
                  label="Maximum marks for this exam"
                  value={state.totalMarks}
                  onChange={(e) => dispatch({ type: 'UPDATE_FIELD', payload: { field: 'totalMarks', value: parseInt(e.target.value, 10) || 0 } })}
                  sx={{ mt: 1, ml: 1, maxWidth: '280px' }}
                  variant="outlined"
                  size="small"
                />
              )}
            </FormControl>
            
            <Button variant="contained" onClick={handleStructure} disabled={!state.questionFile || !state.answerKeyFile || isProcessing} sx={{ mt: 2, display: 'block' }}>
              {isProcessing ? (
                <Stack direction="row" spacing={2} alignItems="center">
                  <CircularProgress size={24} color="inherit" />
                  <Typography variant="body2">
                    Analyzing Document... {state.countdownSeconds > 0 ? `(~${Math.floor(state.countdownSeconds / 60)}:${String(state.countdownSeconds % 60).padStart(2, '0')})` : ''}
                  </Typography>
                </Stack>
              ) : (
                'Structure Assessment'
              )}
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
        return (
          <Box>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Upload Method</FormLabel>
              <RadioGroup
                row
                value={state.uploadMode}
                onChange={(e) => dispatch({ type: 'UPDATE_FIELD', payload: { field: 'uploadMode', value: e.target.value } })}
              >
                <FormControlLabel value="batch" control={<Radio />} label="Batch Upload" />
                <FormControlLabel value="manual" control={<Radio />} label="Manual Upload per Student" />
              </RadioGroup>
            </FormControl>

            {state.uploadMode === 'batch' && (
              <Step3Upload state={state} dispatch={dispatch} disabled={isProcessing} />
            )}
            {state.uploadMode === 'manual' && (
              <ManualUploader
                classId={state.classId}
                stagedFiles={state.manualStudentFiles}
                outsiders={state.outsiders}
                onFilesStaged={(payload) => dispatch({ type: 'STAGE_MANUAL_FILES', payload })}
                onAddOutsider={(name) => dispatch({ type: 'ADD_OUTSIDER', payload: name })}
                disabled={isProcessing}
              />
            )}
          </Box>
        );
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
      <Stepper
        activeStep={activeStep}
        sx={{ mb: 4 }}
        orientation={isMobile ? 'vertical' : 'horizontal'}
      >
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

export default NewAssessmentV2;