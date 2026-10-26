import tagService from '../../services/tagService';
import AudienceSelector from '../../components/tags/AudienceSelector';
// /src/pages/quizzes/QuizBuilder.jsx

// --- Core React Imports ---
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// --- MUI Component Imports ---
import {
  Box,
  Button,
  Typography,
  TextField,
  Paper,
  Card,
  CardContent,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Tooltip,
  CircularProgress,
  Checkbox,
  Radio,
  RadioGroup,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import RadioButtonCheckedRounded from '@mui/icons-material/RadioButtonCheckedRounded';
import ThumbsUpDownOutlined from '@mui/icons-material/ThumbsUpDownOutlined';
import ShortTextRounded from '@mui/icons-material/ShortTextRounded';
import PollOutlined from '@mui/icons-material/PollOutlined';
import CheckRounded from '@mui/icons-material/CheckRounded';
import BoltRounded from '@mui/icons-material/BoltRounded';
import SelfImprovementRounded from '@mui/icons-material/SelfImprovementRounded';
import UploadDropzone from '../../components/common/UploadDropzone';
import ChoiceCards from '../../components/common/ChoiceCards';
import PageHeader from '../../components/common/PageHeader';
import QuestionNavigator from '../../components/common/QuestionNavigator';
import useQuizLight from '../../hooks/useQuizLight';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import PreviewIcon from '@mui/icons-material/Preview';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';

// --- Service Import ---
import quizService from '../../services/quizService';
import classService from '../../services/classService';
import { useSnackbar } from '../../hooks/useSnackbar';
import useNumberInput from '../../hooks/useNumberInput';
import MathInputWithPreview from '../../components/common/MathInputWithPreview';
import MathTextDisplay from '../../components/common/MathTextDisplay';

/**
 * Question type options
 */
const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple choice', short: 'Multiple choice', Icon: RadioButtonCheckedRounded },
  { value: 'true_false', label: 'True or false', short: 'True / false', Icon: ThumbsUpDownOutlined },
  { value: 'short_answer', label: 'Short answer', short: 'Short answer', Icon: ShortTextRounded },
  { value: 'poll', label: 'Poll (no correct answer)', short: 'Poll', Icon: PollOutlined }
];

/**
 * Question Editor Component
 */
