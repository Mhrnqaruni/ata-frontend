// /src/pages/quizzes/QuizSPParticipant.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  TextField,
  Paper,
  Container,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Fade
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SendIcon from '@mui/icons-material/Send';
import TimerIcon from '@mui/icons-material/Timer';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import quizSPService from '../../services/quizSPService';
import { useSnackbar } from '../../hooks/useSnackbar';

/**
 * Join Screen Component - Student enters access code and info
 */
const JoinScreen = ({ onJoin }) => {
  const { accessCode: urlAccessCode } = useParams();
  const [accessCode, setAccessCode] = useState(urlAccessCode || '');
  const [studentId, setStudentId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);

  const handleJoin = async () => {
    if (!accessCode.trim() || !studentId.trim() || !guestName.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      const result = await quizSPService.joinSPSession(
        accessCode.trim(),
        studentId.trim(),
        guestName.trim()
      );

      onJoin(result);
    } catch (err) {
      console.error('Failed to join:', err);
      setError(err.message || 'Failed to join quiz. Please check the access code.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Fade in timeout={800}>
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ mb: 1, fontWeight: 700 }}>
            Join Self-Paced Quiz
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Enter the access code provided by your teacher
          </Typography>

          <Paper sx={{ p: 4 }}>
            <TextField
              fullWidth
              label="Access Code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              sx={{ mb: 3 }}
              inputProps={{
                style: {
                  fontSize: '2rem',
                  textAlign: 'center',
                  letterSpacing: 8,
                  fontWeight: 700,
                  fontFamily: 'monospace'
                },
                maxLength: 6
              }}
              autoFocus
            />

            <TextField
              fullWidth
              label="Your Name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="John Doe"
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="12345"
              sx={{ mb: 3 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleJoin();
                }
              }}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleJoin}
              disabled={isJoining || !accessCode.trim() || !studentId.trim() || !guestName.trim()}
              startIcon={isJoining ? <CircularProgress size={20} /> : null}
              sx={{ py: 2, fontSize: '1.2rem' }}
            >
              {isJoining ? 'Joining...' : 'Join Quiz'}
            </Button>
          </Paper>
        </Box>
      </Fade>
    </Container>
  );
};

/**
 * Deadline Timer Component for Student
 */
const DeadlineTimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(deadline);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Time expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setIsUrgent(diff < 5 * 60 * 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      } else {
        setTimeLeft(`${minutes}:${String(seconds).padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 700,
        color: isUrgent ? 'error.main' : 'warning.dark',
        fontFamily: 'monospace'
      }}
    >
      {timeLeft}
    </Typography>
  );
};

/**
 * Question Display Component - Shows one question with answer options
 */
const QuestionDisplay = ({
  question,
  currentAnswer,
  onAnswerChange,
  totalQuestions,
  currentIndex
}) => {
  const handleSelectOption = (optionIndex) => {
    if (question.question_type === 'multiple_choice') {
      onAnswerChange(optionIndex);
    }
  };

  const handleTrueFalseSelect = (value) => {
    onAnswerChange(value);
  };

  const handleShortAnswerChange = (e) => {
    onAnswerChange(e.target.value);
  };

  return (
    <Paper sx={{ p: 4, mb: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Chip
          label={`Question ${currentIndex + 1} of ${totalQuestions}`}
          color="primary"
          sx={{ mb: 2 }}
        />
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          {question.question_text}
        </Typography>
        {question.points && (
          <Typography variant="body2" color="text.secondary">
            {question.points} points
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Multiple Choice */}
      {question.question_type === 'multiple_choice' && (
        <Box>
          {question.options && question.options.map((option, index) => (
            <Card
              key={index}
              sx={{
                mb: 2,
                cursor: 'pointer',
                border: 2,
                borderColor: currentAnswer === index ? 'primary.main' : 'divider',
                backgroundColor: currentAnswer === index ? 'primary.light' : 'background.paper',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover'
                }
              }}
              onClick={() => handleSelectOption(index)}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
                {currentAnswer === index ? (
                  <CheckCircleIcon color="primary" sx={{ mr: 2 }} />
                ) : (
                  <RadioButtonUncheckedIcon color="action" sx={{ mr: 2 }} />
                )}
                <Typography variant="h6">
                  {option}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* True/False */}
      {question.question_type === 'true_false' && (
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Card
            sx={{
              flex: 1,
              cursor: 'pointer',
              border: 2,
              borderColor: currentAnswer === true ? 'primary.main' : 'divider',
              backgroundColor: currentAnswer === true ? 'primary.light' : 'background.paper',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover'
              }
            }}
            onClick={() => handleTrueFalseSelect(true)}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              {currentAnswer === true && <CheckCircleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />}
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                True
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              flex: 1,
              cursor: 'pointer',
              border: 2,
              borderColor: currentAnswer === false ? 'primary.main' : 'divider',
              backgroundColor: currentAnswer === false ? 'primary.light' : 'background.paper',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover'
              }
            }}
            onClick={() => handleTrueFalseSelect(false)}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              {currentAnswer === false && <CheckCircleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />}
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                False
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Short Answer */}
      {question.question_type === 'short_answer' && (
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="Type your answer here..."
          value={currentAnswer || ''}
          onChange={handleShortAnswerChange}
          variant="outlined"
        />
      )}

      {/* Poll (same as multiple choice but no grading) */}
      {question.question_type === 'poll' && question.options && (
        <Box>
          {question.options.map((option, index) => (
            <Card
              key={index}
              sx={{
                mb: 2,
                cursor: 'pointer',
                border: 2,
                borderColor: currentAnswer === index ? 'primary.main' : 'divider',
                backgroundColor: currentAnswer === index ? 'primary.light' : 'background.paper',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover'
                }
              }}
              onClick={() => handleSelectOption(index)}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
                {currentAnswer === index ? (
                  <CheckCircleIcon color="primary" sx={{ mr: 2 }} />
                ) : (
                  <RadioButtonUncheckedIcon color="action" sx={{ mr: 2 }} />
                )}
                <Typography variant="h6">
                  {option}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Paper>
  );
};

/**
 * Question Palette Component - Shows all questions with answered status
 */
const QuestionPalette = ({
  questions,
  currentIndex,
  answers,
  onNavigate,
  open,
  onClose
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Question Overview
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={1}>
          {questions.map((question, index) => {
            const isAnswered = answers[question.id] !== undefined && answers[question.id] !== null && answers[question.id] !== '';
            const isCurrent = index === currentIndex;

            return (
              <Grid item xs={6} sm={4} md={3} key={question.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: 2,
                    borderColor: isCurrent ? 'primary.main' : isAnswered ? 'success.main' : 'divider',
                    backgroundColor: isCurrent ? 'primary.light' : isAnswered ? 'success.light' : 'background.paper',
                    '&:hover': {
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => {
                    onNavigate(index);
                    onClose();
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    {isAnswered ? (
                      <CheckCircleIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
                    ) : (
                      <HelpOutlineIcon color="action" sx={{ fontSize: 32, mb: 1 }} />
                    )}
                    <Typography variant="h6" sx={{ fontWeight: isCurrent ? 700 : 400 }}>
                      Q{index + 1}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isAnswered ? 'Answered' : 'Unanswered'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Review Screen Component - Shows all questions with answers before final submit
 */
const ReviewScreen = ({
  questions,
  answers,
  onNavigateToQuestion,
  onFinalSubmit,
  requireAllAnswers
}) => {
  const answeredCount = Object.keys(answers).filter(
    qId => answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== ''
  ).length;

  const canSubmit = !requireAllAnswers || answeredCount === questions.length;

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
          Review Your Answers
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Review all your answers before final submission. You can go back to any question to change your answer.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={(answeredCount / questions.length) * 100}
            sx={{ height: 8, borderRadius: 1, mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            {answeredCount} of {questions.length} questions answered
          </Typography>
        </Box>

        {!canSubmit && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You must answer all questions before submitting.
          </Alert>
        )}
      </Paper>

      <List>
        {questions.map((question, index) => {
          const isAnswered = answers[question.id] !== undefined && answers[question.id] !== null && answers[question.id] !== '';

          return (
            <Card key={question.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  {isAnswered ? (
                    <CheckCircleIcon color="success" sx={{ mr: 2, mt: 0.5 }} />
                  ) : (
                    <HelpOutlineIcon color="warning" sx={{ mr: 2, mt: 0.5 }} />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Question {index + 1}
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {question.question_text}
                    </Typography>

                    {isAnswered ? (
                      <Typography variant="body1" color="primary.main" sx={{ fontWeight: 600 }}>
                        Answer: {
                          question.question_type === 'multiple_choice' || question.question_type === 'poll'
                            ? (question.options?.[answers[question.id]] ?? 'Not selected')
                            : question.question_type === 'true_false'
                            ? (answers[question.id] === true ? 'True' : answers[question.id] === false ? 'False' : 'Not selected')
                            : (answers[question.id] || 'Not answered')
                        }
                      </Typography>
                    ) : (
                      <Typography variant="body1" color="warning.main">
                        Not answered
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onNavigateToQuestion(index)}
                  >
                    {isAnswered ? 'Change' : 'Answer'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </List>

      <Paper sx={{ p: 3, mt: 3, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          color="primary"
          startIcon={<SendIcon />}
          onClick={onFinalSubmit}
          disabled={!canSubmit}
          sx={{ py: 2, px: 6, fontSize: '1.1rem' }}
        >
          Submit Quiz
        </Button>
        {!canSubmit && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Please answer all questions before submitting
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

/**
 * Answer Review Component for SP Quiz
 */
const AnswerReviewDisplaySP = ({ sessionId, studentToken, onBack }) => {
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await quizSPService.getMyAnswerReview(sessionId, studentToken);
        setReviewData(data);
      } catch (err) {
        setError(err.message || 'Failed to load answer review.');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId && studentToken) {
      fetchReview();
    }
  }, [sessionId, studentToken]);

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 6 }}>
          <Alert severity="error">{error}</Alert>
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button variant="outlined" onClick={onBack}>
              Back to Score
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  if (!reviewData) {
    return null;
  }

  return (
    <Container maxWidth="md">
      <Fade in timeout={800}>
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              Your Results
            </Typography>
            <Button variant="contained" color="primary" onClick={onBack}>
              Back to Score
            </Button>
          </Box>

          <Paper
            sx={{
              p: 3,
              mb: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}
          >
            <Typography variant="h5" gutterBottom>Score Summary</Typography>
            <Typography variant="h2" sx={{ fontWeight: 900 }}>
              {reviewData.total_score} / {reviewData.max_possible_score}
            </Typography>
            <Typography variant="h6">
              {reviewData.correct_count} out of {reviewData.total_questions} correct
            </Typography>
          </Paper>

          {reviewData.reviews.map((review, index) => {
            const studentAnswerSet = new Set((review.student_answer || []).map((v) => String(v)));
            const correctAnswerSet = new Set((review.correct_answer || []).map((v) => String(v)));
            const studentAnswerText = (review.student_answer || []).map((v) => String(v)).join(', ');
            const correctAnswerText = (review.correct_answer || []).map((v) => String(v)).join(', ');
            const isCorrect = review.is_correct === true;
            const isIncorrect = review.is_correct === false;

            return (
              <Fade in timeout={200 * (index + 1)} key={`${review.question_number}-${index}`}>
                <Card sx={{ mb: 3, border: 2, borderColor: isCorrect ? 'success.main' : isIncorrect ? 'error.main' : 'divider' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                      <Chip label={`Question ${review.question_number}`} color="primary" size="small" />
                      <Chip
                        label={`${review.points_earned} / ${review.max_points} pts`}
                        color={isCorrect ? 'success' : isIncorrect ? 'error' : 'default'}
                        icon={isCorrect ? <CheckCircleIcon /> : isIncorrect ? <RadioButtonUncheckedIcon /> : undefined}
                      />
                    </Box>

                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      {review.question_text}
                    </Typography>

                    {review.options && review.options.length > 0 ? (
                      <List>
                        {review.options.map((option, optIndex) => {
                          const optionKey = String(option);
                          const isStudentAnswer = studentAnswerSet.has(optionKey);
                          const isCorrectAnswer = correctAnswerSet.has(optionKey);

                          return (
                            <ListItem
                              key={`${review.question_number}-opt-${optIndex}`}
                              sx={{
                                mb: 1,
                                borderRadius: 1,
                                border: 2,
                                borderColor: isCorrectAnswer
                                  ? 'success.main'
                                  : isStudentAnswer
                                  ? 'error.main'
                                  : 'divider',
                                backgroundColor: isCorrectAnswer
                                  ? 'success.light'
                                  : isStudentAnswer
                                  ? 'error.light'
                                  : 'transparent'
                              }}
                            >
                              <ListItemText
                                primary={option}
                                secondary={
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                    {isStudentAnswer && (
                                      <Chip label="Your Answer" size="small" />
                                    )}
                                    {isCorrectAnswer && (
                                      <Chip label="Correct Answer" size="small" color="success" />
                                    )}
                                  </Box>
                                }
                                secondaryTypographyProps={{ component: 'div' }}
                              />
                            </ListItem>
                          );
                        })}
                      </List>
                    ) : (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Your Answer: {studentAnswerText || 'No answer'}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Correct Answer: {correctAnswerText || 'N/A'}
                        </Typography>
                      </Box>
                    )}

                    {review.explanation && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          Explanation: {review.explanation}
                        </Typography>
                      </Alert>
                    )}

                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Time taken: {review.time_taken_seconds}s
                    </Typography>
                  </CardContent>
                </Card>
              </Fade>
            );
          })}

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button variant="outlined" size="large" onClick={onBack}>
              Back to Score
            </Button>
          </Box>
        </Box>
      </Fade>
    </Container>
  );
};

/**
 * Completed Screen Component - Shows final score after submission
 */
const CompletedScreen = ({ finalResult, quizTitle, wasAutoSubmitted, sessionData, studentToken }) => {
  const showScore = sessionData?.settings?.show_final_score_to_students ?? true;
  const [showAnswerReview, setShowAnswerReview] = useState(false);

  if (showAnswerReview) {
    return (
      <AnswerReviewDisplaySP
        sessionId={sessionData.session_id}
        studentToken={studentToken}
        onBack={() => setShowAnswerReview(false)}
      />
    );
  }
  return (
    <Container maxWidth="sm">
      <Fade in timeout={800}>
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 120, mb: 3 }} />
          <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
            Quiz Submitted!
          </Typography>
          {wasAutoSubmitted && (
            <Alert severity="info" sx={{ mb: 3 }}>
              This quiz was automatically submitted when the session ended.
            </Alert>
          )}
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Your answers have been recorded
          </Typography>

          <Paper sx={{ p: 4, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {quizTitle}
            </Typography>

            {finalResult && showScore && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h2" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
                  {finalResult.percentage.toFixed(1)}%
                </Typography>
                <Typography variant="h5" color="text.secondary">
                  {finalResult.final_score} / {finalResult.total_possible_points} points
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  startIcon={<ListAltIcon />}
                  onClick={() => setShowAnswerReview(true)}
                  sx={{ mt: 3 }}
                >
                  View My Answers
                </Button>
              </Box>
            )}

            {!showScore && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="body1" color="text.secondary">
                  Thank you for completing this quiz. Your teacher will review your responses.
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Fade>
    </Container>
  );
};

/**
 * Main Component - Quiz SP Participant
 */
const QuizSPParticipant = () => {
  const { showSnackbar } = useSnackbar();

  // Session state
  const [sessionData, setSessionData] = useState(null);
  const [studentToken, setStudentToken] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings] = useState({});

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // {questionId: answer}
  const [progress, setProgress] = useState(null);

  // UI state
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer effect
  useEffect(() => {
    if (!sessionData || finalResult) return;

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionData, finalResult]);

  // Auto-submit when deadline is reached
  useEffect(() => {
    if (!sessionData?.deadline || progress?.status === 'submitted' || finalResult || isAutoSubmitting) {
      return;
    }

    const checkDeadline = async () => {
      const now = new Date();
      const end = new Date(sessionData.deadline);

      if (now >= end) {
        try {
          setIsAutoSubmitting(true);
          showSnackbar('Time limit reached. Auto-submitting your quiz...', 'warning');
          const result = await quizSPService.submitSPQuiz(
            sessionData.session_id,
            studentToken
          );
          setFinalResult(result);
          setProgress(prev => ({ ...(prev || {}), status: 'submitted' }));
        } catch (error) {
          console.error('Error auto-submitting quiz:', error);
          showSnackbar('Auto-submit failed. Please try submitting manually.', 'error');
        } finally {
          setIsAutoSubmitting(false);
        }
      }
    };

    const interval = setInterval(() => {
      checkDeadline();
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionData, progress, finalResult, isAutoSubmitting, studentToken, showSnackbar]);

  // Format elapsed time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle join
  const handleJoin = async (joinResult) => {
    setSessionData({
      session_id: joinResult.session_id,
      quiz_title: joinResult.quiz_title,
      total_questions: joinResult.total_questions,
      deadline: joinResult.deadline,
      settings: joinResult.settings || {}
    });
    setStudentToken(joinResult.student_token);
    setSettings(joinResult.settings || {});
    setProgress(joinResult.current_progress);

    // ✅ CRITICAL FIX: Questions now included in join response (Phase 2/3 fix)
    // No need for separate fetch - prevents "Invisible Quiz" bug
    setQuestions(joinResult.questions || []);

    showSnackbar('Joined quiz successfully!', 'success');
  };

  // Handle answer change
  const handleAnswerChange = (answer) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  };

  // Handle save answer (submit to backend)
  const handleSaveAnswer = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const answer = answers[currentQuestion.id];

    if (answer === undefined || answer === null || answer === '') {
      // Skip if no answer
      return;
    }

    try {
      const result = await quizSPService.submitSPAnswer(
        sessionData.session_id,
        currentQuestion.id,
        answer,
        null, // time_taken_ms (we don't track per-question time in self-paced)
        studentToken
      );

      // Update progress
      setProgress(prev => ({
        ...prev,
        score: result.current_score,
        completed_question_ids: [...(prev.completed_question_ids || []), currentQuestion.id]
      }));

    } catch (error) {
      console.error('Error saving answer:', error);
      // Don't show error to user, just log it (they can retry)
    }
  };

  // Handle navigation
  const handleNavigate = async (newIndex) => {
    // Save current answer if any
    await handleSaveAnswer();

    // Navigate
    try {
      await quizSPService.navigateSPQuestion(
        sessionData.session_id,
        newIndex,
        studentToken
      );

      setCurrentQuestionIndex(newIndex);
    } catch (error) {
      console.error('Error navigating:', error);
      showSnackbar(error.message, 'error');
    }
  };

  // Handle next
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      handleNavigate(currentQuestionIndex + 1);
    }
  };

  // Handle previous
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      handleNavigate(currentQuestionIndex - 1);
    }
  };

  // Handle review mode
  const handleEnterReview = async () => {
    // Save current answer
    await handleSaveAnswer();
    setIsReviewMode(true);
  };

  // Handle final submit
  const handleFinalSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit? You cannot change your answers after submission.')) {
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await quizSPService.submitSPQuiz(
        sessionData.session_id,
        studentToken
      );

      setFinalResult(result);
      showSnackbar('Quiz submitted successfully!', 'success');
    } catch (error) {
      console.error('Error submitting quiz:', error);
      showSnackbar(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render logic
  if (!sessionData) {
    return <JoinScreen onJoin={handleJoin} />;
  }

  if (finalResult || progress?.status === 'submitted') {
    const wasAutoSubmitted = progress?.status === 'submitted' && !finalResult;
    return (
      <CompletedScreen
        finalResult={finalResult}
        quizTitle={sessionData.quiz_title}
        wasAutoSubmitted={wasAutoSubmitted}
        sessionData={sessionData}
        studentToken={studentToken}
      />
    );
  }

  if (questions.length === 0) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading quiz...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (isReviewMode) {
    return (
      <ReviewScreen
        questions={questions}
        answers={answers}
        onNavigateToQuestion={(index) => {
          setIsReviewMode(false);
          setCurrentQuestionIndex(index);
        }}
        onFinalSubmit={handleFinalSubmit}
        requireAllAnswers={settings.require_all_answers || false}
      />
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {sessionData?.deadline && progress?.status !== 'submitted' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2">
              Time limit ends at {new Date(sessionData.deadline).toLocaleTimeString()}
            </Typography>
            <DeadlineTimer deadline={sessionData.deadline} />
          </Box>
        </Alert>
      )}
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {sessionData.quiz_title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Self-Paced Assessment
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {settings.show_timer && (
              <Chip
                icon={<TimerIcon />}
                label={formatTime(elapsedSeconds)}
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label={`${Object.keys(answers).length} / ${questions.length} answered`}
              color="info"
              variant="outlined"
            />
          </Box>
        </Box>
      </Paper>

      {/* Question Display */}
      <QuestionDisplay
        question={currentQuestion}
        currentAnswer={currentAnswer}
        onAnswerChange={handleAnswerChange}
        totalQuestions={questions.length}
        currentIndex={currentQuestionIndex}
      />

      {/* Navigation Controls */}
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<NavigateBeforeIcon />}
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ListAltIcon />}
              onClick={() => setPaletteOpen(true)}
            >
              Question Overview
            </Button>
          </Grid>

          <Grid item xs={12} sm={4}>
            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                fullWidth
                variant="contained"
                endIcon={<NavigateNextIcon />}
                onClick={handleNext}
              >
                Next
              </Button>
            ) : (
              <Button
                fullWidth
                variant="contained"
                color="success"
                onClick={handleEnterReview}
              >
                Review & Submit
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Question Palette Dialog */}
      <QuestionPalette
        questions={questions}
        currentIndex={currentQuestionIndex}
        answers={answers}
        onNavigate={handleNavigate}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </Container>
  );
};

export default QuizSPParticipant;
