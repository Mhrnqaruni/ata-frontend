import AudienceSelector from '../../components/tags/AudienceSelector';
// /src/pages/assessments/NewAssessmentV2.jsx (FINAL, DUAL-UPLOAD VERSION)

import React, { useState, useReducer, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import OrderedDocumentUploader from '../../components/assessments/uploader/OrderedDocumentUploader';
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
  'Name the assessment and choose the students using classes or tags.',
  'Add the question-paper files and an optional answer key. AI reads them and lays out every question for you to check.',
  "Add your students' handwritten answer sheets.",
  'Check the details, then start grading. AI marks each answer three times; anything it disagrees on comes to you.'
];

const NewAssessmentV2 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const retryJobId = new URLSearchParams(location.search).get('retryJobId');
  const [retryDraft, setRetryDraft] = useState(null);
  const [retainedIds, setRetainedIds] = useState([]);
  const [retryLoading, setRetryLoading] = useState(Boolean(retryJobId));
  const [retryError, setRetryError] = useState(null);
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

  useEffect(() => {
    if (!retryJobId) return;
    let alive = true;
    setRetryLoading(true);
    assessmentService.getRetryDraft(retryJobId).then(draft => {
      if (!alive) return;
      setRetryDraft(draft); setRetainedIds(draft.files.map(file => file.id));
      dispatch({ type: 'RESTORE_RETRY', payload: draft });
      setActiveStepRaw(3);
    }).catch(error => { if (alive) setRetryError(error.message); })
      .finally(() => { if (alive) setRetryLoading(false); });
    return () => { alive = false; };
  }, [retryJobId]);
  const retainedFiles = (retryDraft?.files || []).filter(file => retainedIds.includes(file.id));
  const missingRetained = retainedFiles.some(file => !file.available);
  const stagedCount = state.uploadMode === 'batch' ? state.answerSheetFiles.length : Object.values(state.manualStudentFiles).flat().length;
  const retryReady = Boolean(retryDraft && !missingRetained && retainedFiles.length + stagedCount > 0 &&
    state.assessmentName.trim() && state.config?.sections.every(section => section.questions.every(q => q.text.trim() && q.maxScore > 0)));

  // Number input hook for total marks
  const docPages = usePageCounts([...state.questionFiles, ...state.answerKeyFiles]);
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

  // NEW Handler for structuring documents
  const handleStructure = useCallback(async () => {
    if (!state.questionFiles.length) {
      showSnackbar('Please add at least one question-paper file.', 'error');
      return;
    }
    if ([...state.questionFiles, ...state.answerKeyFiles].reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) {
      showSnackbar('Question paper and answer key together must be 20 MB or smaller.', 'error');
      return;
    }
    dispatch({ type: 'START_PARSING' });
    try {
      // Step 1: Always parse the documents first to get the structure.
      let parsedConfig = await assessmentService.parseDocument(
        state.questionFiles,
        state.answerKeyFiles,
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
  }, [state.questionFiles, state.answerKeyFiles, state.classId, state.assessmentName, state.markingStrategy, state.totalMarks, showSnackbar]);

  // handleSubmit is now simpler, as the config is already in state (unchanged)
  const handleSubmit = async () => {
    dispatch({ type: 'START_SUBMITTING' });

    try {
      // Retry is an explicit same-ID command, never the new-assessment endpoints.
      if (retryJobId) {
        const form = new FormData();
        form.append('config', JSON.stringify({ ...state.config, assessmentName: state.assessmentName, classId: state.classId }));
        form.append('draft_version', retryDraft.draftVersion);
        form.append('request_id', retryDraft.requestId);
        form.append('upload_mode', state.uploadMode);
        form.append('keep_file_ids', JSON.stringify(retainedIds));
        form.append('outsider_names', JSON.stringify(state.outsiders));
        if (state.uploadMode === 'batch') state.answerSheetFiles.forEach(file => form.append('answer_sheets', file));
        else {
          const outsiders = new Set(state.outsiders.map(item => item.id));
          Object.entries(state.manualStudentFiles).forEach(([id, files]) => files.forEach(file =>
            form.append(`${outsiders.has(id) ? 'outsider' : 'student'}_${id}_files`, file)));
        }
        await assessmentService.startRetry(retryJobId, form);
      } else if (state.uploadMode === 'manual') {
        await assessmentService.createAssessmentJobWithManualUploads({
          config: {...state.config, audience: state.audience},
          manualStudentFiles: state.manualStudentFiles,
          outsiders: state.outsiders,
        });
      } else {
        const formData = new FormData();
        formData.append('config', JSON.stringify({...state.config, audience: state.audience}));
        state.answerSheetFiles.forEach(file => formData.append('answer_sheets', file));
        await assessmentService.createAssessmentJobV2(formData);
      }
      
      showSnackbar(retryJobId ? 'The same assessment has been queued again.' : 'Assessment job created! Grading has begun.', 'success');
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
        return !!state.assessmentName.trim() && (retryJobId ? (!!state.classId || !!retryDraft?.audience) : !!state.audienceStudents?.length);
      case 1:
        // Rubric is optional, so only check that text exists and maxScore > 0
        return !!state.config && state.config.sections.every(s => s.questions.every(q => q.text.trim() && q.maxScore > 0));
      case 2:
        if (retryJobId) return retryReady;
        if (state.uploadMode === 'batch') {
          return state.answerSheetFiles.length > 0;
        }
        if (state.uploadMode === 'manual') {
          // Valid if at least one student/outsider has at least one file staged.
          return Object.values(state.manualStudentFiles).some(fileList => fileList.length > 0);
        }
        return false; // Should not happen
      case 3:
        return retryJobId ? retryReady : true;
      default:
        return true;
    }
  }, [activeStep, state, retryJobId, retryReady]);

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
        return <Box sx={{display:'grid',gap:2}}>
          <TextField label="Assessment name" value={state.assessmentName} onChange={e=>dispatch({type:'UPDATE_FIELD',payload:{field:'assessmentName',value:e.target.value}})} disabled={isProcessing}/>
          {retryJobId ? <Alert severity="info">Retry keeps the original students and audience.</Alert> :
            <AudienceSelector value={state.audience} disabled={isProcessing}
              onChange={spec=>dispatch({type:'UPDATE_FIELD',payload:{field:'audience',value:spec}})}
              onPreview={data=>{dispatch({type:'UPDATE_FIELD',payload:{field:'audienceStudents',value:data?.students||null}});dispatch({type:'UPDATE_FIELD',payload:{field:'classId',value:data?.students?.[0]?.classes?.[0]?.id||''}});}} />}
        </Box>;
      case 1:
        return (
          <Box>
            {retryDraft && <Alert severity="info" sx={{ mb: 2 }}>{retryDraft.message}</Alert>}
            <div className="mst-form-row">
              <OrderedDocumentUploader
                title="Question paper"
                onChange={(files) => dispatch({ type: 'SET_QUESTION_FILES', payload: files })}
                files={state.questionFiles}
                disabled={isProcessing}
                fileMeta={docPages}
              />
              <OrderedDocumentUploader
                title="Answer key (optional)"
                onChange={(files) => dispatch({ type: 'SET_ANSWER_KEY_FILES', payload: files })}
                files={state.answerKeyFiles}
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
              <Button className="mst-ai" variant="contained" onClick={handleStructure} disabled={!state.questionFiles.length || isProcessing} startIcon={isProcessing ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeRounded />}>
                {isProcessing ? 'Reading documents…' : state.config ? 'Read the documents again' : 'Structure assessment'}
              </Button>
              {!state.questionFiles.length && !state.config ? <span className="mst-hint">Add question-paper files to continue.</span> : null}
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
            {retryDraft && <Box sx={{ mb: 2 }}>
              <h3>Saved student answers</h3>
              {retainedFiles.length === 0 && <p>No saved files selected. Add replacement files below.</p>}
              {retainedFiles.map(file => <Alert key={file.id} severity={file.available ? 'info' : 'warning'} sx={{ mb: 1 }}
                action={<Button disabled={isProcessing} onClick={() => setRetainedIds(ids => ids.filter(id => id !== file.id))}>Remove</Button>}>
                {file.name} — {file.available ? 'Saved file ready to reuse' : 'File unavailable here. Remove and upload a replacement.'}
              </Alert>)}
              <p>Adding pages for a saved student appends them. To replace the saved submission, remove it above first.</p>
            </Box>}
            <Box sx={{ mb: 3 }}>
              <ChoiceCards
                disabled={isProcessing}
                legend="How are the sheets arranged?"
                name="upload-mode"
                onChange={(value) => { if (value !== state.uploadMode) setRetainedIds([]); dispatch({ type: 'UPDATE_FIELD', payload: { field: 'uploadMode', value } }); }}
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
                audienceStudents={state.audienceStudents}
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
        const fileCount = retainedFiles.length + (state.uploadMode === 'batch' ? state.answerSheetFiles.length : manualCount);
        const rows = [
          ['Assessment', state.assessmentName],
          ['Audience', state.audienceStudents ? `${state.audienceStudents.length} selected students` : classes.find((c) => c.id === state.classId)?.name || '—'],
          ['Questions', `${questions.length} ${questions.length === 1 ? 'question' : 'questions'} · ${totalMarks} marks`],
          ['Answer sheets', `${fileCount} ${fileCount === 1 ? 'file' : 'files'}${state.uploadMode === 'manual' ? ', added per student' : ''}`],
          ['Marks', state.markingStrategy === 'ai' ? 'Shared out by AI' : 'Read from the paper'],
        ];
        return (
          <Box>
            {retryDraft && <Alert severity={missingRetained ? 'warning' : 'info'} sx={{ mb: 2 }}>
              This restarts the same assessment card. Previous attempt history is kept. Use Back to review or change questions and student files.
              {missingRetained && ' Some saved student files are unavailable. Go Back to remove and replace them before starting.'}
            </Alert>}
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

  if (retryError) return <Alert severity="error">{retryError}<Button onClick={() => navigate('/assessments')}>Back to assessments</Button></Alert>;
  if (isLoading || retryLoading) {
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
        breadcrumbs={[{ label: 'Assessments', to: '/assessments' }, { label: retryJobId ? 'Retry assessment' : 'New assessment' }]}
        title={retryJobId ? "Retry assessment" : "New assessment"}
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
            {isLast ? (state.status === 'submitting' ? 'Starting…' : (retryJobId ? 'Start again' : 'Start grading')) : 'Next'}
          </Button>
      </div>
    </Box>
  );
};

export default NewAssessmentV2;