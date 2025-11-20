// /src/pages/quizzes/QuizParticipant.jsx

// --- Core React Imports ---
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

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
  CircularProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import TimerIcon from '@mui/icons-material/Timer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LoginIcon from '@mui/icons-material/Login';

// --- Service Import ---
import quizService from '../../services/quizService';

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
      setError("Please enter a room code.");
      return;
    }

    if (!guestName.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!studentId.trim()) {
      setError("Please enter your student ID.");
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      console.log('[JoinScreen] Joining with:', { roomCode, guestName, studentId });

      // Call new joinSession API with object (supports identified guests)
      const response = await quizService.joinSession({
        room_code: roomCode.toUpperCase().trim(),
        guest_name: guestName.trim(),
        student_id: studentId.trim()
      });

      console.log('[JoinScreen] Join successful:', response);
      onJoin(response);
    } catch (err) {
      console.error("Failed to join session:", err);
      setError(err.message || "Failed to join quiz. Please check the room code.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Fade in timeout={800}>
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ mb: 1, fontWeight: 700 }}>
            Join Quiz
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Enter your information to join the quiz
          </Typography>

          <Paper sx={{ p: 4 }}>
            <TextField
              fullWidth
              label="Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
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
 * Waiting Room Component
 */
const WaitingRoom = ({ session, participantName }) => {
  return (
    <Container maxWidth="md">
      <Fade in timeout={800}>
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <HourglassEmptyIcon sx={{ fontSize: 120, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
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
const QuestionDisplay = ({ question, onAnswer, timeRemaining, cooldownRemaining, autoAdvanceEnabled, totalQuestions, cooldownFeedback }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);

  // FIX: Reset state when question changes (allows answering new questions)
  useEffect(() => {
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setTimeExpired(false);
  }, [question.id]); // Reset when question ID changes

  // FIX Issue 1: Detect when time expires
  useEffect(() => {
    if (timeRemaining <= 0 && !isSubmitted) {
      setTimeExpired(true);
      setSelectedAnswer(null); // Clear any selection
    }
  }, [timeRemaining, isSubmitted]);

  const handleSelect = (answerIndex) => {
    if (!isSubmitted && !timeExpired) {
      setSelectedAnswer(answerIndex);
    }
  };

  const handleSubmit = () => {
    if (isSubmitted || timeExpired) return;

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

  return (
    <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 2 }}>
      <Fade in timeout={500}>
        <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: '95vh', overflow: 'hidden' }}>
          {/* FIX: Timer - Show question timer or cooldown timer with proper conditions */}
          {cooldownRemaining > 0 && timeRemaining === 0 ? (
            // Cooldown Timer with Answer Feedback - ENHANCED
            <Box sx={{ textAlign: 'center', mb: 2, flexShrink: 0 }}>
              <Paper
                elevation={8}
                sx={{
                  py: 3,
                  px: 4,
                  textAlign: 'center',
                  background: cooldownFeedback
                    ? (cooldownFeedback.is_correct
                        ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'  // Green gradient if correct
                        : (cooldownFeedback.did_not_answer
                            ? 'linear-gradient(135deg, #757F9A 0%, #D7DDE8 100%)'  // Gray if didn't answer
                            : 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)'  // Red gradient if incorrect
                          )
                      )
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',  // Default purple if no feedback
                  color: 'white',
                  borderRadius: 3,
                  transition: 'all 0.3s ease-in-out'
                }}
              >
                {/* Answer Feedback (if available) */}
                {cooldownFeedback && (
                  <Fade in timeout={500}>
                    <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
                      {cooldownFeedback.did_not_answer ? (
                        <>
                          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
                            ⏰ Time's Up!
                          </Typography>
                          <Typography variant="h6" sx={{ opacity: 0.9 }}>
                            You didn't submit an answer
                          </Typography>
                        </>
                      ) : cooldownFeedback.is_correct ? (
                        <>
                          <CheckCircleIcon sx={{ fontSize: 60, mb: 1 }} />
                          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
                            ✅ Correct!
                          </Typography>
                          <Typography variant="h6" sx={{ opacity: 0.9 }}>
                            You earned {cooldownFeedback.points_earned} points
                          </Typography>
                        </>
                      ) : (
                        <>
                          <CancelIcon sx={{ fontSize: 60, mb: 1 }} />
                          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
                            ❌ Incorrect
                          </Typography>
                          <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
                            0 points
                          </Typography>
                          {/* Show correct answer if provided */}
                          {cooldownFeedback.correct_answer && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Correct Answer:
                              </Typography>
                              <Typography variant="body1">
                                {Array.isArray(cooldownFeedback.correct_answer)
                                  ? cooldownFeedback.correct_answer.map((ans, idx) =>
                                      typeof ans === 'number' ? question.options?.[ans] || ans : String(ans)
                                    ).join(', ')
                                  : String(cooldownFeedback.correct_answer)}
                              </Typography>
                            </Box>
                          )}
                          {/* Show explanation if provided */}
                          {cooldownFeedback.explanation && (
                            <Box sx={{ mt: 1, p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                {cooldownFeedback.explanation}
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}
                    </Box>
                  </Fade>
                )}

                {/* Countdown Timer */}
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                  ⏳ Get Ready!
                </Typography>
                <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                  Next Question Starting In
                </Typography>
                <Typography variant="h1" sx={{ fontWeight: 900, fontSize: '4rem' }}>
                  {cooldownRemaining}
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  seconds
                </Typography>
              </Paper>
            </Box>
          ) : timeRemaining > 0 || question.time_limit_seconds > 0 ? (
            // Question Timer - Compact display when timer is active
            <Box sx={{ flexShrink: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
                <TimerIcon sx={{ mr: 1, color: getProgressColor() }} />
                <Typography variant="h5" color={`${getProgressColor()}.main`} sx={{ fontWeight: 700 }}>
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
          {!(cooldownRemaining > 0 && timeRemaining === 0) && (
            <>
              {/* Question - Compact version */}
              <Paper sx={{ p: 2, mb: 2, textAlign: 'center', flexShrink: 0 }}>
                <Chip
                  label={totalQuestions ? `Question ${question.order_index + 1} of ${totalQuestions}` : `Question ${question.order_index + 1}`}
                  color="primary"
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {question.text}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {question.points} points
                </Typography>
              </Paper>

              {/* Answer Options - Compact rendering based on question type */}
              {(question.type === 'multiple_choice' || question.type === 'poll') && question.options && (
                <Grid container spacing={1.5} sx={{ mb: 2, flexShrink: 0 }}>
                  {question.options.map((option, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Grow in timeout={200 * (index + 1)}>
                        <Button
                          fullWidth
                          variant={selectedAnswer === index ? 'contained' : 'outlined'}
                          size="medium"
                          onClick={() => handleSelect(index)}
                          disabled={isSubmitted || timeExpired}
                          sx={{
                            py: 1.5,
                            fontSize: '1rem',
                            textTransform: 'none',
                            borderWidth: 2,
                            '&:hover': {
                              borderWidth: 2,
                              transform: 'scale(1.02)',
                              transition: 'transform 0.2s'
                            }
                          }}
                        >
                          {option}
                        </Button>
                      </Grow>
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* True/False Buttons - Compact */}
              {question.type === 'true_false' && (
                <Grid container spacing={2} sx={{ maxWidth: 500, mx: 'auto', mb: 2, flexShrink: 0 }}>
                  <Grid item xs={6}>
                    <Grow in timeout={200}>
                      <Button
                        fullWidth
                        variant={selectedAnswer === true ? 'contained' : 'outlined'}
                        size="large"
                        color={selectedAnswer === true ? 'success' : 'primary'}
                        onClick={() => handleSelect(true)}
                        disabled={isSubmitted || timeExpired}
                        sx={{
                          py: 2,
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          borderWidth: 2,
                          '&:hover': { borderWidth: 2, transform: 'scale(1.05)', transition: 'transform 0.2s' }
                        }}
                      >
                        ✓ True
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
                        disabled={isSubmitted || timeExpired}
                        sx={{
                          py: 2,
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          borderWidth: 2,
                          '&:hover': { borderWidth: 2, transform: 'scale(1.05)', transition: 'transform 0.2s' }
                        }}
                      >
                        ✗ False
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
                      value={selectedAnswer || ''}
                      onChange={(e) => setSelectedAnswer(e.target.value)}
                      disabled={isSubmitted || timeExpired}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          fontSize: '1rem',
                          backgroundColor: 'background.paper'
                        }
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
          {!isSubmitted && !timeExpired && (
            (selectedAnswer !== null && selectedAnswer !== '' && (question.type !== 'short_answer' || (typeof selectedAnswer === 'string' && selectedAnswer.trim() !== '')))
          ) && (
            <Fade in>
              <Box sx={{ textAlign: 'center', mt: 2, mb: 2, flexShrink: 0 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmit}
                  disabled={timeExpired}
                  sx={{ px: 6, py: 1.5, fontSize: '1.1rem', fontWeight: 600 }}
                >
                  Submit Answer
                </Button>
              </Box>
            </Fade>
          )}

          {/* FIX: Show appropriate message based on state - Compact */}
          {cooldownRemaining > 0 && timeRemaining === 0 ? (
            // During cooldown period - Hide question/options, show prominent cooldown
            null
          ) : isSubmitted && timeRemaining > 0 ? (
            // Submitted but timer still running
            <Fade in>
              <Alert severity="success" sx={{ mt: 1, flexShrink: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>✅ Answer submitted!</Typography>
                <Typography variant="body2">Waiting for other participants...</Typography>
              </Alert>
            </Fade>
          ) : timeExpired && !isSubmitted && cooldownRemaining === 0 ? (
            // Time expired, no cooldown, not submitted
            <Fade in>
              <Alert severity="warning" sx={{ mt: 1, flexShrink: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>⏰ Time's up!</Typography>
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
  const currentParticipant = leaderboard.find(p => p.participant_id === participantId);
  const currentRank = leaderboard.findIndex(p => p.participant_id === participantId) + 1;

  return (
    <Container maxWidth="md">
      <Fade in timeout={800}>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h3" sx={{ textAlign: 'center', mb: 4, fontWeight: 700 }}>
            Leaderboard
          </Typography>

          {/* Current Participant Status */}
          {currentParticipant && (
            <Paper
              sx={{
                p: 3,
                mb: 4,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}
            >
              <Typography variant="h6" gutterBottom>Your Position</Typography>
              <Typography variant="h2" sx={{ fontWeight: 900 }}>
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
                    backgroundColor: participant.participant_id === participantId ? 'primary.light' : 'action.hover',
                    border: 2,
                    borderColor: index < 3 ? 'warning.main' : 'divider',
                    boxShadow: participant.participant_id === participantId ? 4 : 1
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'primary.main',
                        width: 56,
                        height: 56,
                        fontSize: '1.5rem',
                        fontWeight: 'bold'
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
 * Main Quiz Participant Component
 */
const QuizParticipant = () => {
  const { roomCode: urlRoomCode } = useParams();
  const [searchParams] = useSearchParams();

  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const leaderboardTimerRef = useRef(null); // FIX: Store leaderboard auto-advance timeout ID
  const cooldownTimerRef = useRef(null); // FIX: Store cooldown timer ID for cleanup
  const resyncTimerRef = useRef(null); // FIX: Store resync timer ID

  const [phase, setPhase] = useState('join'); // join, waiting, question, leaderboard, finished
  const [session, setSession] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [guestToken, setGuestToken] = useState(null);
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

  // NEW: Store answer feedback for cooldown display
  const [cooldownFeedback, setCooldownFeedback] = useState(null);
  // cooldownFeedback structure:
  // {
  //   is_correct: boolean,
  //   points_earned: number,
  //   correct_answer: [...],  // optional
  //   explanation: string,    // optional
  //   did_not_answer: boolean // optional
  // }

  // FIX #3: Cleanup WebSocket and ALL timers on unmount to prevent memory leaks
  useEffect(() => {
    console.log('[QuizParticipant] Component mounted');

    return () => {
      console.log('[QuizParticipant] Component unmounting, cleaning up resources');

      // Cleanup WebSocket
      if (wsRef.current) {
        if (wsRef.current.readyState !== WebSocket.CLOSED) {
          console.log('[QuizParticipant] Closing WebSocket connection');
          wsRef.current.close();
        }
        wsRef.current = null;
      }

      // Cleanup timer
      if (timerRef.current) {
        console.log('[QuizParticipant] Clearing timer interval');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Cleanup leaderboard timer
      if (leaderboardTimerRef.current) {
        console.log('[QuizParticipant] Clearing leaderboard timer');
        clearTimeout(leaderboardTimerRef.current);
        leaderboardTimerRef.current = null;
      }

      // FIX: Cleanup cooldown timer
      if (cooldownTimerRef.current) {
        console.log('[QuizParticipant] Clearing cooldown timer');
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }

      // FIX: Cleanup resync timer
      if (resyncTimerRef.current) {
        console.log('[QuizParticipant] Clearing resync timer');
        clearInterval(resyncTimerRef.current);
        resyncTimerRef.current = null;
      }
    };
  }, []);

  const handleJoin = (joinResponse) => {
    console.log('[QuizParticipant] Join successful:', {
      sessionId: joinResponse.session.id,
      participantId: joinResponse.participant.id,
      participantName: joinResponse.participant.guest_name,
      roomCode: joinResponse.session.room_code
    });

    setSession(joinResponse.session);
    setParticipant(joinResponse.participant);
    setGuestToken(joinResponse.guest_token);
    setPhase('waiting');

    console.log('[QuizParticipant] Phase changed to: waiting');

    // Connect WebSocket
    connectWebSocket(joinResponse.session.id, joinResponse.guest_token);
  };

  const connectWebSocket = (sessionId, token) => {
    console.log('[QuizParticipant] Connecting WebSocket for session:', sessionId);

    try {
      const ws = quizService.connectWebSocket(sessionId, token, false);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        console.log('[QuizParticipant] WebSocket message received');
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      ws.onerror = (error) => {
        console.error('[QuizParticipant] ❌ WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log(`[QuizParticipant] 🔌 WebSocket disconnected - Code: ${event.code}, Clean: ${event.wasClean}`);
      };

      console.log('[QuizParticipant] WebSocket connection initiated');
    } catch (err) {
      console.error('[QuizParticipant] Failed to connect WebSocket:', err);
      setError("Failed to establish real-time connection.");
    }
  };

  const handleWebSocketMessage = (message) => {
    console.log('[QuizParticipant] Processing WebSocket message:', message.type);

    switch (message.type) {
      case 'session_started':
        console.log('[QuizParticipant] Session started');
        setPhase('waiting');
        break;

      case 'question_started':
        console.log('[QuizParticipant] Question started:', {
          questionId: message.question.id,
          questionText: message.question.text,
          timeLimit: message.question.time_limit_seconds,
          points: message.question.points,
          serverTimestamp: message.server_timestamp,
          expiresAt: message.expires_at
        });

        // FIX: Clear cooldown state when new question starts
        setCooldownEndsAt(null);
        setCooldownRemaining(0);
        setCooldownFeedback(null); // NEW: Reset feedback for new question

        // FIX: Set question with timestamp synchronization
        setCurrentQuestion(message.question);
        setQuestionExpiresAt(message.expires_at); // Server timestamp when timer expires
        setPhase('question');

        // FIX: Start timestamp-based timer
        startTimestampTimer(message.expires_at, message.question.time_limit_seconds);
        break;

      case 'leaderboard_update':
        console.log('[QuizParticipant] Leaderboard update received:', {
          participantCount: message.leaderboard?.length || 0,
          sessionStatus: session?.status
        });
        setLeaderboard(message.leaderboard || []);

        // FIX Issue 1: Only show leaderboard if session is active
        // Don't show it on join (when session is still 'waiting')
        if (session?.status === 'active') {
          console.log('[QuizParticipant] Session is active, showing leaderboard');
          setPhase('leaderboard');

          // Clear any existing leaderboard timer
          if (leaderboardTimerRef.current) {
            clearTimeout(leaderboardTimerRef.current);
          }

          // Auto-advance to next question after 10 seconds
          leaderboardTimerRef.current = setTimeout(() => {
            console.log('[QuizParticipant] Auto-advancing from leaderboard to waiting');
            setPhase('waiting');
          }, 10000);
        } else {
          console.log('[QuizParticipant] Session not active, staying in current phase');
        }
        break;

      case 'session_ended':
        console.log('[QuizParticipant] Session ended');

        // FIX Issue 3: Clear leaderboard timer to prevent switching back to waiting
        if (leaderboardTimerRef.current) {
          console.log('[QuizParticipant] Clearing leaderboard timer on session end');
          clearTimeout(leaderboardTimerRef.current);
          leaderboardTimerRef.current = null;
        }

        setPhase('finished');
        break;

      case 'auto_advance_updated':
        // FIX Issue 2: Auto-advance setting changed
        console.log('[QuizParticipant] Auto-advance updated:', message.enabled, message.cooldown_seconds);
        setAutoAdvanceEnabled(message.enabled);
        setCooldownSeconds(message.cooldown_seconds);
        break;

      case 'question_ended':
        // FIX: Question ended, cooldown starting with timestamp synchronization
        console.log('[QuizParticipant] Question ended, cooldown starting:', {
          cooldownSeconds: message.cooldown_seconds,
          cooldownEndsAt: message.cooldown_ends_at
        });
        setTimeRemaining(0);
        setQuestionExpiresAt(null); // Clear question timer
        setCooldownEndsAt(message.cooldown_ends_at); // Set cooldown end timestamp
        startCooldownTimer(message.cooldown_ends_at, message.cooldown_seconds);
        break;

      case 'answer_submitted':
        // NEW: Store answer result when student submits
        console.log('[QuizParticipant] Answer submitted result:', message.result);
        if (message.result) {
          setCooldownFeedback(message.result);
        }
        break;

      case 'cooldown_started':
        // FIX: Cooldown started from backend with timestamp synchronization
        // NEW: Store feedback if provided (when show_correct_answer_during_cooldown is enabled)
        console.log('[QuizParticipant] Cooldown started:', {
          cooldownSeconds: message.cooldown_seconds,
          cooldownEndsAt: message.cooldown_ends_at,
          hasFeedback: Boolean(message.your_answer)
        });
        setCooldownSeconds(message.cooldown_seconds);
        setCooldownEndsAt(message.cooldown_ends_at); // Set cooldown end timestamp

        // NEW: Store cooldown feedback if provided
        if (message.your_answer) {
          console.log('[QuizParticipant] Cooldown feedback received:', message.your_answer);
          setCooldownFeedback(message.your_answer);
        } else {
          console.log('[QuizParticipant] No cooldown feedback (feature disabled)');
          setCooldownFeedback(null);
        }

        startCooldownTimer(message.cooldown_ends_at, message.cooldown_seconds);
        break;

      case 'ping':
        console.log('[QuizParticipant] Heartbeat ping received, sending pong');
        // Respond to heartbeat
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'pong' }));
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
  const startTimestampTimer = (expiresAtISO, fallbackDuration) => {
    console.log('[QuizParticipant] Starting timestamp-based timer:', {
      expiresAt: expiresAtISO,
      fallbackDuration: fallbackDuration
    });

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
        console.log('[QuizParticipant] Timer expired (timestamp-based)');
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
    console.log('[QuizParticipant] Starting timestamp-based cooldown timer:', {
      cooldownEndsAt: cooldownEndsAtISO,
      fallbackDuration: fallbackDuration
    });

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
        console.log('[QuizParticipant] Cooldown expired (timestamp-based)');
        setCooldownRemaining(0);
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    }, 100); // Update every 100ms
  };

  const handleAnswer = async (answer) => {
    console.log('[QuizParticipant] Submitting answer:', {
      questionId: currentQuestion.id,
      questionType: currentQuestion.type,
      answer: answer,
      timeRemaining: timeRemaining
    });

    try {
      const timeTaken = (currentQuestion.time_limit_seconds - timeRemaining) * 1000;

      console.log('[QuizParticipant] Time taken:', timeTaken, 'ms');

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

      console.log('[QuizParticipant] Formatted answer for API:', formattedAnswer);

      await quizService.submitAnswer(
        session.id,
        {
          question_id: currentQuestion.id,
          answer: formattedAnswer,
          time_taken_ms: timeTaken
        },
        guestToken
      );

      console.log('[QuizParticipant] ✅ Answer submitted successfully');

      // FIX Issue 1: Do NOT clear timer - it should continue running until time expires
      // This allows all students to see the same countdown and cooldown timing
    } catch (err) {
      console.error('[QuizParticipant] ❌ Failed to submit answer:', err);
      setError(err.message || "Failed to submit answer.");
    }
  };

  if (phase === 'join') {
    return <JoinScreen onJoin={handleJoin} />;
  }

  if (phase === 'waiting') {
    return <WaitingRoom session={session} participantName={participant?.guest_name || participant?.display_name} />;
  }

  if (phase === 'question' && currentQuestion) {
    return (
      <QuestionDisplay
        question={currentQuestion}
        onAnswer={handleAnswer}
        timeRemaining={timeRemaining}
        cooldownRemaining={cooldownRemaining}
        autoAdvanceEnabled={autoAdvanceEnabled}
        totalQuestions={session?.questions?.length}
        cooldownFeedback={cooldownFeedback}
      />
    );
  }

  if (phase === 'leaderboard') {
    return <LeaderboardDisplay leaderboard={leaderboard} participantId={participant?.id} />;
  }

  if (phase === 'finished') {
    return (
      <Container maxWidth="md">
        <Fade in timeout={800}>
          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <EmojiEventsIcon sx={{ fontSize: 120, color: 'warning.main', mb: 2 }} />
            <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
              Quiz Completed!
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
              Thank you for participating
            </Typography>
            <LeaderboardDisplay leaderboard={leaderboard} participantId={participant?.id} />
          </Box>
        </Fade>
      </Container>
    );
  }

  return null;
};

export default QuizParticipant;
