// /src/pages/assessments/NewAssessmentV2.jsx (FINAL, DUAL-UPLOAD VERSION)

import React, { useState, useReducer, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Stepper, Step, StepLabel, Button, Paper, Alert, CircularProgress, TextField, Skeleton, useMediaQuery, useTheme } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import CalculateOutlined from '@mui/icons-material/CalculateOutlined';
import FolderZipOutlined from '@mui/icons-material/FolderZipOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import PageHeader from '../../components/common/PageHeader';
import ChoiceCards from '../../components/common/ChoiceCards';
import usePageCounts from '../../hooks/usePageCounts';

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
import useNumberInput from '../../hooks/useNumberInput';
import { wizardReducerV2, initialStateV2 } from './NewAssessmentV2.state';

const steps = ['Set up', 'Define', 'Upload answers', 'Review & start'];

const stepDescriptions = [
  'Name the assessment and choose the class that sat it.',
  'Add the question paper and its answer key. AI reads them and lays out every question for you to check.',
  "Add your students' handwritten answer sheets.",
  'Check the details, then start grading. AI marks each answer three times; anything it disagrees on comes to you.'
];
const formatCountdown = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const NewAssessmentV2 = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [state, dispatch] = useReducer(wizardReducerV2, initialStateV2);
  const [activeStep, setActiveStepRaw] = useState(0);
  const [stepDir, setStepDir] = useState('fwd');
  const setActiveStep = (next) => {
    setActiveStepRaw((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      setStepDir(value >= prev ? 'fwd' : 'back');
      return value;
    });
  };
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Number input hook for total marks
  const docPages = usePageCounts([state.questionFile, state.answerKeyFile].filter(Boolean));
  const totalMarksInputProps = useNumberInput(
    state.totalMarks,
    (value) => dispatch({ type: 'UPDATE_FIELD', payload: { field: 'totalMarks', value } }),
    {
      defaultValue: 0,
      min: 0,
      max: 1000
    }
  );

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
        const extractionReview = parsedConfig.extractionReview;
        parsedConfig = await assessmentService.distributeScoresWithAI(parsedConfig, state.totalMarks);
        if (extractionReview) parsedConfig = { ...parsedConfig, extractionReview };
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
            <div className="mst-form-row">
              <DocumentUploader
                title="Question paper"
                onFileSelect={(file) => dispatch({ type: 'SET_QUESTION_FILE', payload: file })}
                selectedFile={state.questionFile}
                disabled={isProcessing}
                fileMeta={docPages}
              />
              <DocumentUploader
                title="Answer key"
                onFileSelect={(file) => dispatch({ type: 'SET_ANSWER_KEY_FILE', payload: file })}
                selectedFile={state.answerKeyFile}
                disabled={isProcessing}
                fileMeta={docPages}
              />
            </div>
            <Box sx={{ mt: 3 }}>
              <ChoiceCards
                disabled={isProcessing}
                legend="Marks for each question"
                name="marking-strategy"
                onChange={(value) => dispatch({ type: 'UPDATE_FIELD', payload: { field: 'markingStrategy', value } })}
                options={[
                  { value: 'document', label: 'Read them from the paper', description: 'Use the marks printed in the documents.', icon: <DescriptionOutlined /> },
                  { value: 'ai', label: 'Let AI share out the marks', description: 'Give the total; AI assigns marks per question.', icon: <CalculateOutlined />, ai: true },
                ]}
                value={state.markingStrategy}
              />
              {state.markingStrategy === 'ai' && (
                <TextField
                  type="number"
                  label="Total marks for this exam"
                  {...totalMarksInputProps}
                  sx={{ mt: 2, width: 240, maxWidth: '100%' }}
                />
              )}
            </Box>
            <div className="mst-structure-row">
              <Button className="mst-ai" variant="contained" onClick={handleStructure} disabled={!state.questionFile || !state.answerKeyFile || isProcessing} startIcon={isProcessing ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeRounded />}>
                {isProcessing ? 'Reading documents…' : state.config ? 'Read the documents again' : 'Structure assessment'}
              </Button>
              {!state.questionFile || !state.answerKeyFile ? <span className="mst-hint">Add both documents to continue.</span> : null}
            </div>
            {state.status === 'parsing' ? (
              <div className="mst-ai-progress" role="status">
                <div className="mst-ai-bar" />
                <span>Reading your documents. Any handwriting is checked with three independent readings.</span>
              </div>
            ) : null}
            {state.error && <Alert severity="error" sx={{ mt: 2 }}>{state.error}</Alert>}
            {state.config && (
              <Box className="mst-reviewer" mt={4}>
                <h3 className="mst-subhead">Check the questions</h3>
                <StructureReviewer config={state.config} dispatch={dispatch} disabled={isProcessing} />
                <GradingModeSelector config={state.config} dispatch={dispatch} disabled={isProcessing} />
              </Box>
            )}
          </Box>
        );
      case 2:
        return (
          <Box>
            <Box sx={{ mb: 3 }}>
              <ChoiceCards
                disabled={isProcessing}
                legend="How are the sheets arranged?"
                name="upload-mode"
                onChange={(value) => dispatch({ type: 'UPDATE_FIELD', payload: { field: 'uploadMode', value } })}
                options={[
                  { value: 'batch', label: 'All together', description: 'One or more files with every student inside.', icon: <FolderZipOutlined /> },
                  { value: 'manual', label: 'One student at a time', description: "Add each student's pages next to their name.", icon: <PersonOutlined /> },
                ]}
                value={state.uploadMode}
              />
            </Box>
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
      case 3: {
        const questions = (state.config?.sections || []).flatMap((section) => section.questions || []);
        const totalMarks = questions.reduce((sum, q) => sum + (Number(q.maxScore) || 0), 0);
        const manualCount = Object.values(state.manualStudentFiles).reduce((sum, list) => sum + list.length, 0);
        const fileCount = state.uploadMode === 'batch' ? state.answerSheetFiles.length : manualCount;
        const rows = [
          ['Assessment', state.assessmentName],
          ['Class', classes.find((c) => c.id === state.classId)?.name || '—'],
          ['Questions', `${questions.length} ${questions.length === 1 ? 'question' : 'questions'} · ${totalMarks} marks`],
          ['Answer sheets', `${fileCount} ${fileCount === 1 ? 'file' : 'files'}${state.uploadMode === 'manual' ? ', added per student' : ''}`],
          ['Marks', state.markingStrategy === 'ai' ? 'Shared out by AI' : 'Read from the paper'],
        ];
        return (
          <Box>
            <dl className="mst-summary">
              {rows.map(([k, v]) => (
                <div className="mst-summary-row" key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {state.status === 'submitting' ? (
              <div className="mst-ai-progress" role="status">
                <div className="mst-ai-bar" />
                <span>Uploading answer sheets and starting the grading…</span>
              </div>
            ) : null}
          </Box>
        );
      }
      default:
        return 'Unknown step';
    }
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton height={64} sx={{ mb: 3.5, maxWidth: 360 }} variant="rounded" />
        <Skeleton height={460} sx={{ maxWidth: 960, mx: 'auto' }} variant="rectangular" />
      </Box>
    );
  }

  const busy = state.status === 'parsing' || state.status === 'submitting';
  const isLast = activeStep === steps.length - 1;

  return (
    <Box>
      <PageHeader
        breadcrumbs={[{ label: 'Assessments', to: '/assessments' }, { label: 'New assessment' }]}
        title="New assessment"
      />
      <Paper className="mst-rim mst-wizard" data-enter="">
        {isMobile ? (
          <div className="mst-stepper-compact" aria-live="polite">
            <span>Step {activeStep + 1} of {steps.length} · {steps[activeStep]}</span>
            <span aria-hidden="true" className="mst-stepper-bars">
              {steps.map((label, i) => <span data-done={i <= activeStep ? 'true' : undefined} key={label} />)}
            </span>
          </div>
        ) : (
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        )}
        {state.error && activeStep !== 1 && <Alert severity="error" sx={{ mb: 2 }}>{state.error}</Alert>}
        <div className="mst-step mst-wizard-body" data-dir={stepDir} key={activeStep}>
          <WizardStep title={steps[activeStep]} description={stepDescriptions[activeStep]}>
            {getStepContent(activeStep)}
          </WizardStep>
        </div>
      </Paper>
      <div className="mst-builder-foot mst-wizard-bar">
          <Button disabled={activeStep === 0 || busy} onClick={handleBack} variant="text">Back</Button>
          <Button
            className={isLast ? 'mst-ai' : undefined}
            disabled={!isStepValid() || busy}
            onClick={handleNext}
            size="large"
            startIcon={isLast ? (state.status === 'submitting' ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeRounded />) : undefined}
            variant="contained"
          >
            {isLast ? (state.status === 'submitting' ? 'Starting…' : 'Start grading') : 'Next'}
          </Button>
      </div>
    </Box>
  );
};

export default NewAssessmentV2;