const QuestionEditor = ({ question, index, onChange, onDelete, onDuplicate, handleImageUpload, handleImageDelete, uploadingImages, expanded, onToggle, isLive }) => {
  const [localQuestion, setLocalQuestion] = useState(question);
  const [shortAnswerText, setShortAnswerText] = useState('');

  useEffect(() => {
    setLocalQuestion(question);
    // Initialize shortAnswerText when question changes
    if (question.question_type === 'short_answer' && question.correct_answer) {
      setShortAnswerText(question.correct_answer.join('\n'));
    }
  }, [question]);

  // Number input hooks for Points and Time Limit fields
  const pointsInputProps = useNumberInput(
    localQuestion.points !== undefined ? localQuestion.points : (localQuestion.question_type === 'poll' ? 0 : 10),
    (num) => handleChange('points', num),
    {
      defaultValue: localQuestion.question_type === 'poll' ? 0 : 10,
      min: 0,
      max: 100
    }
  );

  const timeLimitInputProps = useNumberInput(
    localQuestion.time_limit_seconds || 30,
    (num) => handleChange('time_limit_seconds', num),
    {
      defaultValue: 30,
      min: 5,
      max: 300
    }
  );

  const handleChange = (field, value) => {
    const updated = { ...localQuestion, [field]: value };

    // FIX: When changing question type, reset correct_answer AND options appropriately
    if (field === 'question_type') {
      const previousType = localQuestion.question_type;

      if (value === 'poll') {
        updated.correct_answer = [];  // Polls have no correct answer
        updated.points = 0;  // Polls default to 0 points
        updated.options = ['', ''];  // Initialize with 2 empty options for polls
      } else if (value === 'true_false') {
        updated.correct_answer = [true];  // Default to true
        updated.options = [];  // True/false has no options (just true/false buttons)
        // If coming from poll (0 points), restore to 10
        if (previousType === 'poll' && updated.points === 0) {
          updated.points = 10;
        }
      } else if (value === 'multiple_choice') {
        updated.correct_answer = [];  // Will be set when user selects
        updated.options = ['', '', '', ''];  // Initialize with 4 empty options
        // If coming from poll (0 points), restore to 10
        if (previousType === 'poll' && updated.points === 0) {
          updated.points = 10;
        }
      } else if (value === 'short_answer') {
        updated.correct_answer = [];  // Will be set when user enters keywords
        updated.options = [];  // Short answer has no options (free text input)
        setShortAnswerText('');  // Reset the local text buffer
        // If coming from poll (0 points), restore to 10
        if (previousType === 'poll' && updated.points === 0) {
          updated.points = 10;
        }
      }
      console.log('[QuestionEditor] Question type changed to:', value, 'Reset correct_answer to:', updated.correct_answer, 'Options:', updated.options, 'Points:', updated.points);
    }

    setLocalQuestion(updated);
    onChange(index, updated);
  };

  const handleOptionChange = (optionIndex, value) => {
    const newOptions = [...(localQuestion.options || [])];
    newOptions[optionIndex] = value;
    handleChange('options', newOptions);
  };

  const addOption = () => {
    const newOptions = [...(localQuestion.options || []), ''];
    handleChange('options', newOptions);
  };

  const removeOption = (optionIndex) => {
    const newOptions = localQuestion.options.filter((_, i) => i !== optionIndex);
    handleChange('options', newOptions);

    // Update correct answer if it was the removed option
    if (localQuestion.question_type === 'multiple_choice') {
      const correctAnswerIndex = localQuestion.correct_answer?.[0];
      if (correctAnswerIndex === optionIndex) {
        handleChange('correct_answer', []);
      } else if (correctAnswerIndex > optionIndex) {
        handleChange('correct_answer', [correctAnswerIndex - 1]);
      }
    }
  };

  const handleCorrectAnswerChange = (value) => {
    if (localQuestion.question_type === 'multiple_choice') {
      handleChange('correct_answer', [parseInt(value)]);
    } else if (localQuestion.question_type === 'true_false') {
      handleChange('correct_answer', [value === 'true']);
    }
  };

  const typeInfo = QUESTION_TYPES.find((t) => t.value === localQuestion.question_type) || QUESTION_TYPES[0];
  const TypeIcon = typeInfo.Icon;
  const preview = (localQuestion.question_text || '').trim();
  const optionLetter = (i) => String.fromCharCode(65 + i);
  const bodyId = `question-${index}-body`;

  return (
    <Card className="mst-rim mst-question" data-open={expanded ? 'true' : 'false'}>
      <div className="mst-question-head">
        <h3 className="mst-question-toggle">
          <span aria-hidden="true" className="mst-question-num">{index + 1}</span>
          <span className="mst-question-preview" data-empty={preview ? undefined : 'true'}><MathTextDisplay text={preview || 'Untitled question'} /></span>
        </h3>
        <span className="mst-question-facts">
          <Chip icon={<TypeIcon />} label={typeInfo.short} size="small" />
          <span className="mst-question-fact">{localQuestion.points ?? 0} pts</span>
          {isLive ? <span className="mst-question-fact">{localQuestion.time_limit_seconds || 30} s</span> : null}
        </span>
        <Tooltip title="Duplicate question">
          <IconButton aria-label={`Duplicate question ${index + 1}`} onClick={() => onDuplicate(index)}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete question">
          <IconButton aria-label={`Delete question ${index + 1}`} className="mst-danger-icon" onClick={() => onDelete(index)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>

      </div>

      {expanded ? (
        <div className="mst-question-body" id={bodyId}>
          <div className="mst-field-label-row">Question type</div>
          <ToggleButtonGroup
            aria-label="Question type"
            className="mst-type-switch"
            exclusive
            onChange={(e, value) => value && handleChange('question_type', value)}
            value={localQuestion.question_type || 'multiple_choice'}
          >
            {QUESTION_TYPES.map((type) => (
              <ToggleButton key={type.value} value={type.value}>
                <type.Icon fontSize="small" />
                {type.short}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <div className="mst-question-grid">
            <div className="mst-question-text">
              <MathInputWithPreview
                multiline
                rows={2}
                label="Question"
                value={localQuestion.question_text || ''}
                onChange={(e) => handleChange('question_text', e.target.value)}
                placeholder="Write your question"

              />
              <details className="mst-math-help"><summary>Formatting maths</summary><p>Use $x^2 + 3$ for inline maths or $$x^2 + 3$$ on its own line. Check the preview before saving.</p></details>
            </div>
            <div className="mst-question-numbers">
              <TextField
                type="number"
                label="Points"
                {...pointsInputProps}
                InputProps={{ inputProps: { min: 0, max: 100 } }}
                helperText={localQuestion.question_type === 'poll' ? 'Polls are usually 0' : ''}
              />
              <TextField
                type="number"
                label="Time (seconds)"
                {...timeLimitInputProps}
                InputProps={{ inputProps: { min: 5, max: 300 } }}
              />
            </div>
          </div>

          {localQuestion.media_url ? (
            <div className="mst-question-image">
              <img alt="" src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${localQuestion.media_url}`} />
              <span className="mst-question-image-text">
                <span>Question image</span>
                <span className="mst-hint">Shown to students with the question.</span>
              </span>
              <Button component="label" disabled={uploadingImages[index]} size="small" variant="outlined">
                {uploadingImages[index] ? 'Uploading…' : 'Replace'}
                <input accept="image/png,image/jpeg,image/jpg,image/gif" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(index, file); e.target.value = ''; }} type="file" />
              </Button>
              <Tooltip title="Remove image">
                <IconButton aria-label="Remove the question image" onClick={() => handleImageDelete(index)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>
          ) : (
            <div className="mst-question-image-action">
              <Button component="label" size="small" variant="text" startIcon={<ImageIcon />} disabled={uploadingImages[index]}>
                {uploadingImages[index] ? 'Uploading…' : 'Add image'}
                <input hidden type="file" accept="image/png,image/jpeg,image/jpg,image/gif" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(index, file);
                  e.target.value = '';
                }} />
              </Button>
              <span className="mst-hint">Optional · up to 5 MB</span>
            </div>
          )}

          {(localQuestion.question_type === 'multiple_choice' || localQuestion.question_type === 'poll') && (
            <div className="mst-options">
              <div className="mst-field-label-row">
                {localQuestion.question_type === 'poll' ? 'Options (no correct answer)' : 'Answers · switch on the correct one'}
              </div>
              {(localQuestion.options || (localQuestion.question_type === 'poll' ? ['', ''] : ['', '', '', ''])).map((option, optionIndex) => {
                const correct = localQuestion.question_type === 'multiple_choice' && localQuestion.correct_answer?.[0] === optionIndex;
                return (
                  <div className="mst-option" data-correct={correct ? 'true' : undefined} key={optionIndex}>
                    {localQuestion.question_type === 'multiple_choice' ? (
                      <Tooltip title={correct ? 'Correct answer' : 'Mark as correct'}>
                        <Switch
                          checked={correct}
                          inputProps={{ 'aria-label': `Option ${optionLetter(optionIndex)} is the correct answer` }}
                          onChange={() => handleCorrectAnswerChange(optionIndex)}
                        />
                      </Tooltip>
                    ) : null}
                    <span aria-hidden="true" className="mst-option-letter">{optionLetter(optionIndex)}</span>
                    <div className="mst-option-field">
                      <MathInputWithPreview
                        size="small"
                        label={`Option ${optionLetter(optionIndex)}`}
                        value={option}
                        onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                      />
                    </div>
                    {localQuestion.options.length > 2 && (
                      <Tooltip title="Remove option">
                        <IconButton aria-label={`Remove option ${optionLetter(optionIndex)}`} onClick={() => removeOption(optionIndex)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
              {localQuestion.options.length < 6 && (
                <Button onClick={addOption} size="small" startIcon={<AddIcon />} variant="text">
                  Add option
                </Button>
              )}
            </div>
          )}

          {localQuestion.question_type === 'true_false' && (
            <div className="mst-options">
              <div className="mst-field-label-row">Correct answer</div>
              <ToggleButtonGroup
                aria-label="Correct answer"
                exclusive
                onChange={(e, value) => value && handleCorrectAnswerChange(value)}
                value={localQuestion.correct_answer?.[0] === true ? 'true' : 'false'}
              >
                <ToggleButton value="true"><CheckRounded fontSize="small" /> True</ToggleButton>
                <ToggleButton value="false"><CloseIcon fontSize="small" /> False</ToggleButton>
              </ToggleButtonGroup>
            </div>
          )}

          {localQuestion.question_type === 'short_answer' && (
            <div className="mst-options">
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Marked by keywords, not AI.</strong> A student gets full credit when their answer contains every keyword below (capital letters don't matter). Students can type maths with $ … $.
              </Alert>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Keywords the answer must contain"
                value={shortAnswerText}
                onChange={(e) => setShortAnswerText(e.target.value)}
                onBlur={() => {
                  const keywords = shortAnswerText
                    .split(/[\n,]/)
                    .map(s => s.trim())
                    .filter(s => s.length > 0);
                  handleChange('correct_answer', keywords);
                }}
                placeholder={'One per line or separated by commas, e.g.\nParis\nFrance'}
                helperText="Spaces inside a keyword are fine."
              />
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
};

/**
 * Main Quiz Builder Component
 */
const QuizBuilder = () => {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const isEditMode = Boolean(quizId);

  const [activeStep, setActiveStep] = useState(0);
  const [stepDir, setStepDir] = useState('fwd');
  const [openQuestion, setOpenQuestion] = useState(0);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const { run: lightRun, play: playLight } = useQuizLight();
  const goStep = (next) => {
    setStepDir(next >= activeStep ? 'fwd' : 'back');
    setActiveStep(next);
    playLight();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Quiz metadata
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizSettings, setQuizSettings] = useState({
    mode: 'live',
    shuffle_questions: false,
    shuffle_options: false,
    show_correct_answers: true,
    allow_review: true,
    show_correct_answer_during_cooldown: true, // NEW: Default to true for better learning outcomes
    show_final_score_to_students: true,
    show_result_feedback_to_students: true,
    show_leaderboard_to_students: true
  });

  // Class selection for roster tracking
  const [selectedClassId, setSelectedClassId] = useState('');
  const [audience,setAudience]=useState(null);
  const [audiencePreview,setAudiencePreview]=useState(null);
  const [classList, setClassList] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);

  // Pre/Post quiz linking
  const [quizPhase, setQuizPhase] = useState('normal');
  const [linkedPreQuizId, setLinkedPreQuizId] = useState(null);
  const [linkedPreQuiz, setLinkedPreQuiz] = useState(null);
  const [preQuizList, setPreQuizList] = useState([]);
  const [preQuizDialogOpen, setPreQuizDialogOpen] = useState(false);
  const [preQuizLoading, setPreQuizLoading] = useState(false);
  const [preQuizError, setPreQuizError] = useState(null);

  // Questions
  const [questions, setQuestions] = useState([
    {
      question_type: 'multiple_choice',
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: [],
      points: 10,
      time_limit_seconds: 30,
      order_index: 0
    }
  ]);

  // Dialogs
  const [publishDialog, setPublishDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);

  // AI Question Import state
  const [aiParsing, setAiParsing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [documentType, setDocumentType] = useState('questions_and_answers');
  const [gradeLevel, setGradeLevel] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [questionTypes, setQuestionTypes] = useState(['multiple_choice']);
  const [difficulty, setDifficulty] = useState('medium');
  const [customInstructions, setCustomInstructions] = useState('');
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadlineDuration, setDeadlineDuration] = useState(60);

  const { showSnackbar } = useSnackbar();
  const [uploadingImages, setUploadingImages] = useState({});

  // Number input hooks for deadline duration and AI questions count
  const deadlineDurationInputProps = useNumberInput(
    deadlineDuration,
    setDeadlineDuration,
    {
      defaultValue: 60,
      min: 1,
      max: 1440
    }
  );

  const numQuestionsInputProps = useNumberInput(
    numQuestions,
    setNumQuestions,
    {
      defaultValue: 10,
      min: 1,
      max: 50
    }
  );

  // NEW: Fetch classes on component mount
  useEffect(() => {
    loadClasses();
  }, []);

  // Load quiz if editing
  useEffect(() => {
    if (isEditMode) {
      loadQuiz();
    }
  }, [quizId]);

  const loadClasses = async () => {
    try {
      setClassesLoading(true);
      const fetchedClasses = await classService.getAllClasses();
      setClassList(fetchedClasses || []);
      console.log('[QuizBuilder] Loaded classes:', fetchedClasses.length);
    } catch (err) {
      console.error('[QuizBuilder] Failed to load classes:', err);
      // Don't show error to user - class selection is optional
      setClassList([]);
    } finally {
      setClassesLoading(false);
    }
  };

  const loadQuiz = async () => {
    try {
      setIsLoading(true);
      const quiz = await quizService.getQuizById(quizId);
      setQuizTitle(quiz.title);
      setQuizDescription(quiz.description || '');
      const normalizedSettings = quiz.settings ? { ...quiz.settings } : { ...quizSettings, mode: 'live' };
      if (!normalizedSettings.mode || normalizedSettings.mode === 'synchronous') {
        normalizedSettings.mode = 'live';
      }
      if (['self_paced', 'self-paced', 'sp'].includes(normalizedSettings.mode)) {
        normalizedSettings.mode = 'self_paced';
      }
      setQuizSettings(normalizedSettings);
      if (quiz.settings?.deadline_enabled) {
        setDeadlineEnabled(true);
        setDeadlineDuration(quiz.settings.deadline_minutes || 60);
      } else {
        setDeadlineEnabled(false);
        setDeadlineDuration(60);
      }
      setAudience(quiz.audience || (quiz.class_id ? {class_ids:[quiz.class_id],tag_ids:[],mode:'union'} : null));
      setSelectedClassId(quiz.class_id || ''); // NEW: Load class_id
      setQuizPhase(quiz.quiz_phase || 'normal');
      setLinkedPreQuizId(quiz.linked_quiz_id || null);
      if (quiz.quiz_phase === 'post' && quiz.linked_quiz_id) {
        try {
          const linkedQuiz = await quizService.getQuizById(quiz.linked_quiz_id);
          setLinkedPreQuiz(linkedQuiz);
        } catch (error) {
          console.warn('[QuizBuilder] Failed to load linked pre quiz details:', error);
          setLinkedPreQuiz({ id: quiz.linked_quiz_id, title: 'Linked Pre Quiz' });
        }
      } else {
        setLinkedPreQuiz(null);
      }
      if (quiz.questions && quiz.questions.length > 0) {
        setQuestions(quiz.questions.sort((a, b) => a.order_index - b.order_index));
      }
      setError(null);
    } catch (err) {
      console.error("Failed to load quiz:", err);
      setError(err.message || "Failed to load quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetPrePostSelection = () => {
    setQuizPhase('normal');
    setLinkedPreQuizId(null);
    setLinkedPreQuiz(null);
    setPreQuizList([]);
  };

  const formatModeLabel = (modeValue) => (modeValue === 'self_paced' ? 'Self-paced' : 'Live');

  const getSelectedClassLabel = () => {
    if (!selectedClassId) {
      return 'All classes';
    }
    const cls = classList.find((c) => c.id === selectedClassId);
    return cls?.name || 'Unknown class';
  };

  const fetchPreQuizList = async () => {
    const modeParam = quizSettings?.mode === 'self_paced' ? 'self_paced' : 'live';
    const altMode = modeParam === 'live' ? 'self_paced' : 'live';
    const classParam = selectedClassId || null;
    const includeAllClasses = !selectedClassId;

    try {
      setPreQuizLoading(true);
      setPreQuizError(null);
      const preQuizzes = await quizService.getFinishedPreQuizzes({
        class_id: classParam,
        mode: modeParam,
        include_all_classes: includeAllClasses
      });

      if (preQuizzes && preQuizzes.length > 0) {
        setPreQuizList(preQuizzes);
        return;
      }

      // Probe alternate mode for the same class in case the mode is mismatched
      const altPreQuizzes = await quizService.getFinishedPreQuizzes({
        class_id: classParam,
        mode: altMode,
        include_all_classes: includeAllClasses
      });

      if (altPreQuizzes && altPreQuizzes.length > 0) {
        setQuizSettings(prev => ({ ...(prev || {}), mode: altMode }));
        setPreQuizList(altPreQuizzes);
        showSnackbar(
          `No ${formatModeLabel(modeParam)} pre-quizzes found. Switched to ${formatModeLabel(altMode)} to match available pre-quizzes.`,
          'info'
        );
        return;
      }

      setPreQuizList([]);
      setPreQuizError(
        `No eligible pre-quizzes for ${getSelectedClassLabel()} (${formatModeLabel(modeParam)}). ` +
        'Make sure the pre-quiz is completed, and the class/mode match.'
      );
    } catch (error) {
      console.error('[QuizBuilder] Failed to load pre quizzes:', error);
      setPreQuizError(error.message || 'Failed to load pre quizzes');
      setPreQuizList([]);
    } finally {
      setPreQuizLoading(false);
    }
  };

  const handleOpenPreQuizDialog = async () => {
    setPreQuizDialogOpen(true);
    await fetchPreQuizList();
  };

  const handleClosePreQuizDialog = () => {
    setPreQuizDialogOpen(false);
    if (quizPhase === 'post' && !linkedPreQuizId) {
      setQuizPhase('normal');
    }
  };

  const handleSelectPreQuiz = (quiz) => {
    setLinkedPreQuizId(quiz.id);
    setLinkedPreQuiz(quiz);
    setAudience(quiz.audience || (quiz.class_id ? {class_ids:[quiz.class_id],tag_ids:[],mode:'union'} : null));
    if ((quiz.class_id || '') !== selectedClassId) {
      setSelectedClassId(quiz.class_id || '');
    }
    setPreQuizDialogOpen(false);
  };

  const handleQuizPhaseChange = (value) => {
    if (value === 'post') {
      setQuizPhase('post');
      if (!linkedPreQuizId) {
        handleOpenPreQuizDialog();
      }
      return;
    }

    setQuizPhase(value);
    setLinkedPreQuizId(null);
    setLinkedPreQuiz(null);
  };

  const handleModeChange = (value) => {
    setQuizSettings(prev => ({
      ...(prev || {}),
      mode: value
    }));

    if (quizPhase === 'post' || linkedPreQuizId) {
      resetPrePostSelection();
    }
  };

  const handleClassChange = (value) => {
    setSelectedClassId(value);
    if (quizPhase === 'post' || linkedPreQuizId) {
      resetPrePostSelection();
    }
  };

  const handleQuestionChange = (index, updatedQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    const newQuestion = {
      question_type: 'multiple_choice',
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: [],  // Start with empty array
      points: 10,
      time_limit_seconds: 30,
      order_index: questions.length
    };

    console.log('[QuizBuilder] Adding new question:', newQuestion);
    setQuestions([...questions, newQuestion]);
  };

  const deleteQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const duplicateQuestion = (index) => {
    const questionToDuplicate = { ...questions[index] };
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, {
      ...questionToDuplicate,
      order_index: index + 1
    });
    setQuestions(newQuestions);
  };

  const handleImageUpload = async (questionIndex, file) => {
    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      showSnackbar('Image too large (max 5MB)', 'error');
      return;
    }

    try {
      setUploadingImages(prev => ({ ...prev, [questionIndex]: true }));

      // Check if question has an ID
      let question = questions[questionIndex];
      
      if (!question.id) {
        // Quiz not saved yet - auto-save first
        showSnackbar('Saving quiz...', 'info');
        
        const savedQuizId = await handleSave();
        
        if (!savedQuizId) {
          showSnackbar('Failed to save quiz. Please fix validation errors first.', 'error');
          setUploadingImages(prev => ({ ...prev, [questionIndex]: false }));
          return;
        }
        
        // After save in CREATE mode, navigation happens which remounts component
        // We can't continue in the old component context
        // So we need to tell the user to click upload again
        if (!isEditMode) {
          showSnackbar('Quiz saved! Please click the upload button again to add the image.', 'info');
          setUploadingImages(prev => ({ ...prev, [questionIndex]: false }));
          return;
        }
        
        // In EDIT mode, no navigation happens, so we can proceed
        // But we need to get the updated question from state
        question = questions[questionIndex];
        
        if (!question.id) {
          showSnackbar('Please try uploading the image again', 'warning');
          setUploadingImages(prev => ({ ...prev, [questionIndex]: false }));
          return;
        }
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Upload
      const response = await quizService.uploadQuestionImage(question.id, formData);

      // Update question with media_url
      const newQuestions = [...questions];
      newQuestions[questionIndex] = {
        ...newQuestions[questionIndex],
        media_url: response.media_url
      };
      setQuestions(newQuestions);

      showSnackbar('Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Failed to upload image:', error);
      showSnackbar(error.message || 'Failed to upload image', 'error');
    } finally {
      setUploadingImages(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const handleImageDelete = async (questionIndex) => {
    const question = questions[questionIndex];
    if (!question.id) return;

    try {
      await quizService.deleteQuestionImage(question.id);

      // Update question to remove media_url
      const newQuestions = [...questions];
      newQuestions[questionIndex] = {
        ...newQuestions[questionIndex],
        media_url: null
      };
      setQuestions(newQuestions);

      showSnackbar('Image deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete image:', error);
      showSnackbar(error.message || 'Failed to delete image', 'error');
    }
  };

  const validateQuiz = () => {
    if (!quizTitle.trim()) {
      return "Quiz title is required.";
    }
    if (quizPhase === 'post' && !linkedPreQuizId) {
      return "Post quizzes must link to a completed pre quiz.";
    }
    if (quizPhase !== 'post' && linkedPreQuizId) {
      return "Linked pre quiz is only allowed for post quizzes.";
    }
    if (questions.length === 0) {
      return "At least one question is required.";
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        return `Question ${i + 1}: Question text is required.`;
      }
      if (q.question_type === 'multiple_choice') {
        if (!q.options || q.options.length < 2) {
          return `Question ${i + 1}: At least 2 options are required.`;
        }
        if (q.options.some(opt => !opt.trim())) {
          return `Question ${i + 1}: All options must have text.`;
        }
        if (!q.correct_answer || q.correct_answer.length === 0) {
          return `Question ${i + 1}: Please select the correct answer.`;
        }
      }
      if (q.question_type === 'true_false') {
        if (q.correct_answer === undefined || q.correct_answer.length === 0) {
          return `Question ${i + 1}: Please select True or False as the correct answer.`;
        }
      }
      if (q.question_type === 'short_answer') {
        if (!q.correct_answer || q.correct_answer.length === 0) {
          return `Question ${i + 1}: Please provide at least one correct answer keyword.`;
        }
      }
      if (q.question_type === 'poll') {
        if (!q.options || q.options.length < 2) {
          return `Question ${i + 1}: At least 2 options are required for a poll.`;
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateQuiz();
    if (validationError) {
      setError(validationError);
      return null; // Return null to indicate failure
    }

    try {
      setIsSaving(true);
      setError(null);

      if (audience && !(await tagService.preview(audience)).count) throw new Error('The selected audience is empty. Choose enrolled students before saving.');
      const quizData = {
        title: quizTitle,
        description: quizDescription,
        quiz_phase: quizPhase,
        linked_quiz_id: quizPhase === 'post' ? linkedPreQuizId : null,
        settings: {
          ...quizSettings,
          deadline_enabled: quizSettings?.mode === 'self_paced' ? deadlineEnabled : false,
          deadline_minutes: quizSettings?.mode === 'self_paced' && deadlineEnabled ? deadlineDuration : null
        },
        audience,
        class_id: selectedClassId || null, // NEW: Include class_id for roster tracking
        questions: questions.map((q, index) => ({
          ...q,
          order_index: index,
          // FIX: Ensure poll questions have empty correct_answer array
          correct_answer: q.question_type === 'poll' ? [] : q.correct_answer
        }))
      };

      console.log('[QuizBuilder] Saving quiz:', quizData);

      if (isEditMode) {
        await quizService.updateQuiz(quizId, quizData);
        console.log('[QuizBuilder] Quiz updated successfully');
        showSnackbar('Quiz saved successfully!', 'success');
        return quizId; // Return the current quiz ID
      } else {
        const created = await quizService.createQuiz(quizData);
        console.log('[QuizBuilder] Quiz created successfully:', created.id);
        showSnackbar('Quiz created successfully!', 'success');
        navigate(`/quizzes/${created.id}/edit`);
        return created.id; // Return the new quiz ID
      }
    } catch (err) {
      console.error("[QuizBuilder] Failed to save quiz:", err);
      console.error("[QuizBuilder] Error details:", err.response?.data);
      setError(err.message || "Failed to save quiz.");
      return null; // Return null to indicate failure
    } finally {
      setIsSaving(false);
    }
  };

  // AI Question Import Handler
  const handleAIParse = async () => {
    if (!uploadedFile && !customInstructions.trim()) {
      showSnackbar('Please upload a file or provide instructions', 'error');
      return;
    }

    setAiParsing(true);

    try {
      const formData = new FormData();
      if (uploadedFile) {
        formData.append('document', uploadedFile);
      } else {
        const instructionsFile = new File(
          [customInstructions.trim()],
          'instructions.txt',
          { type: 'text/plain' }
        );
        formData.append('document', instructionsFile);
      }
      formData.append('document_type', documentType);
      if (gradeLevel) {
        formData.append('grade_level', gradeLevel);
      }
      if (documentType === 'lecture_material') {
        formData.append('num_questions', numQuestions.toString());
        formData.append('question_types', questionTypes.join(','));
        formData.append('difficulty', difficulty);
      }
      if (customInstructions.trim()) {
        formData.append('custom_instructions', customInstructions.trim());
      }

      console.log('[QuizBuilder] Parsing document with AI:', {
        fileName: uploadedFile ? uploadedFile.name : 'instructions.txt',
        fileType: uploadedFile ? uploadedFile.type : 'text/plain',
        documentType,
        gradeLevel,
        numQuestions,
        questionTypes: documentType === 'lecture_material' ? questionTypes : 'N/A',
        difficulty: documentType === 'lecture_material' ? difficulty : 'N/A',
        customInstructions: customInstructions.trim() || 'N/A'
      });

      const response = await quizService.parseQuizDocument(formData);

      console.log('[QuizBuilder] AI parsing response:', response);

      if (!response.success || !response.questions || response.questions.length === 0) {
        throw new Error('No questions were extracted from the document');
      }

      // Check if first question is empty and should be removed
      const isFirstQuestionEmpty = questions.length === 1 &&
        !questions[0].question_text.trim() &&
        questions[0].options.every(opt => !opt.trim());

      let baseIndex = 0;
      let existingQuestions = [...questions];

      if (isFirstQuestionEmpty) {
        // Remove the empty first question
        existingQuestions = [];
        console.log('[QuizBuilder] Removed empty first question');
      } else {
        baseIndex = questions.length;
      }

      // Add parsed questions to the quiz
      const newQuestions = response.questions.map((q, idx) => ({
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options || [],
        correct_answer: q.correct_answer || [],
        points: q.points || 10,
        time_limit_seconds: q.time_limit_seconds,
        explanation: q.explanation,
        order_index: baseIndex + idx,
        media_url: null
      }));

      setQuestions([...existingQuestions, ...newQuestions]);
      setShowAIDialog(false);
      setUploadedFile(null);
      setCustomInstructions('');

      showSnackbar(
        `Successfully imported ${newQuestions.length} question${newQuestions.length > 1 ? 's' : ''}!`,
        'success'
      );

      console.log('[QuizBuilder] Added AI-generated questions:', newQuestions.length);

    } catch (error) {
      console.error('[QuizBuilder] AI parsing failed:', error);
      const rawMessage = error.response?.data?.detail || error.message || '';
      const friendlyMessage = (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429'))
        ? 'AI model is temporarily unavailable. Please try again later or contact support.'
        : (rawMessage || 'Failed to parse document. Please try again.');
      showSnackbar(friendlyMessage, 'error');
    } finally {
      setAiParsing(false);
    }
  };

  const handleCloseAIDialog = () => {
    if (aiParsing) return;
    setShowAIDialog(false);
    setUploadedFile(null);
    setCustomInstructions('');
  };

  // Download Questions as CSV
  const downloadQuestionsCSV = () => {
    if (questions.length === 0) {
      showSnackbar('No questions to download', 'warning');
      return;
    }

    const headers = [
      'Question #',
      'Type',
      'Question Text',
      'Option 1',
      'Option 2',
      'Option 3',
      'Option 4',
      'Option 5',
      'Option 6',
      'Correct Answer',
      'Points',
      'Time Limit (seconds)',
      'Explanation'
    ];

    const escapeCSV = (field) => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatQuestionType = (questionType) => {
      if (!questionType) return '';
      return questionType
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const formatCorrectAnswer = (question) => {
      if (!question) return '';
      const answers = Array.isArray(question.correct_answer) ? question.correct_answer : [];

      if (question.question_type === 'poll') {
        return 'N/A (Poll)';
      }

      if (question.question_type === 'true_false') {
        const value = answers[0];
        if (value === true || value === 'true' || value === 'True') return 'True';
        if (value === false || value === 'false' || value === 'False') return 'False';
        return value ?? '';
      }

      if (question.question_type === 'multiple_choice') {
        return answers.map((answer) => {
          if (typeof answer === 'number') {
            return `Option ${answer + 1}`;
          }
          if (typeof answer === 'string') {
            const index = (question.options || []).indexOf(answer);
            return index >= 0 ? `Option ${index + 1}` : answer;
          }
          return String(answer);
        }).join('; ');
      }

      if (question.question_type === 'short_answer') {
        return answers.join('; ');
      }

      return answers.join('; ');
    };

    const rows = questions.map((question, index) => {
      const options = Array.isArray(question.options) ? question.options : [];
      const row = [
        index + 1,
        formatQuestionType(question.question_type),
        escapeCSV(question.question_text),
        escapeCSV(options[0] || ''),
        escapeCSV(options[1] || ''),
        escapeCSV(options[2] || ''),
        escapeCSV(options[3] || ''),
        escapeCSV(options[4] || ''),
        escapeCSV(options[5] || ''),
        escapeCSV(formatCorrectAnswer(question)),
        question.points ?? 10,
        question.time_limit_seconds ?? '',
        escapeCSV(question.explanation || '')
      ];
      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `${(quizTitle || 'quiz').replace(/\s+/g, '_')}_questions.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSnackbar(`Downloaded ${questions.length} question(s) as CSV`, 'success');
  };

  const handlePublish = async () => {
    const validationError = validateQuiz();
    if (validationError) {
      setError(validationError);
      setPublishDialog(false);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      let quizIdToPublish = quizId;

      // Save first if needed (creating new quiz)
      if (!isEditMode) {
        console.log('[QuizBuilder] Creating quiz before publishing...');
        const createdQuizId = await handleSave();
        if (!createdQuizId) {
          throw new Error('Failed to create quiz before publishing');
        }
        quizIdToPublish = createdQuizId;
        console.log('[QuizBuilder] Quiz created, now publishing:', quizIdToPublish);
      }

      // Then publish
      console.log('[QuizBuilder] Publishing quiz:', quizIdToPublish);
      await quizService.publishQuiz(quizIdToPublish);
      console.log('[QuizBuilder] Quiz published successfully');
      setPublishDialog(false);
      navigate('/quizzes');
    } catch (err) {
      console.error("[QuizBuilder] Failed to publish quiz:", err);
      console.error("[QuizBuilder] Error details:", err.response?.data);
      setError(err.message || "Failed to publish quiz.");
      setPublishDialog(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  return (
    <Box className="mst-quiz-editor" sx={{ maxWidth: 1120, mx: 'auto', minWidth: 0 }}>
      <div aria-hidden="true" className="mst-quiz-light" data-run={lightRun || undefined} />
      <PageHeader
        backLabel="Back to quizzes"
        backTo="/quizzes"
        breadcrumbs={[{ label: 'Quizzes', to: '/quizzes' }, { label: isEditMode ? 'Edit quiz' : 'New quiz' }]}
        title={isEditMode ? 'Edit quiz' : 'Create a quiz'}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <p className="mst-mobile-step-label">Step {activeStep+1} of 3 · {["Details","Questions","Settings"][activeStep]}</p>
      <Paper className="mst-rim mst-builder-stepper" data-enter="">
        <Stepper activeStep={activeStep} alternativeLabel>
          {['Details', 'Questions', 'Settings'].map((label, i) => (
            <Step key={label} completed={activeStep > i}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <div className="mst-step" data-dir={stepDir} key={activeStep}>
      {/* Step Content */}
      {activeStep === 0 && (
        <>
          <Paper className="mst-rim mst-builder-card">
            <h2 className="mst-card-title">About the quiz</h2>
            <div className="mst-builder-fields">
              <TextField
                fullWidth
                label="Title"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g. Cells and tissues · check-in"
                required
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description (optional)"
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                placeholder="What is this quiz about?"
              />
              <AudienceSelector value={audience} allowOpen disabled={classesLoading || quizPhase==='post'}
                onPreview={setAudiencePreview} onChange={spec=>{setAudience(spec.class_ids.length||spec.tag_ids.length?spec:null);handleClassChange(spec.class_ids[0]||'');}} />

            </div>
          </Paper>

          <Paper className="mst-rim mst-builder-card">
            <h2 className="mst-card-title">How will students take it?</h2>
            <p className="mst-card-sub">You can change this until you publish.</p>
            <ChoiceCards
              disabled={quizPhase === 'post'}
              name="quiz-mode"
              onChange={(value) => { handleModeChange(value); playLight(); }}
              options={[
                { value: 'live', label: 'Live quiz', icon: <BoltRounded />, facts: ['Everyone answers together', 'A timer on each question', 'A live leaderboard'] },
                { value: 'self_paced', label: 'Self-paced', icon: <SelfImprovementRounded />, facts: ['Students go at their own pace', 'No timer per question', 'An optional deadline'] },
              ]}
              size="sm"
              value={quizSettings?.mode || 'live'}
            />
            {quizPhase === 'post' ? <p className="mst-hint" style={{ marginTop: 12 }}>Mode and class follow the linked pre-quiz.</p> : null}
          </Paper>

          <Paper className="mst-rim mst-builder-card">
            <details className="mst-optional-quiz-phase" open={quizPhase !== "normal" || undefined}>
            <summary>Pre-quiz / post-quiz options</summary>
            <p className="mst-card-sub">A normal quiz, or one half of a pre-quiz / post-quiz pair that measures progress.</p>
            <ToggleButtonGroup
              aria-label="Quiz phase"
              className="mst-phase-switch"
              exclusive
              onChange={(e, value) => value && handleQuizPhaseChange(value)}
              value={quizPhase}
            >
              <ToggleButton value="normal">Normal</ToggleButton>
              <ToggleButton value="pre">Pre-quiz</ToggleButton>
              <ToggleButton value="post">Post-quiz</ToggleButton>
            </ToggleButtonGroup>
            <p className="mst-hint" style={{ marginTop: 10 }}>
              {quizPhase === 'pre' ? 'Run it before teaching; a post-quiz can be linked to it later.' : quizPhase === 'post' ? 'Linked to a completed pre-quiz, so you can compare the two.' : 'A stand-alone quiz.'}
            </p>

            {quizPhase === 'post' && (
              <Box sx={{ mt: 2 }}>
                {linkedPreQuiz ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Linked pre-quiz: {linkedPreQuiz.display_title || linkedPreQuiz.title || 'Pre-quiz'}
                  </Alert>
                ) : (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Choose a completed pre-quiz to link this post-quiz to.
                  </Alert>
                )}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button variant="outlined" onClick={handleOpenPreQuizDialog}>
                    {linkedPreQuiz ? 'Change linked pre-quiz' : 'Choose a pre-quiz'}
                  </Button>
                </Box>
              </Box>
            )}
            </details>
          </Paper>



          <div className="mst-builder-foot">
            <span />
            <Button size="large" variant="contained" onClick={() => goStep(1)}>
              Next: questions
            </Button>
          </div>
        </>
      )}

      {activeStep === 1 && (
        <Box>
          <div className="mst-builder-toolbar">
            <h2 className="mst-card-title">Questions <span className="mst-count">{questions.length}</span></h2>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button startIcon={<DownloadIcon />} aria-label="Download questions as CSV" onClick={downloadQuestionsCSV} disabled={questions.length === 0}>Export CSV</Button>
              <Button className="mst-ai" variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={() => setShowAIDialog(true)}>
                Import with AI
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { addQuestion(); setOpenQuestion(questions.length); }}>
                Add question
              </Button>
            </Box>
          </div>

          <div className="mst-question-workspace">
            <QuestionNavigator label="Quiz questions"
              items={questions.map((q, i) => ({ id: String(i), number: i + 1, title: q.question_text?.slice(0, 80) }))}
              selected={showAllQuestions ? null : questions.length ? String(Math.min(openQuestion ?? 0, questions.length - 1)) : ''}
              onSelect={(id) => { setShowAllQuestions(false); setOpenQuestion(Number(id)); }}>
              {questions.length > 1 && <Button fullWidth variant={showAllQuestions ? "contained" : "outlined"} aria-pressed={showAllQuestions} onClick={() => setShowAllQuestions(!showAllQuestions)}>{showAllQuestions ? "Show one question" : "Show all questions"}</Button>}
              <p className="mst-question-nav-hint">Your edits stay when you switch questions. Save draft to keep them.</p>
            </QuestionNavigator>
            <div className="mst-focused-question">
              {questions.length === 0 && <Alert severity="info">Add your first question, or import questions with AI.</Alert>}
              {questions.map((question, index) => (showAllQuestions || index === Math.min(openQuestion ?? 0, questions.length - 1)) ? (
                <QuestionEditor
                  key={index}
                  question={question}
                  index={index}
                  expanded={true}
                  isLive={(quizSettings?.mode || 'live') === 'live'}
                  onToggle={() => {}}
                  onChange={handleQuestionChange}
                  onDelete={(i) => { deleteQuestion(i); setOpenQuestion(Math.max(0, Math.min(i, questions.length - 2))); }}
                  onDuplicate={(i) => { duplicateQuestion(i); setOpenQuestion(i + 1); }}
                  handleImageUpload={handleImageUpload}
                  handleImageDelete={handleImageDelete}
                  uploadingImages={uploadingImages}
                />
              ) : null)}
            </div>
          </div>

          <div className="mst-builder-foot mst-quiz-edit-footer">
            <Button onClick={() => goStep(0)} variant="text">
              Back
            </Button>
            <Button variant="outlined" onClick={handleSave} disabled={isSaving}>Save draft</Button>
            <Button size="large" variant="contained" onClick={() => goStep(2)}>
              Next: settings
            </Button>
          </div>
        </Box>
      )}

      {activeStep === 2 && (
        <Paper className="mst-rim mst-builder-card">
          <h2 className="mst-card-title">{quizSettings?.mode === 'self_paced' ? 'Self-paced settings' : 'Live quiz settings'}</h2>
          <p className="mst-card-sub">What students see during and after the quiz.</p>
          <div className="mst-settings">

          {quizSettings?.mode === 'live' && (
            <Box className="mst-setting">
              <FormControlLabel
                control={
                  <Switch
                    checked={quizSettings.show_correct_answer_during_cooldown ?? true}
                    onChange={(e) => setQuizSettings({
                      ...quizSettings,
                      show_correct_answer_during_cooldown: e.target.checked
                    })}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>Show right / wrong between questions</Typography>
                    <Tooltip
                      title="When enabled, students will see if their answer was correct or incorrect during the cooldown period between questions. Recommended for practice quizzes and formative assessments."
                      arrow
                    >
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                }
                labelPlacement="start"
                className="mst-setting-label"
              />
              <Typography className="mst-setting-help" variant="body2" color="text.secondary">
                {quizSettings.show_correct_answer_during_cooldown ?? true
                  ? "Students will see immediate feedback (best for learning and practice)"
                  : "Feedback hidden until quiz ends (best for graded assessments)"}
              </Typography>
            </Box>
          )}

          {quizSettings?.mode === 'live' && (
            <Box className="mst-setting">
              <FormControlLabel
                control={
                  <Switch
                    checked={quizSettings.show_result_feedback_to_students ?? true}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setQuizSettings({
                        ...quizSettings,
                        show_result_feedback_to_students: newValue,
                        show_leaderboard_to_students: newValue
                          ? quizSettings.show_leaderboard_to_students
                          : false
                      });
                    }}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>Let students review their answers afterwards</Typography>
                    <Tooltip
                      title="When enabled, students can view detailed answer review showing their responses, correct answers, and explanations after the quiz ends. When disabled, students only see a completion message."
                      arrow
                    >
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                }
                labelPlacement="start"
                className="mst-setting-label"
              />
              <Typography className="mst-setting-help" variant="body2" color="text.secondary">
                {quizSettings.show_result_feedback_to_students ?? true
                  ? "Students can review their answers and see explanations"
                  : "Students only see submission confirmation (no detailed feedback)"}
              </Typography>
            </Box>
          )}

          {quizSettings?.mode === 'live' && (
            <Box className="mst-setting">
              <FormControlLabel
                control={
                  <Switch
                    checked={quizSettings.show_leaderboard_to_students ?? true}
                    onChange={(e) => setQuizSettings({
                      ...quizSettings,
                      show_leaderboard_to_students: e.target.checked
                    })}
                    color="primary"
                    disabled={!(quizSettings.show_result_feedback_to_students ?? true)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>Show the leaderboard afterwards</Typography>
                    <Tooltip
                      title="When enabled, students see the leaderboard with rankings and scores. Requires result feedback to be enabled."
                      arrow
                    >
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                }
                labelPlacement="start"
                className="mst-setting-label"
              />
              <Typography className="mst-setting-help" variant="body2" color="text.secondary">
                {!(quizSettings.show_result_feedback_to_students ?? true)
                  ? "Disabled (result feedback must be enabled first)"
                  : (quizSettings.show_leaderboard_to_students ?? true)
                    ? "Students will see rankings and scores"
                    : "Leaderboard hidden (students only see their own results)"}
              </Typography>
            </Box>
          )}

          {quizSettings?.mode === 'self_paced' && (
            <Box className="mst-setting">
              <FormControlLabel
                control={
                  <Switch
                    checked={quizSettings.show_final_score_to_students ?? true}
                    onChange={(e) => setQuizSettings({
                      ...quizSettings,
                      show_final_score_to_students: e.target.checked
                    })}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>Show students their final score</Typography>
                    <Tooltip
                      title="When enabled, students will see their final score and percentage after submitting the quiz. When disabled, students only see a confirmation message without score details."
                      arrow
                    >
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                }
                labelPlacement="start"
                className="mst-setting-label"
              />
              <Typography className="mst-setting-help" variant="body2" color="text.secondary">
                {quizSettings.show_final_score_to_students ?? true
                  ? "Students will see their score and percentage after submission"
                  : "Students will only see submission confirmation (score hidden)"}
              </Typography>
            </Box>
          )}

          {quizSettings?.mode === 'self_paced' && (
            <Box className="mst-setting">
              <FormControlLabel
                control={
                  <Switch
                    checked={deadlineEnabled}
                    onChange={(e) => setDeadlineEnabled(e.target.checked)}
                    color="primary"
                  />
                }
                label={(
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>Set a time limit</Typography>
                    <Tooltip
                      title="When enabled, the quiz will automatically end and submit all student answers when the time limit is reached."
                      arrow
                    >
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                )}
                labelPlacement="start"
                className="mst-setting-label"
              />

              {deadlineEnabled && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    type="number"
                    label="Time limit (minutes)"
                    {...deadlineDurationInputProps}
                    InputProps={{
                      inputProps: { min: 1, max: 1440 }
                    }}
                    sx={{ width: 220 }}
                    helperText="Quiz will auto-end after this duration from start"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    The session will end {deadlineDuration} minute{deadlineDuration !== 1 ? 's' : ''} after start.
                  </Typography>
                </Box>
              )}

              <Typography className="mst-setting-help" variant="body2" color="text.secondary">
                {deadlineEnabled
                  ? 'Students will be automatically submitted when time expires.'
                  : 'No time limit enabled for this quiz.'}
              </Typography>
            </Box>
          )}

          </div>
          <Alert severity="info" sx={{ mt: 3 }}>
            Publish to make the quiz available, or save it as a draft for later. Once it's published you can start a session for students to join.
          </Alert>
        </Paper>
      )}
      {activeStep === 2 && (
          <div className="mst-builder-foot">
            <Button onClick={() => goStep(1)} variant="text">
              Back
            </Button>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Button size="large" variant="outlined" onClick={handleSave} disabled={isSaving}>
                Save as draft
              </Button>
              <Button size="large" variant="contained" startIcon={<PublishIcon />} onClick={() => setPublishDialog(true)} disabled={isSaving}>
                Publish quiz
              </Button>
            </Box>
          </div>
      )}
      </div>

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialog} onClose={() => setPublishDialog(false)}>
        <DialogTitle>Publish this quiz?</DialogTitle>
        <DialogContent>
          <Typography>
            Once published, you can start live quiz sessions with your students.
            You can still edit the quiz after publishing, but changes won't affect active sessions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialog(false)}>Cancel</Button>
          <Button onClick={handlePublish} variant="contained" disabled={isSaving}>
            Publish
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pre-Quiz Selection Dialog */}
      <Dialog open={preQuizDialogOpen} onClose={handleClosePreQuizDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Select a Completed Pre-Quiz</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Only completed pre-quizzes with the same class and mode are available.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Current filter: {getSelectedClassLabel()} • {formatModeLabel(quizSettings?.mode === 'self_paced' ? 'self_paced' : 'live')}
          </Typography>

          {preQuizLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          )}

          {!preQuizLoading && preQuizError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {preQuizError}
            </Alert>
          )}

          {!preQuizLoading && !preQuizError && preQuizList.length === 0 && (
            <Alert severity="info">
              No eligible pre-quizzes found. Complete a pre-quiz session first.
            </Alert>
          )}

          {!preQuizLoading && !preQuizError && preQuizList.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {preQuizList.map((quiz) => (
                <Box
                  key={quiz.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {quiz.display_title || quiz.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {quiz.question_count || 0} questions • {quiz.class_id
                        ? (classList.find((cls) => cls.id === quiz.class_id)?.name || 'Unknown class')
                        : 'No class'}
                    </Typography>
                  </Box>
                  <Button variant="outlined" onClick={() => handleSelectPreQuiz(quiz)}>
                    Select
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreQuizDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Keep the existing import contract; only the presentation changes. */}
      <Dialog open={showAIDialog} onClose={handleCloseAIDialog} maxWidth="sm" fullWidth PaperProps={{ className: 'mst-quiz-import' }}>
        <DialogTitle>Import with AI</DialogTitle>
        <DialogContent>
          <Box className="mst-import-grid">
            <FormControl size="small" fullWidth className="mst-import-wide">
              <InputLabel id="import-source-label">Start from</InputLabel>
              <Select labelId="import-source-label" label="Start from" value={documentType} onChange={(e) => setDocumentType(e.target.value)} disabled={aiParsing}>
                <MenuItem value="questions_only">Questions only · add answers yourself</MenuItem>
                <MenuItem value="questions_and_answers">Questions with answers</MenuItem>
                <MenuItem value="lecture_material">Study material · generate questions</MenuItem>
              </Select>
            </FormControl>
            <div className="mst-import-wide">
            {/* File Upload Area */}
            {!aiParsing ? (
              <UploadDropzone
                accept={{
                  'application/pdf': ['.pdf'],
                  'image/jpeg': ['.jpg', '.jpeg'],
                  'image/png': ['.png'],
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                  'text/csv': ['.csv'],
                  'text/plain': ['.txt'],
                }}
                files={uploadedFile ? [uploadedFile] : []}
                hint="PDF, JPG, PNG, Word, Excel, CSV or text"
                onDrop={(files) => setUploadedFile(files[0])}
                onRemove={() => setUploadedFile(null)}
                size="compact"
                title={uploadedFile ? 'Choose a different file' : 'Choose file'}
              />
            ) : (
              <div className="mst-ai-progress" role="status" style={{ padding: '24px 0' }}>
                <div className="mst-ai-bar" />
                <span>AI is reading your document… this can take a minute. Keep this window open.</span>
              </div>
            )}
            </div>
            <TextField size="small" label="Grade level (optional)" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="e.g. Grade 9" disabled={aiParsing} />
            {documentType === 'lecture_material' && <>
              <TextField size="small" type="number" label="Questions" {...numQuestionsInputProps} disabled={aiParsing} inputProps={{ min: 1, max: 50 }} />
              <FormControl size="small" fullWidth>
                <InputLabel id="import-types-label">Question types</InputLabel>
                <Select labelId="import-types-label" multiple value={questionTypes} label="Question types" onChange={(e) => setQuestionTypes(e.target.value)} disabled={aiParsing}
                  renderValue={(values) => values.map(value => QUESTION_TYPES.find(type => type.value === value)?.short).join(', ')}>
                  {QUESTION_TYPES.filter(type => type.value !== 'poll').map(type => <MenuItem key={type.value} value={type.value}><Checkbox checked={questionTypes.includes(type.value)} size="small" />{type.short}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel id="import-difficulty-label">Difficulty</InputLabel>
                <Select labelId="import-difficulty-label" label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={aiParsing}>
                  <MenuItem value="easy">Easy</MenuItem><MenuItem value="medium">Medium</MenuItem><MenuItem value="hard">Hard</MenuItem>
                </Select>
              </FormControl>
            </>}
            <TextField className="mst-import-wide" size="small" fullWidth multiline minRows={2} maxRows={4} label="Instructions or pasted material (optional)"
              value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} disabled={aiParsing}
              placeholder="Paste material here, or tell AI what to focus on." />
            <Typography className="mst-import-wide" variant="caption" color="text.secondary">Upload a file or paste material, then review the imported questions and answers before saving.</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAIDialog} disabled={aiParsing}>Cancel</Button>
          <Button onClick={handleAIParse} variant="contained" disabled={(!uploadedFile && !customInstructions.trim()) || aiParsing || (documentType === 'lecture_material' && !questionTypes.length)} startIcon={<AutoAwesomeIcon />}>Import questions</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizBuilder;
