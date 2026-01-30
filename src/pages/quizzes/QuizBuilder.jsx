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
  RadioGroup
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
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

/**
 * Question type options
 */
const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '☑️' },
  { value: 'true_false', label: 'True/False', icon: '✓✗' },
  { value: 'short_answer', label: 'Short Answer', icon: '✍️' },
  { value: 'poll', label: 'Poll (No correct answer)', icon: '📊' }
];

/**
 * Question Editor Component
 */
const QuestionEditor = ({ question, index, onChange, onDelete, onDuplicate, handleImageUpload, handleImageDelete, uploadingImages }) => {
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

  return (
    <Card sx={{ mb: 3, position: 'relative' }}>
      <CardContent>
        {/* Question Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <DragIndicatorIcon sx={{ color: 'text.secondary', cursor: 'grab', mr: 1 }} />
          <Typography variant="h6" sx={{ flex: 1 }}>
            Question {index + 1}
          </Typography>
          <Chip
            label={QUESTION_TYPES.find(t => t.value === localQuestion.question_type)?.label || 'Unknown'}
            size="small"
            sx={{ mr: 1 }}
          />
          <Tooltip title="Duplicate question">
            <IconButton size="small" onClick={() => onDuplicate(index)} sx={{ mr: 1 }}>
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete question">
            <IconButton size="small" onClick={() => onDelete(index)} color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={2}>
          {/* Question Type */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Question Type</InputLabel>
              <Select
                value={localQuestion.question_type || 'multiple_choice'}
                label="Question Type"
                onChange={(e) => handleChange('question_type', e.target.value)}
              >
                {QUESTION_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Points */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Points"
              {...pointsInputProps}
              InputProps={{ inputProps: { min: 0, max: 100 } }}
              helperText={localQuestion.question_type === 'poll' ? "Polls typically have 0 points" : ""}
            />
          </Grid>

          {/* Time Limit */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Time Limit (seconds)"
              {...timeLimitInputProps}
              InputProps={{ inputProps: { min: 5, max: 300 } }}
            />
          </Grid>

          {/* Question Text with Image Upload */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              {/* Question Text Field */}
              <Box sx={{ flex: 1 }}>
                <MathInputWithPreview
                  multiline
                  rows={2}
                  label="Question Text"
                  value={localQuestion.question_text || ''}
                  onChange={(e) => handleChange('question_text', e.target.value)}
                  placeholder="Enter your question here... (For math formulas use $ and $$)"
                  helperText="Tip: Wrap math in $ for inline (e.g., $x^2 + 3$) or $$ for display mode (e.g., $$sqrt(x)$$)"
                />
              </Box>

              {/* Image Upload Button */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', mt: 1 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageIcon />}
                  size="small"
                  disabled={uploadingImages[index]}
                  sx={{ whiteSpace: 'nowrap', minWidth: 120 }}
                >
                  {uploadingImages[index] ? 'Uploading...' : (localQuestion.media_url ? 'Change' : 'Add Image')}
                  <input
                    type="file"
                    hidden
                    accept="image/png,image/jpeg,image/jpg,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(index, file);
                      }
                      e.target.value = ''; // Reset input
                    }}
                  />
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', textAlign: 'center' }}>
                  PNG, JPG, GIF
                  <br />
                  (max 5MB)
                </Typography>
              </Box>
            </Box>

            {/* Image Preview (if uploaded) */}
            {localQuestion.media_url && (
              <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#f9f9f9' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Question Image Preview:
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleImageDelete(index)}
                    color="error"
                    sx={{ ml: 1 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <img 
                    src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${localQuestion.media_url}`}
                    alt="Question visual"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: 200, 
                      borderRadius: 8,
                      display: 'inline-block',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                </Box>
              </Box>
            )}
          </Grid>

          {/* Multiple Choice Options */}
          {localQuestion.question_type === 'multiple_choice' && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Answer Options (Select the correct answer)
              </Typography>
              {(localQuestion.options || ['', '', '', '']).map((option, optionIndex) => (
                <Box key={optionIndex} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localQuestion.correct_answer?.[0] === optionIndex}
                        onChange={() => handleCorrectAnswerChange(optionIndex)}
                        color="success"
                      />
                    }
                    label=""
                    sx={{ mt: 1 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <MathInputWithPreview
                      size="small"
                      label={`Option ${optionIndex + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                    />
                  </Box>
                  {localQuestion.options.length > 2 && (
                    <IconButton
                      size="small"
                      onClick={() => removeOption(optionIndex)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
              {localQuestion.options.length < 6 && (
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addOption}
                  sx={{ mt: 1 }}
                >
                  Add Option
                </Button>
              )}
            </Grid>
          )}

          {/* True/False */}
          {localQuestion.question_type === 'true_false' && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Correct Answer</InputLabel>
                <Select
                  value={localQuestion.correct_answer?.[0] === true ? 'true' : 'false'}
                  label="Correct Answer"
                  onChange={(e) => handleCorrectAnswerChange(e.target.value)}
                >
                  <MenuItem value="true">✓ True</MenuItem>
                  <MenuItem value="false">✗ False</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Short Answer */}
          {localQuestion.question_type === 'short_answer' && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Grading Method: Keyword-Based Matching (Not AI-Powered)
                </Typography>
                <Typography variant="body2">
                  Students must include <strong>all</strong> of the keywords listed below in their answer to receive full credit.
                  The system checks if each keyword appears in the student's response (case-insensitive).
                  This is manual keyword validation—enter the exact words, separate with comma or enter.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
                  Math Formulas: Students can type formulas using $ syntax (e.g., $x^2 + 3$)
                </Typography>
              </Alert>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Correct Answer Keywords"
                value={shortAnswerText}
                onChange={(e) => setShortAnswerText(e.target.value)}
                onBlur={() => {
                  // Only update when field loses focus
                  const keywords = shortAnswerText
                    .split(/[\n,]/)
                    .map(s => s.trim())
                    .filter(s => s.length > 0);
                  handleChange('correct_answer', keywords);
                }}
                placeholder="Enter keywords (one per line or comma-separated):&#10;Paris&#10;france&#10;European capital"
                helperText="Enter keywords (one per line OR comma-separated). Spaces within keywords are allowed. Matching is case-insensitive."
              />
            </Grid>
          )}

          {/* Poll (no correct answer) */}
          {localQuestion.question_type === 'poll' && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Poll Options (No correct answer)
              </Typography>
              {(localQuestion.options || ['', '']).map((option, optionIndex) => (
                <Box key={optionIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <MathInputWithPreview
                    size="small"
                    label={`Option ${optionIndex + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                  />
                  {localQuestion.options.length > 2 && (
                    <IconButton
                      size="small"
                      onClick={() => removeOption(optionIndex)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
              {localQuestion.options.length < 6 && (
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addOption}
                  sx={{ mt: 1 }}
                >
                  Add Option
                </Button>
              )}
            </Grid>
          )}
        </Grid>
      </CardContent>
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
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/quizzes')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h2" sx={{ flex: 1 }}>
          {isEditMode ? 'Edit Quiz' : 'Create New Quiz'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<PublishIcon />}
          onClick={() => setPublishDialog(true)}
          disabled={isSaving || activeStep !== 2}
        >
          Publish Quiz
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        <Step>
          <StepLabel>Quiz Details</StepLabel>
        </Step>
        <Step>
          <StepLabel>Questions</StepLabel>
        </Step>
        <Step>
          <StepLabel>Settings</StepLabel>
        </Step>
      </Stepper>

      {/* Step Content */}
      {activeStep === 0 && (
        <>
          {/* Mode Selector - NEW */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Quiz Mode
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose how students will take this quiz
            </Typography>

            <RadioGroup
              value={quizSettings?.mode || 'live'}
              onChange={(e) => handleModeChange(e.target.value)}
            >
              <FormControlLabel
                value="live"
                control={<Radio />}
                disabled={quizPhase === 'post'}
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      Live Quiz
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Real-time quiz with WebSocket, all students on same question, per-question timers
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="self_paced"
                control={<Radio />}
                disabled={quizPhase === 'post'}
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      Self-Paced Assessment
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Students complete at their own pace, navigate freely, no per-question timers
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Quiz Phase
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Set this quiz as a normal quiz, a pre-quiz, or a post-quiz linked to a completed pre-quiz.
            </Typography>

            <RadioGroup
              value={quizPhase}
              onChange={(e) => handleQuizPhaseChange(e.target.value)}
            >
              <FormControlLabel
                value="normal"
                control={<Radio />}
                label="Normal quiz (no pre/post)"
              />
              <FormControlLabel
                value="pre"
                control={<Radio />}
                label="Pre-quiz"
              />
              <FormControlLabel
                value="post"
                control={<Radio />}
                label="Post-quiz (linked to a completed pre-quiz)"
              />
            </RadioGroup>

            {quizPhase === 'post' && (
              <Box sx={{ mt: 2 }}>
                {linkedPreQuiz ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Linked Pre Quiz: {linkedPreQuiz.display_title || linkedPreQuiz.title || 'Pre Quiz'}
                  </Alert>
                ) : (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Select a completed pre-quiz to link this post quiz.
                  </Alert>
                )}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button variant="outlined" onClick={handleOpenPreQuizDialog}>
                    {linkedPreQuiz ? 'Change Linked Pre Quiz' : 'Select Pre Quiz'}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Class and mode are locked while Post Quiz is selected.
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>Quiz Information</Typography>
            <TextField
              fullWidth
              label="Quiz Title"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              sx={{ mb: 3 }}
              required
            />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description (Optional)"
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            placeholder="Describe what this quiz is about..."
            sx={{ mb: 3 }}
          />

          {/* NEW: Class Selection for Roster Tracking */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Class (Optional - for student roster tracking)</InputLabel>
            <Select
              value={selectedClassId}
              label="Class (Optional - for student roster tracking)"
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={classesLoading || quizPhase === 'post'}
            >
              <MenuItem value="">
                <em>No Class (All Students Can Join)</em>
              </MenuItem>
              {classList.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>
                  {cls.name}
                </MenuItem>
              ))}
            </Select>
            {selectedClassId && (
              <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                ✓ Roster tracking enabled: Expected students will be pre-populated when you start a session.
                Outsider students (not in this class) will be automatically detected and flagged.
              </Typography>
            )}
          </FormControl>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button variant="contained" onClick={() => setActiveStep(1)}>
              Next: Add Questions
            </Button>
          </Box>
        </Paper>
        </>
      )}

      {activeStep === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">Questions ({questions.length})</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => setShowAIDialog(true)}
                sx={{
                  background: 'linear-gradient(90deg, #20c5e8 0%, #4d47e0 100%)',
                  color: 'white',
                  boxShadow: '0 3px 5px 2px rgba(32, 197, 232, .3)',
                  fontWeight: 'bold',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #1ba5c8 0%, #3d37c0 100%)',
                    boxShadow: '0 4px 6px 2px rgba(32, 197, 232, .4)',
                  }
                }}
              >
                Import with AI
              </Button>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={addQuestion}>
                Add Manually
              </Button>
            </Box>
          </Box>

          {questions.map((question, index) => (
            <QuestionEditor
              key={index}
              question={question}
              index={index}
              onChange={handleQuestionChange}
              onDelete={deleteQuestion}
              onDuplicate={duplicateQuestion}
              handleImageUpload={handleImageUpload}
              handleImageDelete={handleImageDelete}
              uploadingImages={uploadingImages}
            />
          ))}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={() => setActiveStep(0)}>
              Back
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={downloadQuestionsCSV}
                disabled={questions.length === 0}
              >
                Download Questions CSV
              </Button>
              <Button variant="contained" onClick={() => setActiveStep(2)}>
                Next: Settings
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {activeStep === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>Quiz Settings</Typography>

          {quizSettings?.mode === 'live' && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
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
                    <Typography>Show Answer Feedback During Cooldown</Typography>
                    <Tooltip
                      title="When enabled, students will see if their answer was correct or incorrect during the cooldown period between questions. Recommended for practice quizzes and formative assessments."
                      arrow
                    >
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                }
                sx={{ display: 'block' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block', mt: 1 }}>
                {quizSettings.show_correct_answer_during_cooldown ?? true
                  ? "Students will see immediate feedback (best for learning and practice)"
                  : "Feedback hidden until quiz ends (best for graded assessments)"}
              </Typography>
            </Box>
          )}

          {quizSettings?.mode === 'live' && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
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
                    <Typography>Show Result Feedback to Students After Quiz</Typography>
                    <Tooltip
                      title="When enabled, students can view detailed answer review showing their responses, correct answers, and explanations after the quiz ends. When disabled, students only see a completion message."
                      arrow
                    >
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                }
                sx={{ display: 'block' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block', mt: 1 }}>
                {quizSettings.show_result_feedback_to_students ?? true
                  ? "Students can review their answers and see explanations"
                  : "Students only see submission confirmation (no detailed feedback)"}
              </Typography>
            </Box>
          )}

          {quizSettings?.mode === 'live' && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
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
                    <Typography>Show Leaderboard to Students After Quiz</Typography>
                    <Tooltip
                      title="When enabled, students see the leaderboard with rankings and scores. Requires result feedback to be enabled."
                      arrow
                    >
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                }
                sx={{ display: 'block' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block', mt: 1 }}>
                {!(quizSettings.show_result_feedback_to_students ?? true)
                  ? "Disabled (result feedback must be enabled first)"
                  : (quizSettings.show_leaderboard_to_students ?? true)
                    ? "Students will see rankings and scores"
                    : "Leaderboard hidden (students only see their own results)"}
              </Typography>
            </Box>
          )}

          {quizSettings?.mode === 'self_paced' && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
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
                    <Typography>Show Final Score to Students</Typography>
                    <Tooltip
                      title="When enabled, students will see their final score and percentage after submitting the quiz. When disabled, students only see a confirmation message without score details."
                      arrow
                    >
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                }
                sx={{ display: 'block' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block', mt: 1 }}>
                {quizSettings.show_final_score_to_students ?? true
                  ? "Students will see their score and percentage after submission"
                  : "Students will only see submission confirmation (score hidden)"}
              </Typography>
            </Box>
          )}

          {quizSettings?.mode === 'self_paced' && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
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
                    <Typography>Set Time Limit</Typography>
                    <Tooltip
                      title="When enabled, the quiz will automatically end and submit all student answers when the time limit is reached."
                      arrow
                    >
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                )}
                sx={{ display: 'block', mb: deadlineEnabled ? 2 : 0 }}
              />

              {deadlineEnabled && (
                <Box sx={{ ml: 4, mt: 2 }}>
                  <TextField
                    type="number"
                    label="Time Limit (Minutes)"
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

              <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block', mt: 1 }}>
                {deadlineEnabled
                  ? 'Students will be automatically submitted when time expires.'
                  : 'No time limit enabled for this quiz.'}
              </Typography>
            </Box>
          )}

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Next Steps:
            </Typography>
            <Typography variant="body2">
              After saving, publish your quiz to make it available. Once published, you can create a session
              and start the quiz to allow students to join and participate in real-time.
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button onClick={() => setActiveStep(1)}>
              Back
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={isSaving}>
              Save Quiz
            </Button>
          </Box>
        </Paper>
      )}

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialog} onClose={() => setPublishDialog(false)}>
        <DialogTitle>Publish Quiz?</DialogTitle>
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

      {/* AI Question Import Dialog */}
      <Dialog open={showAIDialog} onClose={handleCloseAIDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon color="secondary" />
            <Typography variant="h6">Import Questions with AI</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Document Type Selector */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>What type of document are you uploading?</InputLabel>
              <Select
                value={documentType}
                label="What type of document are you uploading?"
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={aiParsing}
              >
                <MenuItem value="questions_only">
                  <Box>
                    <Typography variant="body1">Questions Only</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Extract questions without answers (you'll add answers later)
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="questions_and_answers">
                  <Box>
                    <Typography variant="body1">Questions with Answer Key</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Extract both questions and correct answers
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="lecture_material">
                  <Box>
                    <Typography variant="body1">Lecture Notes / Study Material</Typography>
                    <Typography variant="caption" color="text.secondary">
                      AI will generate questions from educational content
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Optional: Grade Level */}
            <TextField
              fullWidth
              label="Grade Level (Optional)"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="e.g., Grade 9, High School, University"
              sx={{ mb: 3 }}
              disabled={aiParsing}
              helperText="Helps AI adjust question difficulty"
            />

            {/* Number of Questions (for lecture_material only) */}
            {documentType === 'lecture_material' && (
              <>
                <TextField
                  fullWidth
                  type="number"
                  label="Number of Questions to Generate"
                  {...numQuestionsInputProps}
                  sx={{ mb: 3 }}
                  disabled={aiParsing}
                  InputProps={{ inputProps: { min: 1, max: 50 } }}
                />

                {/* Question Type Selector */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Question Types to Generate</InputLabel>
                  <Select
                    multiple
                    value={questionTypes}
                    label="Question Types to Generate"
                    onChange={(e) => setQuestionTypes(e.target.value)}
                    disabled={aiParsing}
                    renderValue={(selected) => selected.map(type =>
                      type === 'multiple_choice' ? 'Multiple Choice' :
                      type === 'true_false' ? 'True/False' :
                      type === 'short_answer' ? 'Short Answer' : type
                    ).join(', ')}
                  >
                    <MenuItem value="multiple_choice">
                      <Checkbox checked={questionTypes.indexOf('multiple_choice') > -1} />
                      <Typography>Multiple Choice</Typography>
                    </MenuItem>
                    <MenuItem value="true_false">
                      <Checkbox checked={questionTypes.indexOf('true_false') > -1} />
                      <Typography>True/False</Typography>
                    </MenuItem>
                    <MenuItem value="short_answer">
                      <Checkbox checked={questionTypes.indexOf('short_answer') > -1} />
                      <Typography>Short Answer</Typography>
                    </MenuItem>
                  </Select>
                </FormControl>

                {/* Difficulty Level Selector */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Question Difficulty</InputLabel>
                  <Select
                    value={difficulty}
                    label="Question Difficulty"
                    onChange={(e) => setDifficulty(e.target.value)}
                    disabled={aiParsing}
                  >
                    <MenuItem value="easy">
                      <Box>
                        <Typography variant="body1">Easy</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Simple recall and basic understanding
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="medium">
                      <Box>
                        <Typography variant="body1">Medium</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Application and analysis
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="hard">
                      <Box>
                        <Typography variant="body1">Hard</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Critical thinking and synthesis
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </>
            )}

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Additional Instructions (Optional)"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Provide extra guidance for question generation (e.g., paste quiz material or add guidance for your file)"
              sx={{ mb: 3 }}
              disabled={aiParsing}
              helperText="You can paste the quiz material here or add guidance for your file"
            />

            {/* File Upload Area */}
            {!aiParsing ? (
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: uploadedFile ? 'success.main' : 'divider',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  bgcolor: uploadedFile ? 'success.50' : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onClick={() => document.getElementById('ai-file-upload').click()}
              >
                <input
                  id="ai-file-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.csv,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => setUploadedFile(e.target.files[0])}
                />
                <CloudUploadIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {uploadedFile ? uploadedFile.name : 'Click to upload document'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supported formats: PDF, JPG, PNG, DOCX, XLSX, CSV, TXT
                </Typography>
                {uploadedFile && (
                  <Chip
                    label="File selected"
                    color="success"
                    sx={{ mt: 2 }}
                    onDelete={() => setUploadedFile(null)}
                  />
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={60} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  AI is analyzing your document...
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This may take a moment. Please don't close this window.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAIDialog} disabled={aiParsing}>
            Cancel
          </Button>
          <Button
            onClick={handleAIParse}
            variant="contained"
            disabled={(!uploadedFile && !customInstructions.trim()) || aiParsing}
            startIcon={<AutoAwesomeIcon />}
          >
            Import Questions
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizBuilder;
