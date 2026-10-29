import analysisService from '../../services/analysisService';
import tagService from '../../services/tagService';
import ElapsedTime from '../../components/common/ElapsedTime';
import AudienceSelector from '../../components/tags/AudienceSelector';
// /src/pages/assessments/NewAssessmentV2.jsx (FINAL, DUAL-UPLOAD VERSION)

import React, { useState, useReducer, useCallback, useEffect, useRef } from 'react';
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
  const analysisId = new URLSearchParams(location.search).get('analysisId');
  const [analysis,setAnalysis]=useState(null);
  const [analysisError,setAnalysisError]=useState('');
  const [uploadingAnalysis,setUploadingAnalysis]=useState(false);
  const restoredAnalysis=useRef(null), appliedAnalysis=useRef(null), analysisPosting=useRef(false);
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

  // A refresh follows this same saved operation; it never posts another AI job.
  useEffect(() => {
    if (!analysisId || (retryJobId && retryLoading)) return;
    let stopped=false, busy=false, done=false, timer, missing=0;
    setActiveStepRaw(1);
    dispatch({type:'START_PARSING'});
    const poll=async()=>{
      if(stopped || busy || done)return;
      busy=true;
      try {
        const data=await analysisService.get(analysisId);
        if(stopped)return;
        setAnalysis(data);setAnalysisError('');missing=0;
        if(restoredAnalysis.current!==analysisId){
          restoredAnalysis.current=analysisId;
          const {retryJobId: ignoredRetry,...draft}=data.draft;
          // Reload the already accepted bytes; no new analysis is submitted here.
          const sources = data.sources || [];
          const files = await Promise.all(sources.map(item=>analysisService.source(analysisId,item)));
          if(stopped)return;
          dispatch({type:'RESTORE_ANALYSIS',payload:{...draft,
            questionFiles:files.filter((_,i)=>sources[i].role==='question'),
            answerKeyFiles:files.filter((_,i)=>sources[i].role==='key')}});
          if(!retryJobId && draft.audience){
            tagService.preview(draft.audience).then(preview=>{
              if(!stopped)dispatch({type:'UPDATE_FIELD',payload:{field:'audienceStudents',value:preview.students}});
            }).catch(()=>{if(!stopped)setAnalysisError('The audience changed. Review your class/tag selection before starting grading.');});
          }
        }
        if(data.status==='completed'){
          done=true;
          if(appliedAnalysis.current!==analysisId){appliedAnalysis.current=analysisId;dispatch({type:'PARSE_SUCCESS',payload:data.result});}
        }else if(['failed','interrupted'].includes(data.status)){
          done=true;dispatch({type:'PARSE_FAILURE',payload:data.error||data.message});
        }
      }catch(error){
        if(stopped)return;
        if(error.response?.status===404 && !analysisPosting.current && ++missing>=6){
          done=true;dispatch({type:'PARSE_FAILURE',payload:'No accepted analysis was found. Please upload the documents again.'});
        }else if([401,403].includes(error.response?.status)){
          done=true;dispatch({type:'PARSE_FAILURE',payload:'This analysis is no longer available to this account.'});
        }else if(!analysisPosting.current)setAnalysisError('Reconnecting. Showing the last confirmed analysis status.');
      }finally{
        busy=false;
        if(!stopped && !done && !document.hidden)timer=setTimeout(poll,5000);
      }
    };
    const visible=()=>{clearTimeout(timer);if(!document.hidden)poll();};
    poll();document.addEventListener('visibilitychange',visible);
    return ()=>{stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);};
  },[analysisId,retryJobId,retryLoading]);

  const handleStructure = useCallback(async () => {
    if(analysisPosting.current || !state.questionFiles.length)return;
    if([...state.questionFiles,...state.answerKeyFiles].reduce((sum,file)=>sum+file.size,0)>20*1024*1024){
      showSnackbar('Question paper and answer key together must be 20 MB or smaller.','error');return;
    }
    if(state.markingStrategy === 'ai' && (String(totalMarksInputProps.value).trim()==='' || !Number.isInteger(Number(totalMarksInputProps.value)) || Number(totalMarksInputProps.value)<=0)){
      showSnackbar('Enter a positive whole-number total before reading the documents.','error'); return;
    }
    analysisPosting.current=true;
    try { if(state.answerKeyFiles.length){
      const digest=async file=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).join(',');
      const hashes=await Promise.all(state.questionFiles.map(digest));
      const keys=await Promise.all(state.answerKeyFiles.map(digest));
      if(keys.some(hash=>hashes.includes(hash)))showSnackbar('The same document is in both groups. Both selections are kept; make sure it contains the questions and answers.','warning');
    }} catch { analysisPosting.current=false;showSnackbar('The selected file could not be read. Please select it again.','error');return; }
    analysisPosting.current=true;setUploadingAnalysis(true);setAnalysis(null);setAnalysisError('');
    dispatch({type:'START_PARSING'});
    const id=crypto.randomUUID();
    const params=new URLSearchParams(location.search);params.set('analysisId',id);
    navigate({pathname:location.pathname,search:params.toString()},{replace:true});
    try{
      await analysisService.start(id,{assessmentName:state.assessmentName,classId:state.classId,
        markingStrategy:state.markingStrategy,totalMarks:state.totalMarks,audience:state.audience,retryJobId},
        state.questionFiles,state.answerKeyFiles);
    }catch(error){
      if(error.response && error.response.status >= 400 && error.response.status < 500){
        params.delete('analysisId');navigate({pathname:location.pathname,search:params.toString()},{replace:true});
        dispatch({type:'PARSE_FAILURE',payload:typeof error.response.data?.detail === 'string' ? error.response.data.detail : 'Documents were not accepted. Check the files and try again.'});
      }else setAnalysisError('Upload confirmation was interrupted. Checking whether your analysis was accepted.');
    }finally{analysisPosting.current=false;setUploadingAnalysis(false);}
  },[state.questionFiles,state.answerKeyFiles,state.classId,state.assessmentName,state.markingStrategy,state.totalMarks,totalMarksInputProps.value,state.audience,retryJobId,location.pathname,location.search,navigate,showSnackbar]);

  // handleSubmit is now simpler, as the config is already in state (unchanged)
  const handleSubmit = async () => {
    const questions=state.config?.sections.flatMap(section=>section.questions)||[];
    if(state.config?.gradingMode==='library' || (state.config?.gradingMode!=='ai_auto_grade' && questions.some(q=>!String(q.answer||'').trim()&&!String(q.rubric||'').trim()))){
      showSnackbar('Enter an expected answer or marking scheme for each question, or explicitly choose AI-generated judgement.','error');return;
    }
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

  // Shared by the step content and the outer wizard description.
  const isProcessing = state.status === 'parsing' || state.status === 'submitting';
  const getStepContent = (step) => {
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
            {state.config && !isProcessing && <Alert severity="info" sx={{mb:2}}>
              {analysisId && !state.questionFiles.length ? 'Analysis restored' : 'Questions ready'} · {state.config.sections.reduce((count,section)=>count+section.questions.length,0)} questions.
              {analysis?.status==='completed' && <Box><ElapsedTime clock={analysis.clock}/></Box>}
              <Box>Your extracted questions are saved. Unsaved edits are not automatically saved. Replace source files only if you want to analyse new documents.</Box>
            </Alert>}
            <Box component={state.config && !isProcessing ? 'details' : 'div'} className="mst-replace-sources">
              {state.config && !isProcessing && <summary>Replace source files</summary>}
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
                  { value: 'ai', label: 'Let AI share out the marks', description: 'Give the total; AI assigns marks per question.', icon: <CalculateOutlined />, ai: true, content: <TextField type="number" label="Total marks for this exam" {...totalMarksInputProps} disabled={isProcessing} sx={{mt:1,width:220,maxWidth:'100%'}} /> },
                ]}
                value={state.markingStrategy}
              />
            </Box>
            <div className="mst-structure-row">
              <Button className="mst-ai" variant="contained" onClick={handleStructure} disabled={!state.questionFiles.length || isProcessing} startIcon={isProcessing ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeRounded />}>
                {isProcessing ? 'Reading documents…' : state.config ? 'Read the documents again' : 'Structure assessment'}
              </Button>
              {!state.questionFiles.length && !state.config ? <span className="mst-hint">Add question-paper files to continue.</span> : null}
            </div>
            </Box>
            {analysis?.result?.allocationWarning && <Alert severity="warning">{analysis.result.allocationWarning} Check and set each question’s marks before starting grading.</Alert>}
            {state.status === 'parsing' ? (
              <div className="mst-ai-progress" role="status">
                <div className="mst-ai-bar" />
                <span>{uploadingAnalysis ? 'Uploading documents…' : analysis?.message || 'Checking saved analysis status…'}</span>
                <ElapsedTime clock={analysis?.clock}/>
                {analysis?.completed_reads>0 && <span>{analysis.completed_reads} independent {analysis.completed_reads===1?'reading':'readings'} completed.</span>}
                {analysis?.status==='running' && analysis.heartbeat_at && Date.parse(analysis.clock.server_now)-Date.parse(analysis.heartbeat_at)>30000 && <Alert severity="warning">No recent worker update. Showing the last confirmed stage.</Alert>}
              </div>
            ) : null}
            {analysisError && <Alert severity="warning" sx={{mt:2}}>{analysisError}</Alert>}
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
          <WizardStep title={steps[activeStep]} description={activeStep === 1 && state.config && !isProcessing ? "Review your saved questions, answers and marks before continuing." : stepDescriptions[activeStep]}>
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
            {isLast ? (state.status === 'submitting' ? 'Starting…' : (retryJobId ? 'Start grading again' : 'Start grading')) : ['Next: Define questions','Next: Student answers','Review assessment'][activeStep]}
          </Button>
      </div>
    </Box>
  );
};

export default NewAssessmentV2;