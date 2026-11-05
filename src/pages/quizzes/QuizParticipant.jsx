// The student's live quiz screen: join with a room code, wait, answer each question, then leaderboard and review.
// Area: quizzes

// --- Core React Imports ---
import React, { useState, useEffect, useRef } from 'react';
import joinLogo from '../../assets/mst_logo_no_bg.png';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

// --- MUI Component Imports ---
import {
  Box,
  Button,
  Typography,
  TextField,
  Paper,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Grid,
  Fade,
  Grow,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Container,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import TimerIcon from '@mui/icons-material/Timer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LoginIcon from '@mui/icons-material/Login';
import AssignmentIcon from '@mui/icons-material/Assignment';

// --- Service Import ---
import quizService from '../../services/quizService';
import MathTextDisplay from '../../components/common/MathTextDisplay';
import { config } from '../../config';

// #62: the student's place in this quiz, kept for this tab only, so a reload,
// a restored tab or a phone that slept gets straight back in. sessionStorage
// isn't shared with other tabs or kept on a shared device, and the token never
// goes in a URL. It's cleared by "Join with a code" or a rejection, not when
// the quiz ends, so a reload on the end screen shows the end screen (SOT-4).
const PLACE_KEY = 'mst.quiz.place';
const readPlace = (roomCode) => {
  try {
    const place = JSON.parse(sessionStorage.getItem(PLACE_KEY) || 'null');
    // Only for the room in the URL, as the joining link has it.
    const same = roomCode && String(place?.roomCode).toUpperCase() === roomCode.toUpperCase();
    return same && place.session?.id && place.guestToken ? place : null;
  } catch {
    return null;
  }
};
const savePlace = (place) => {
  try {
    sessionStorage.setItem(PLACE_KEY, JSON.stringify(place));
  } catch {
    // No storage, as in some private windows: joining still works, without resume.
  }
};
// Question ids arrive from the socket as strings, so they're compared as strings.
const sameQuestion = (a, b) => a != null && b != null && String(a) === String(b);
const forgetPlace = () => {
  try {
    sessionStorage.removeItem(PLACE_KEY);
  } catch {
    // Nothing was kept.
  }
};
const SLOW = 'Still trying. Check your Wi-Fi or mobile data.';

// The join page's frame: the logo, a title, one line and the card. Getting
// back in shows in it too (design R2 #62).
const JoinFrame = ({ title, line, children }) => (
  <Container maxWidth="sm">
    <Fade in timeout={800}>
      <Box sx={{ mt: { xs: 4, md: 8 }, textAlign: 'center' }}>
        <img alt="MySmartTeach" className="mst-join-logo" src={joinLogo} />
        <Typography component="h1" variant="h1" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {line}
        </Typography>

        <Paper className="mst-rim mst-join-card" sx={{ p: { xs: 3, sm: 4 }, textAlign: 'left' }}>
          {children}
        </Paper>
      </Box>
    </Fade>
  </Container>
);

/**
 * Join Screen Component
 */
const JoinScreen = ({ onJoin }) => {
  const { roomCode: urlRoomCode } = useParams();
  const [roomCode, setRoomCode] = useState(urlRoomCode || '');
  const [guestName, setGuestName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);

  const handleJoin = async () => {
    // Validation
    if (!roomCode.trim()) {
      setError('Please enter a room code.');
      return;
    }

    if (!guestName.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!studentId.trim()) {
      setError('Please enter your student ID.');
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      // Call new joinSession API with object (supports identified guests)
      const response = await quizService.joinSession({
        room_code: roomCode.toUpperCase().trim(),
        guest_name: guestName.trim(),
        student_id: studentId.trim(),
      });

      onJoin(response);
    } catch (err) {
      console.error('Failed to join session:', err);
      setError(err.message || 'Failed to join quiz. Please check the room code.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <JoinFrame title="Join the quiz" line="Type the room code your teacher shows you.">
      <TextField
        fullWidth
        label="Room code"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        placeholder="ABC123"
        sx={{ mb: 3 }}
        inputProps={{
          style: {
            fontSize: '2rem',
            textAlign: 'center',
            letterSpacing: 8,
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
          },
          maxLength: 6,
        }}
        autoFocus={!urlRoomCode}
      />

      <TextField
        fullWidth
        label="Your name"
        autoFocus={Boolean(urlRoomCode)}
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        placeholder="e.g., John Doe"
        sx={{ mb: 3 }}
      />

      <TextField
        fullWidth
        label="Student ID"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        placeholder="e.g., 12345"
        sx={{ mb: 3 }}
        onKeyPress={(e) => {
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
        disabled={isJoining || !roomCode.trim() || !guestName.trim()}
        startIcon={isJoining ? <CircularProgress size={20} /> : <LoginIcon />}
        sx={{ py: 1.5, fontSize: 16, minHeight: 48 }}
      >
        {isJoining ? 'Joining…' : 'Join quiz'}
      </Button>
    </JoinFrame>
  );
};

/**
 * Waiting Room Component
 */
const WaitingRoom = ({ session, participantName }) => {
  return (
    <Container maxWidth="md">
      <Fade in timeout={800}>
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <HourglassEmptyIcon sx={{ fontSize: 56, color: 'primary.light', mb: 2 }} />
          <Typography variant="h3" sx={{ mb: 2, fontWeight: 600 }}>
            Welcome, {participantName}!
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
            Waiting for the quiz to start...
          </Typography>

          <Paper sx={{ p: 4, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quiz: {session.quiz_title}
            </Typography>
            <Typography color="text.secondary">
              Room Code: <strong style={{ fontSize: '1.5rem', letterSpacing: 4 }}>{session.room_code}</strong>
            </Typography>
          </Paper>

          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Your teacher will start the quiz soon
          </Typography>
        </Box>
      </Fade>
    </Container>
  );
};

/**
 * Question Display Component
 */
const QuestionDisplay = ({
  question,
  onAnswer,
  timeRemaining,
  cooldownRemaining,
  autoAdvanceEnabled,
  totalQuestions,
  cooldownFeedback,
  awaitingNextQuestion,
  answered = false,
  savedAnswer,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  // #62: submitted here, or the server already has this student's answer, as
  // after a reload (S3.4).
  const submitted = isSubmitted || answered;

  // FIX: Reset state when question changes (allows answering new questions)
  useEffect(() => {
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setTimeExpired(false);
  }, [question.id]); // Reset when question ID changes

  // #62: after a reload, the answer this tab sent is marked again. This comes
  // after the reset, so the reset can't clear it (S3.4).
  useEffect(() => {
    if (answered && savedAnswer != null) setSelectedAnswer(savedAnswer);
  }, [answered, savedAnswer]);

  // FIX Issue 1: Detect when time expires
  useEffect(() => {
    if (timeRemaining <= 0 && !submitted) {
      setTimeExpired(true);
      setSelectedAnswer(null); // Clear any selection
    }
  }, [timeRemaining, submitted]);

  const handleSelect = (answerIndex) => {
    if (!submitted && !timeExpired) {
      setSelectedAnswer(answerIndex);
    }
  };

  const handleSubmit = () => {
    if (submitted || timeExpired) return;

    let answerToSubmit = null;

    if (question.type === 'multiple_choice' || question.type === 'poll') {
      // Answer is an index number
      if (selectedAnswer === null) return;
      answerToSubmit = selectedAnswer;
    } else if (question.type === 'true_false') {
      // Answer is a boolean
      if (selectedAnswer === null) return;
      answerToSubmit = selectedAnswer;
    } else if (question.type === 'short_answer') {
      // Answer is a string
      if (!selectedAnswer || selectedAnswer.trim() === '') return;
      answerToSubmit = selectedAnswer.trim();
    }

    setIsSubmitted(true);
    onAnswer(answerToSubmit);
  };

  const getProgressColor = () => {
    if (timeRemaining > 15) return 'success';
    if (timeRemaining > 5) return 'warning';
    return 'error';
  };

  const showCooldown =
    (awaitingNextQuestion || cooldownRemaining > 0 || cooldownRemaining === -1) && timeRemaining === 0;

  return (
    <Container
      maxWidth="md"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        py: { xs: 2, md: 4 },
        px: { xs: 2, md: 3 },
      }}
    >
      <Fade in timeout={500}>
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', overflowY: 'auto' }}>
          {/* FIX: Timer - Show question timer or cooldown timer with proper conditions */}
          {showCooldown ? (
            // Cooldown Timer with Answer Feedback - ENHANCED
            <Box sx={{ textAlign: 'center', mb: 2, flexShrink: 0 }}>
              <Paper
                elevation={8}
                sx={{
                  py: 3,
                  px: 4,
                  textAlign: 'center',
                  bgcolor: cooldownFeedback
                    ? cooldownFeedback.grading_status === 'pending'
                      ? 'action.selected'
                      : cooldownFeedback.is_correct
                        ? 'success.light'
                        : cooldownFeedback.did_not_answer
                          ? 'action.hover'
                          : 'error.light'
                    : 'action.selected',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  transition: 'all 0.3s ease-in-out',
                }}
              >
                {/* Answer Feedback (if available) */}
                {cooldownFeedback && (
                  <Fade in timeout={500}>
                    <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid var(--mst-border)' }}>
                      {cooldownFeedback.grading_status === 'pending' ? (
                        <>
                          <CircularProgress sx={{ color: 'text.primary', mb: 2 }} size={60} />
                          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                            Answer Submitted!
                          </Typography>
                          <Typography variant="body1">
                            {cooldownFeedback.message || 'Your short answer is being graded...'}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 2, opacity: 0.9 }}>
                            Results will appear shortly
                          </Typography>
                        </>
                      ) : cooldownFeedback.did_not_answer ? (
                        <>
                          <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                            Time's Up!
                          </Typography>
                          <Typography variant="h6" sx={{ opacity: 0.9 }}>
                            You didn't submit an answer
                          </Typography>
                        </>
                      ) : cooldownFeedback.is_correct ? (
                        <>
                          <CheckCircleIcon sx={{ fontSize: 60, mb: 1 }} />
                          <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                            Correct!
                          </Typography>
                          <Typography variant="h6" sx={{ opacity: 0.9 }}>
                            +{cooldownFeedback.points_earned} points
                          </Typography>

                          {cooldownFeedback.ai_feedback && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                Feedback: <MathTextDisplay text={cooldownFeedback.ai_feedback} />
                              </Typography>
                            </Box>
                          )}

                          {!cooldownFeedback.ai_feedback && cooldownFeedback.explanation && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                <MathTextDisplay text={cooldownFeedback.explanation} />
                              </Typography>
                            </Box>
                          )}
                        </>
                      ) : (
                        <>
                          <CancelIcon sx={{ fontSize: 60, mb: 1 }} />
                          <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                            Incorrect
                          </Typography>
                          <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
                            +{cooldownFeedback.points_earned} points
                          </Typography>

                          {cooldownFeedback.ai_feedback && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                Feedback: <MathTextDisplay text={cooldownFeedback.ai_feedback} />
                              </Typography>
                            </Box>
                          )}

                          {cooldownFeedback.correct_answer && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Correct Answer:
                              </Typography>
                              <Typography variant="body1">
                                {Array.isArray(cooldownFeedback.correct_answer)
                                  ? cooldownFeedback.correct_answer
                                      .map((ans, idx) =>
                                        typeof ans === 'number' ? question.options?.[ans] || ans : String(ans)
                                      )
                                      .join(', ')
                                  : String(cooldownFeedback.correct_answer)}
                              </Typography>
                            </Box>
                          )}

                          {!cooldownFeedback.ai_feedback && cooldownFeedback.explanation && (
                            <Box sx={{ mt: 1, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                <MathTextDisplay text={cooldownFeedback.explanation} />
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}
                    </Box>
                  </Fade>
                )}

                {cooldownRemaining == -1 ? (
                  <>
                    <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                      Waiting for Teacher
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      The next question will start when your teacher advances
                    </Typography>
                  </>
                ) : cooldownRemaining > 0 ? (
                  <>
                    {/* Countdown Timer */}
                    <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                      Get Ready!
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                      Next Question Starting In
                    </Typography>
                    <Typography variant="h1" sx={{ fontWeight: 600, fontSize: '4rem' }}>
                      {cooldownRemaining}
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      seconds
                    </Typography>
                  </>
                ) : (
                  <>
                    <CircularProgress sx={{ color: 'text.primary', mb: 2 }} size={48} />
                    <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                      Preparing Next Question
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      Please wait while grading completes
                    </Typography>
                  </>
                )}
              </Paper>
            </Box>
          ) : timeRemaining > 0 || question.time_limit_seconds > 0 ? (
            // Question Timer - Compact display when timer is active
            <Box sx={{ flexShrink: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
                <TimerIcon sx={{ mr: 1, color: getProgressColor() }} />
                <Typography variant="h5" color={`${getProgressColor()}.main`} sx={{ fontWeight: 600 }}>
                  {timeRemaining}s
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(timeRemaining / question.time_limit_seconds) * 100}
                color={getProgressColor()}
                sx={{ height: 6, borderRadius: 1, mb: 2 }}
              />
            </Box>
          ) : null}

          {/* Question and Options - Hide during cooldown for cleaner display */}
          {!showCooldown && (
            <>
              {/* Question - Compact version */}
              <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2, textAlign: 'center', flexShrink: 0 }}>
                <Chip
                  label={
                    totalQuestions
                      ? `Question ${question.order_index + 1} of ${totalQuestions}`
                      : `Question ${question.order_index + 1}`
                  }
                  color="primary"
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 600, mb: 0.5, fontSize: { xs: '1.25rem', md: '1.5rem' } }}
                  component="div"
                >
                  <MathTextDisplay text={question.text} />
                </Typography>

                {/* Question Image */}
                {question.media_url && (
                  <Box sx={{ my: 2, textAlign: 'center' }}>
                    <img
                      src={`${config.apiBaseUrl}${question.media_url}`}
                      alt="Question visual"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 400,
                        borderRadius: 8,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    />
                  </Box>
                )}
                <Typography variant="body2" color="text.secondary">
                  {question.points} points
                </Typography>
              </Paper>

              {/* Answer Options - Compact rendering based on question type */}
              {(question.type === 'multiple_choice' || question.type === 'poll') && question.options && (
                <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 2, flexShrink: 0 }}>
                  {question.options.map((option, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Grow in timeout={200 * (index + 1)}>
                        <Button
                          fullWidth
                          variant={selectedAnswer === index ? 'contained' : 'outlined'}
                          size="large"
                          onClick={() => handleSelect(index)}
                          disabled={submitted || timeExpired}
                          sx={{
                            py: { xs: 2, md: 1.5 },
                            minHeight: { xs: '56px', md: '48px' },
                            fontSize: { xs: '1rem', md: '1rem' },
                            textTransform: 'none',
                            borderWidth: 2,
                            whiteSpace: 'normal',
                            textAlign: 'left',
                            justifyContent: 'flex-start',
                            '&:hover': {
                              borderWidth: 2,
                              transform: 'scale(1.02)',
                              transition: 'transform 0.2s',
                            },
                          }}
                        >
                          <Typography variant="h6" component="div">
                            <MathTextDisplay text={option} />
                          </Typography>
                        </Button>
                      </Grow>
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* True/False Buttons - Compact */}
              {question.type === 'true_false' && (
                <Grid container spacing={{ xs: 2, md: 2 }} sx={{ maxWidth: 500, mx: 'auto', mb: 2, flexShrink: 0 }}>
                  <Grid item xs={6}>
                    <Grow in timeout={200}>
                      <Button
                        fullWidth
                        variant={selectedAnswer === true ? 'contained' : 'outlined'}
                        size="large"
                        color={selectedAnswer === true ? 'success' : 'primary'}
                        onClick={() => handleSelect(true)}
                        disabled={submitted || timeExpired}
                        sx={{
                          py: { xs: 2.5, md: 2 },
                          minHeight: { xs: '56px', md: '48px' },
                          fontSize: { xs: '1.1rem', md: '1.2rem' },
                          fontWeight: 600,
                          borderWidth: 2,
                          '&:hover': { borderWidth: 2, transform: 'scale(1.05)', transition: 'transform 0.2s' },
                        }}
                      >
                        True
                      </Button>
                    </Grow>
                  </Grid>
                  <Grid item xs={6}>
                    <Grow in timeout={300}>
                      <Button
                        fullWidth
                        variant={selectedAnswer === false ? 'contained' : 'outlined'}
                        size="large"
                        color={selectedAnswer === false ? 'error' : 'primary'}
                        onClick={() => handleSelect(false)}
                        disabled={submitted || timeExpired}
                        sx={{
                          py: { xs: 2.5, md: 2 },
                          minHeight: { xs: '56px', md: '48px' },
                          fontSize: { xs: '1.1rem', md: '1.2rem' },
                          fontWeight: 600,
                          borderWidth: 2,
                          '&:hover': { borderWidth: 2, transform: 'scale(1.05)', transition: 'transform 0.2s' },
                        }}
                      >
                        False
                      </Button>
                    </Grow>
                  </Grid>
                </Grid>
              )}

              {/* Short Answer Text Field - Compact */}
              {question.type === 'short_answer' && (
                <Grow in timeout={200}>
                  <Box sx={{ maxWidth: 600, mx: 'auto', mb: 2, flexShrink: 0 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      variant="outlined"
                      placeholder="Type your answer here..."
                      value={
                        typeof selectedAnswer === 'string' || typeof selectedAnswer === 'number' ? selectedAnswer : ''
                      }
                      onChange={(e) => setSelectedAnswer(e.target.value)}
                      disabled={submitted || timeExpired}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          fontSize: '1rem',
                          backgroundColor: 'background.paper',
                        },
                      }}
                      autoFocus
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Your answer will be checked against the correct keywords
                    </Typography>
                  </Box>
                </Grow>
              )}
            </>
          )}

          {/* Submit Button - Compact, show for all question types when answer is valid */}
          {!submitted &&
            !timeExpired &&
            selectedAnswer !== null &&
            selectedAnswer !== '' &&
            (question.type !== 'short_answer' ||
              (typeof selectedAnswer === 'string' && selectedAnswer.trim() !== '')) && (
              <Fade in>
                <Box sx={{ textAlign: 'center', mt: 2, mb: 2, flexShrink: 0 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSubmit}
                    disabled={timeExpired}
                    sx={{
                      px: { xs: 4, md: 6 },
                      py: { xs: 2, md: 1.5 },
                      minHeight: { xs: '56px', md: '48px' },
                      fontSize: { xs: '1.1rem', md: '1.1rem' },
                      fontWeight: 600,
                      width: { xs: '100%', sm: 'auto' },
                      maxWidth: { xs: '100%', sm: '300px' },
                    }}
                  >
                    Submit Answer
                  </Button>
                </Box>
              </Fade>
            )}

          {/* FIX: Show appropriate message based on state - Compact */}
          {showCooldown ? null : submitted && timeRemaining > 0 ? ( // During cooldown period - Hide question/options, show prominent cooldown
            // Submitted but timer still running
            <Fade in>
              <Alert severity="success" sx={{ mt: 1, flexShrink: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Answer submitted
                </Typography>
                <Typography variant="body2">Waiting for other participants...</Typography>
              </Alert>
            </Fade>
          ) : timeExpired && !submitted && cooldownRemaining === 0 ? (
            // Time expired, no cooldown, not submitted
            <Fade in>
              <Alert severity="warning" sx={{ mt: 1, flexShrink: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  ⏰ Time's up!
                </Typography>
                <Typography variant="body2">Waiting for next question...</Typography>
              </Alert>
            </Fade>
          ) : null}
        </Box>
      </Fade>
    </Container>
  );
};

/**
 * Results/Leaderboard Component
 */
const LeaderboardDisplay = ({ leaderboard, participantId }) => {
  const currentParticipant = leaderboard.find((p) => p.participant_id === participantId);
  const currentRank = leaderboard.findIndex((p) => p.participant_id === participantId) + 1;

  return (
    <Container maxWidth="md">
      <Fade in timeout={800}>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h3" sx={{ textAlign: 'center', mb: 4, fontWeight: 600 }}>
            Leaderboard
          </Typography>

          {/* Current Participant Status */}
          {currentParticipant && (
            <Paper
              sx={{
                p: 3,
                mb: 4,
                textAlign: 'center',
                bgcolor: 'action.selected',
                color: 'text.primary',
              }}
            >
              <Typography variant="h6" gutterBottom>
                Your Position
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 600 }}>
                #{currentRank}
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                {currentParticipant.score} points
              </Typography>
            </Paper>
          )}

          {/* Top Players */}
          <List>
            {leaderboard.slice(0, 5).map((participant, index) => (
              <Grow in timeout={200 * (index + 1)} key={participant.participant_id}>
                <ListItem
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor: participant.participant_id === participantId ? 'action.selected' : 'action.hover',
                    border: 2,
                    borderColor: index < 3 ? 'warning.main' : 'divider',
                    boxShadow: participant.participant_id === participantId ? 4 : 1,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor:
                          index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'primary.main',
                        width: 56,
                        height: 56,
                        fontSize: '1.5rem',
                        fontWeight: 600,
                      }}
                    >
                      {index < 3 ? <EmojiEventsIcon fontSize="large" /> : index + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {participant.display_name}
                        {participant.participant_id === participantId && ' (You)'}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Chip label={`${participant.score} pts`} size="small" color="primary" />
                        <Chip label={`${participant.correct_answers} correct`} size="small" color="success" />
                        <Chip label={`${(participant.total_time_ms / 1000).toFixed(1)}s`} size="small" />
                      </Box>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </ListItem>
              </Grow>
            ))}
          </List>
        </Box>
      </Fade>
    </Container>
  );
};

/**
 * Answer Review Component
 */
const AnswerReviewDisplay = ({ sessionId, guestToken, onViewLeaderboard }) => {
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await quizService.getMyAnswerReview(sessionId, guestToken);
        setReviewData(data);
      } catch (err) {
        setError(err.message || 'Failed to load answer review.');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId && guestToken) {
      fetchReview();
    }
  }, [sessionId, guestToken]);

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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 4,
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 600 }}>
              Your Results
            </Typography>
            <Button variant="contained" color="primary" onClick={onViewLeaderboard}>
              View Leaderboard
            </Button>
          </Box>

          <Paper
            sx={{
              p: 3,
              mb: 4,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              color: 'text.primary',
            }}
          >
            <Typography variant="h5" gutterBottom>
              Score Summary
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 600 }}>
              {reviewData.marking_pending
                ? 'Marking pending'
                : `${reviewData.total_score} / ${reviewData.max_possible_score}`}
            </Typography>
            <Typography variant="h6">
              {reviewData.marking_pending
                ? 'Your total will appear when marking is complete.'
                : `${reviewData.correct_count} out of ${reviewData.total_questions} correct`}
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
                <Card
                  sx={{
                    mb: 3,
                    border: 2,
                    borderColor: isCorrect ? 'success.main' : isIncorrect ? 'error.main' : 'divider',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                      <Chip label={`Question ${review.question_number}`} color="primary" size="small" />
                      <Chip
                        label={
                          review.question_type === 'poll'
                            ? 'Poll · Not scored'
                            : review.marking_status === 'pending'
                              ? 'Marking pending'
                              : `${review.points_earned} / ${review.max_points} pts`
                        }
                        color={isCorrect ? 'success' : isIncorrect ? 'error' : 'default'}
                        icon={isCorrect ? <CheckCircleIcon /> : isIncorrect ? <CancelIcon /> : undefined}
                      />
                    </Box>

                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }} component="div">
                      <MathTextDisplay text={review.question_text} />
                    </Typography>
                    {review.media_url && (
                      <Box sx={{ mb: 2, textAlign: 'center' }}>
                        <img
                          src={`${config.apiBaseUrl}${review.media_url}`}
                          alt="Question visual"
                          style={{
                            maxWidth: '100%',
                            maxHeight: 300,
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          }}
                        />
                      </Box>
                    )}

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
                                    : 'transparent',
                              }}
                            >
                              <ListItemText
                                primary={<MathTextDisplay text={option} />}
                                secondary={
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                    {isStudentAnswer && <Chip label="Your Answer" size="small" />}
                                    {isCorrectAnswer && <Chip label="Correct Answer" size="small" color="success" />}
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
                          Your Answer: <MathTextDisplay text={studentAnswerText || 'No answer'} />
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Correct Answer: <MathTextDisplay text={correctAnswerText || 'N/A'} />
                        </Typography>
                      </Box>
                    )}

                    {review.explanation && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          Explanation: <MathTextDisplay text={review.explanation} />
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
            <Button variant="outlined" size="large" onClick={onViewLeaderboard}>
              Back to Leaderboard
            </Button>
          </Box>
        </Box>
      </Fade>
    </Container>
  );
};

/**
 * Main Quiz Participant Component
 */
const QuizParticipant = () => {
  const { roomCode: urlRoomCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // #62: this tab's saved place, if it's this room's, and the reconnect state.
  const [initialPlace] = useState(() => readPlace(urlRoomCode));
  const retryRef = useRef(null);
  const reconnectRef = useRef(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [slow, setSlow] = useState(false);

  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const leaderboardTimerRef = useRef(null); // FIX: Store leaderboard auto-advance timeout ID
  const cooldownTimerRef = useRef(null); // FIX: Store cooldown timer ID for cleanup
  const resyncTimerRef = useRef(null); // FIX: Store resync timer ID

  const [phase, setPhase] = useState(initialPlace ? 'rejoining' : 'join');
  const [showAnswerReview, setShowAnswerReview] = useState(false);
  const [showResultFeedback, setShowResultFeedback] = useState(true);
  const [showLeaderboardToStudents, setShowLeaderboardToStudents] = useState(true);
  // join, rejoining, waiting, question, leaderboard, finished, rejected
  const [session, setSession] = useState(initialPlace?.session ?? null);
  const [participant, setParticipant] = useState(initialPlace?.participant ?? null);
  const [guestToken, setGuestToken] = useState(initialPlace?.guestToken ?? null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [error, setError] = useState(null);

  // FIX: Timestamp-based synchronization state
  const [questionExpiresAt, setQuestionExpiresAt] = useState(null); // Server timestamp when timer expires
  const [cooldownEndsAt, setCooldownEndsAt] = useState(null); // Server timestamp when cooldown ends

  // FIX Issue 2: Auto-advance state
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(10);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [awaitingNextQuestion, setAwaitingNextQuestion] = useState(false);
  // #62: the question the server says this student has answered, from the
  // resume sync's answer_submitted (S3.4).
  const [answeredQuestionId, setAnsweredQuestionId] = useState(null);

  // NEW: Store answer feedback for cooldown display
  const [cooldownFeedback, setCooldownFeedback] = useState(null);
  // cooldownFeedback structure:
  // {
  //   grading_status: "pending" | "complete",
  //   is_correct: boolean,
  //   points_earned: number,
  //   correct_answer: [...],  // optional
  //   explanation: string,    // optional
  //   ai_feedback: string,    // optional
  //   message: string,        // optional
  //   did_not_answer: boolean // optional
  // }

  // FIX #3: Cleanup WebSocket and ALL timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup WebSocket
      if (wsRef.current) {
        if (wsRef.current.readyState !== WebSocket.CLOSED) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }

      // Cleanup timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Cleanup leaderboard timer
      if (leaderboardTimerRef.current) {
        clearTimeout(leaderboardTimerRef.current);
        leaderboardTimerRef.current = null;
      }

      // FIX: Cleanup cooldown timer
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }

      // FIX: Cleanup resync timer
      if (resyncTimerRef.current) {
        clearInterval(resyncTimerRef.current);
        resyncTimerRef.current = null;
      }
    };
  }, []);

  // #62: a saved place resumes through the socket, not /join, so it doesn't
  // use up the per-IP join limit. A dropped socket also retries at once when
  // the device is back online or the tab is shown again.
  useEffect(() => {
    if (initialPlace) connectWebSocket(initialPlace.session.id, initialPlace.guestToken);
    const retry = () => {
      if (document.visibilityState === 'visible') reconnectRef.current();
    };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', retry);
    return () => {
      clearTimeout(retryRef.current);
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', retry);
    };
  }, []);

  // After 8 s of trying, the Wi-Fi line (design R2 #62, steps 4 and 5).
  const trying = phase === 'rejoining' || reconnecting;
  useEffect(() => {
    setSlow(false);
    if (!trying) return undefined;
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [trying]);

  const handleJoin = (joinResponse) => {
    setSession(joinResponse.session);
    setParticipant(joinResponse.participant);
    setGuestToken(joinResponse.guest_token);
    // #62: keep this tab's place. A reload resumes only when the URL has this
    // room's code, as a joining link does, so a typed code goes into it too.
    const code = joinResponse.session.room_code;
    savePlace({
      roomCode: code,
      session: joinResponse.session,
      participant: joinResponse.participant,
      guestToken: joinResponse.guest_token,
    });
    if (urlRoomCode?.toUpperCase() !== code.toUpperCase()) {
      navigate(`/quiz/join/${code}`, { replace: true });
    }
    setPhase('waiting');

    // Connect WebSocket
    connectWebSocket(joinResponse.session.id, joinResponse.guest_token);
  };

  const connectWebSocket = (sessionId, token) => {
    try {
      const ws = quizService.connectWebSocket(sessionId, token, false);
      wsRef.current = ws;
      let heard = false; // #62: whether this socket has had a message yet

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        // #62: any message means the student is in, at the quiz's current place.
        heard = true;
        setReconnecting(false);
        setPhase((current) => (current === 'rejoining' ? 'waiting' : current));
        handleWebSocketMessage(message);
      };

      ws.onerror = (error) => {
        console.error('[QuizParticipant] ❌ WebSocket error:', error);
      };

      ws.onclose = (event) => {
        if (wsRef.current !== ws) return; // closed on purpose, or already replaced
        if (event.code === 1008 && !heard) {
          // #62: the server refused the saved place before letting the student
          // in, for example because the quiz closed. Its heartbeat timeout also
          // closes with 1008, but after messages, and that one reconnects.
          forgetPlace();
          setReconnecting(false);
          setPhase('rejected');
          return;
        }
        scheduleReconnect();
      };
    } catch (err) {
      console.error('[QuizParticipant] Failed to connect WebSocket:', err);
      setError('Failed to establish real-time connection.');
    }
  };

  // #62 (A5): a dropped socket retries every 3 s, as the host page does. Never
  // before joining, after a rejection or on the final screen.
  const reconnectNow = () => {
    clearTimeout(retryRef.current);
    if (!guestToken || ['join', 'rejected', 'finished'].includes(phase)) {
      setReconnecting(false);
      return;
    }
    if (!wsRef.current || wsRef.current.readyState > WebSocket.OPEN) {
      connectWebSocket(session.id, guestToken);
    }
  };
  reconnectRef.current = reconnectNow; // the latest state, for timers and listeners
  const scheduleReconnect = () => {
    setReconnecting(true);
    clearTimeout(retryRef.current);
    retryRef.current = setTimeout(() => reconnectRef.current(), 3000);
  };

  const refetchResponseForQuestion = async (questionId) => {
    if (!session?.id || !guestToken) {
      return;
    }

    try {
      const response = await quizService.getMyResponse(session.id, questionId, guestToken);

      if (response?.grading_status === 'pending') {
        setCooldownFeedback({
          grading_status: 'pending',
          message: response.message || 'Your answer has been submitted!',
          did_not_answer: false,
        });
        return;
      }

      setCooldownFeedback({
        is_correct: response?.is_correct,
        points_earned: response?.points_earned || 0,
        correct_answer: response?.correct_answer,
        explanation: response?.explanation,
        ai_feedback: response?.ai_feedback,
        did_not_answer: false,
        grading_status: response?.grading_status || 'complete',
      });
    } catch (error) {
      console.error('[AI Grading] Failed to fetch updated response:', error);
    }
  };

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'session_started':
        setPhase('waiting');
        setAwaitingNextQuestion(false);
        break;

      case 'question_started':
        // A new question replaces the leaderboard, so its timer back to the
        // waiting room is cancelled, as on session_ended (#62: a resumed
        // socket's first sync can show the leaderboard just before the question).
        if (leaderboardTimerRef.current) {
          clearTimeout(leaderboardTimerRef.current);
          leaderboardTimerRef.current = null;
        }

        // FIX: Clear cooldown state when new question starts
        setCooldownEndsAt(null);
        setCooldownRemaining(0);
        setCooldownFeedback(null); // NEW: Reset feedback for new question
        setAwaitingNextQuestion(false);

        // FIX: Set question with timestamp synchronization
        setCurrentQuestion(message.question);
        setQuestionExpiresAt(message.expires_at); // Server timestamp when timer expires
        setPhase('question');

        // FIX: Start timestamp-based timer
        startTimestampTimer(message.expires_at, message.question.time_limit_seconds);
        break;

      case 'leaderboard_update':
        setLeaderboard(message.leaderboard || []);
        setAwaitingNextQuestion(false);

        // FIX Issue 1: Only show leaderboard if session is active
        // Don't show it on join (when session is still 'waiting')
        if (session?.status === 'active') {
          setPhase('leaderboard');

          // Clear any existing leaderboard timer
          if (leaderboardTimerRef.current) {
            clearTimeout(leaderboardTimerRef.current);
          }

          // Auto-advance to next question after 10 seconds
          leaderboardTimerRef.current = setTimeout(() => {
            setPhase('waiting');
          }, 10000);
        }
        break;

      case 'session_ended':
        // FIX Issue 3: Clear leaderboard timer to prevent switching back to waiting
        if (leaderboardTimerRef.current) {
          clearTimeout(leaderboardTimerRef.current);
          leaderboardTimerRef.current = null;
        }

        setShowResultFeedback(message.show_result_feedback ?? true);
        setShowLeaderboardToStudents(message.show_leaderboard ?? true);
        setAwaitingNextQuestion(false);

        setPhase('finished');
        break;

      case 'auto_advance_updated':
        // FIX Issue 2: Auto-advance setting changed
        setAutoAdvanceEnabled(message.enabled);
        setCooldownSeconds(message.cooldown_seconds);
        break;

      case 'question_ended':
        // FIX: Question ended, cooldown starting with timestamp synchronization
        setTimeRemaining(0);
        setQuestionExpiresAt(null); // Clear question timer
        setAutoAdvanceEnabled(message.auto_advance_enabled);
        setCooldownEndsAt(message.cooldown_ends_at); // Set cooldown end timestamp
        setAwaitingNextQuestion(true);
        if (message.auto_advance_enabled) {
          startCooldownTimer(message.cooldown_ends_at, message.cooldown_seconds);
        } else {
          setCooldownRemaining(-1);
        }
        break;

      case 'answer_submitted':
        // NEW: Store answer result when student submits
        if (message.result) {
          setAnsweredQuestionId(message.result.question_id ?? null);
          if (message.result.grading_status === 'pending') {
            setCooldownFeedback({
              grading_status: 'pending',
              message: message.result.message || 'Your answer has been submitted!',
              did_not_answer: false,
            });
          } else {
            setCooldownFeedback({
              ...message.result,
              grading_status: 'complete',
            });
          }
        }
        break;

      case 'cooldown_started':
        // FIX: Cooldown started from backend with timestamp synchronization
        // NEW: Store feedback if provided (when show_correct_answer_during_cooldown is enabled)
        setCooldownSeconds(message.cooldown_seconds);
        setAutoAdvanceEnabled(message.auto_advance_enabled);
        setCooldownEndsAt(message.cooldown_ends_at); // Set cooldown end timestamp
        setAwaitingNextQuestion(true);

        // NEW: Store cooldown feedback if provided
        if (message.your_answer) {
          if (message.your_answer.is_correct === null && !message.your_answer.did_not_answer) {
            setCooldownFeedback((prev) =>
              prev?.grading_status === 'pending'
                ? prev
                : {
                    grading_status: 'pending',
                    message: 'Your answer has been submitted!',
                    did_not_answer: false,
                  }
            );
          } else {
            setCooldownFeedback({
              ...message.your_answer,
              grading_status: 'complete',
            });
          }
        } else {
          setCooldownFeedback(null);
        }

        if (message.auto_advance_enabled) {
          startCooldownTimer(message.cooldown_ends_at, message.cooldown_seconds);
        } else {
          setCooldownRemaining(-1);
        }
        break;

      case 'ping':
        // Respond to heartbeat
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'pong' }));
        }
        break;

      case 'ai_grading_complete':
        if (message.question_id) {
          refetchResponseForQuestion(message.question_id);
        }
        break;

      default:
        console.warn('[QuizParticipant] Unknown message type:', message.type);
    }
  };

  /**
   * FIX: Timestamp-based timer for question countdown
   * Uses server timestamp to calculate remaining time, eliminating desync
   */
  // Issue #4 Fix: Client-side timer for UX display only
  // Server enforces time limits using question_started_at timestamp
  // Timer is synchronized with server timestamp to prevent local clock manipulation
  const startTimestampTimer = (expiresAtISO, fallbackDuration) => {
    // Clear existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (resyncTimerRef.current) {
      clearInterval(resyncTimerRef.current);
      resyncTimerRef.current = null;
    }

    // Parse server expiration timestamp
    const expiresAt = expiresAtISO ? new Date(expiresAtISO) : null;

    if (!expiresAt || isNaN(expiresAt.getTime())) {
      console.warn('[QuizParticipant] Invalid expires_at timestamp, using fallback');
      // Fallback to old behavior if timestamp is invalid
      let remaining = fallbackDuration;
      setTimeRemaining(remaining);
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setTimeRemaining(Math.max(0, remaining));
        if (remaining <= 0) clearInterval(timerRef.current);
      }, 1000);
      return;
    }

    // Calculate remaining time based on server timestamp
    const calculateRemaining = () => {
      const now = new Date();
      const remaining = Math.ceil((expiresAt - now) / 1000);
      return Math.max(0, remaining);
    };

    // Update immediately
    setTimeRemaining(calculateRemaining());

    // Update every 100ms for smooth countdown (will show whole seconds)
    timerRef.current = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 100); // Update every 100ms for responsiveness

    // ✅ FIX #1: Removed aggressive 5-second resync that caused timer jumps
    // The 100ms interval already recalculates from server timestamp, so no additional resync needed
  };

  /**
   * FIX: Timestamp-based cooldown timer
   * Uses server timestamp to calculate remaining cooldown time
   */
  const startCooldownTimer = (cooldownEndsAtISO, fallbackDuration) => {
    // Clear existing cooldown timer
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }

    // Parse server cooldown end timestamp
    const endsAt = cooldownEndsAtISO ? new Date(cooldownEndsAtISO) : null;

    if (!endsAt || isNaN(endsAt.getTime())) {
      console.warn('[QuizParticipant] Invalid cooldown_ends_at timestamp, using fallback');
      // Fallback to old behavior
      let remaining = fallbackDuration;
      setCooldownRemaining(remaining);
      cooldownTimerRef.current = setInterval(() => {
        remaining -= 1;
        setCooldownRemaining(Math.max(0, remaining));
        if (remaining <= 0) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }
      }, 1000);
      return;
    }

    // Calculate remaining cooldown time
    const calculateRemaining = () => {
      const now = new Date();
      const remaining = Math.ceil((endsAt - now) / 1000);
      return Math.max(0, remaining);
    };

    // Update immediately
    setCooldownRemaining(calculateRemaining());

    // Update every 100ms for smooth countdown
    cooldownTimerRef.current = setInterval(() => {
      const remaining = calculateRemaining();
      setCooldownRemaining(remaining);

      if (remaining <= 0) {
        setCooldownRemaining(0);
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    }, 100); // Update every 100ms
  };

  const handleAnswer = async (answer) => {
    if (phase === 'finished') {
      return;
    }

    try {
      const timeTaken = (currentQuestion.time_limit_seconds - timeRemaining) * 1000;

      // Format answer as array based on question type
      let formattedAnswer;
      if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'poll') {
        formattedAnswer = [answer]; // Index number
      } else if (currentQuestion.type === 'true_false') {
        formattedAnswer = [answer]; // Boolean
      } else if (currentQuestion.type === 'short_answer') {
        formattedAnswer = [answer]; // String
      } else {
        formattedAnswer = [answer]; // Fallback
      }

      // Issue #4 Fix: time_taken_ms is for display only
      // Server calculates actual time from question_started_at timestamp
      // This prevents timing manipulation attacks via browser DevTools
      const result = await quizService.submitAnswer(
        session.id,
        {
          question_id: currentQuestion.id,
          answer: formattedAnswer,
          time_taken_ms: timeTaken, // Display-only, server validates actual time
        },
        guestToken
      );

      // #62: keep the answer with this tab's place, so a reload can mark it (S3.4).
      const place = readPlace(session.room_code);
      if (place) savePlace({ ...place, answer: { questionId: currentQuestion.id, value: answer } });

      if (result?.grading_status === 'pending') {
        setCooldownFeedback({
          grading_status: 'pending',
          message: result.message || 'Your answer has been submitted!',
          did_not_answer: false,
        });
      } else {
        setCooldownFeedback({
          is_correct: result?.is_correct,
          points_earned: result?.points_earned || 0,
          correct_answer: result?.correct_answer,
          explanation: result?.explanation,
          ai_feedback: result?.ai_feedback,
          did_not_answer: false,
          grading_status: 'complete',
        });
      }

      // FIX Issue 1: Do NOT clear timer - it should continue running until time expires
      // This allows all students to see the same countdown and cooldown timing
    } catch (err) {
      console.error('[QuizParticipant] ❌ Failed to submit answer:', err);
      setError(err.message || 'Failed to submit answer.');
    }
  };

  // #62 (A5): while the socket reconnects, a slim note shows above the current
  // screen. Every screen below is wrapped the same way, so the note coming and
  // going never remounts the screen, and an answer being typed is kept.
  const withNote = (screen) => (
    <>
      {reconnecting && phase !== 'finished' && (
        <Container maxWidth="md" sx={{ pt: 2 }}>
          <Alert severity={slow ? 'warning' : 'info'}>{slow ? `Reconnecting… ${SLOW}` : 'Reconnecting…'}</Alert>
        </Container>
      )}
      {screen}
    </>
  );

  if (phase === 'rejoining') {
    const name = participant?.guest_name || participant?.display_name;
    return (
      <JoinFrame
        title="Getting you back in…"
        line={[name, `Room ${initialPlace.roomCode}`].filter(Boolean).join(' · ')}
      >
        <LinearProgress aria-label="Getting you back in" />
        {slow && (
          <Typography variant="body2" color="text.primary" sx={{ mt: 2, textAlign: 'center' }}>
            {SLOW}
          </Typography>
        )}
      </JoinFrame>
    );
  }

  if (phase === 'rejected') {
    return (
      <JoinFrame
        title="Couldn't get you back in"
        line="This quiz may have closed. Join again with the code, or ask your teacher."
      >
        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={() => {
            forgetPlace();
            setPhase('join');
          }}
          sx={{ minHeight: 48 }}
        >
          Join with a code
        </Button>
      </JoinFrame>
    );
  }

  if (phase === 'join') {
    return withNote(<JoinScreen onJoin={handleJoin} />);
  }

  if (phase === 'waiting') {
    return withNote(
      <WaitingRoom session={session} participantName={participant?.guest_name || participant?.display_name} />
    );
  }

  if (phase === 'question' && currentQuestion) {
    return withNote(
      <QuestionDisplay
        question={currentQuestion}
        onAnswer={handleAnswer}
        timeRemaining={timeRemaining}
        cooldownRemaining={cooldownRemaining}
        autoAdvanceEnabled={autoAdvanceEnabled}
        totalQuestions={session?.questions?.length}
        cooldownFeedback={cooldownFeedback}
        awaitingNextQuestion={awaitingNextQuestion}
        answered={sameQuestion(answeredQuestionId, currentQuestion.id)}
        savedAnswer={
          sameQuestion(initialPlace?.answer?.questionId, currentQuestion.id) ? initialPlace.answer.value : undefined
        }
      />
    );
  }

  if (phase === 'leaderboard') {
    return withNote(
      showAnswerReview ? (
        <AnswerReviewDisplay
          sessionId={session?.id}
          guestToken={guestToken}
          onViewLeaderboard={() => setShowAnswerReview(false)}
        />
      ) : (
        <Container maxWidth="md">
          <Fade in timeout={800}>
            <Box sx={{ mt: 4 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Button variant="contained" size="large" color="secondary" onClick={() => setShowAnswerReview(true)}>
                  View My Answers
                </Button>
              </Box>
              <LeaderboardDisplay leaderboard={leaderboard} participantId={participant?.id} />
            </Box>
          </Fade>
        </Container>
      )
    );
  }

  if (phase === 'finished') {
    if (!showResultFeedback) {
      return withNote(
        <Container maxWidth="md">
          <Fade in timeout={800}>
            <Box sx={{ mt: 8, textAlign: 'center' }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 56, mb: 3 }} />
              <Typography variant="h3" sx={{ mb: 2, fontWeight: 600 }}>
                Quiz Completed!
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                Your answers have been submitted successfully
              </Typography>
              <Paper sx={{ p: 4, maxWidth: 500, mx: 'auto' }}>
                <Typography variant="body1" color="text.secondary">
                  Thank you for participating. Your teacher will review your responses.
                </Typography>
              </Paper>
            </Box>
          </Fade>
        </Container>
      );
    }

    if (showAnswerReview) {
      return withNote(
        <AnswerReviewDisplay
          sessionId={session?.id}
          guestToken={guestToken}
          onViewLeaderboard={() => setShowAnswerReview(false)}
        />
      );
    }

    if (showLeaderboardToStudents) {
      return withNote(
        <Container maxWidth="md">
          <Fade in timeout={800}>
            <Box sx={{ mt: 8, textAlign: 'center' }}>
              <EmojiEventsIcon sx={{ fontSize: 56, color: 'warning.main', mb: 2 }} />
              <Typography variant="h3" sx={{ mb: 2, fontWeight: 600 }}>
                Quiz Completed!
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
                Thank you for participating
              </Typography>
              <Box sx={{ mb: 4 }}>
                <Button variant="contained" size="large" color="secondary" onClick={() => setShowAnswerReview(true)}>
                  View My Answers
                </Button>
              </Box>
              <LeaderboardDisplay leaderboard={leaderboard} participantId={participant?.id} />
            </Box>
          </Fade>
        </Container>
      );
    }

    return withNote(
      <Container maxWidth="md">
        <Fade in timeout={800}>
          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 56, mb: 3 }} />
            <Typography variant="h3" sx={{ mb: 2, fontWeight: 600 }}>
              Quiz Completed!
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              Thank you for participating
            </Typography>
            <Button
              variant="contained"
              size="large"
              color="secondary"
              onClick={() => setShowAnswerReview(true)}
              startIcon={<AssignmentIcon />}
            >
              View My Answers
            </Button>
          </Box>
        </Fade>
      </Container>
    );
  }

  return withNote(null);
};

export default QuizParticipant;
