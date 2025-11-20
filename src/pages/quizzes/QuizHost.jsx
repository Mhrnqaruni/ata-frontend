// /src/pages/quizzes/QuizHost.jsx

// --- Core React Imports ---
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// --- MUI Component Imports ---
import {
  Box,
  Button,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  Fade,
  Switch,
  FormControlLabel,
  TextField,
  Skeleton,
  Collapse,
  Snackbar
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import PeopleIcon from '@mui/icons-material/People';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TimerIcon from '@mui/icons-material/Timer';
import FlagIcon from '@mui/icons-material/Flag';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';

// --- Service Import ---
import quizService from '../../services/quizService';

// --- QR Code Import ---
import { QRCodeSVG } from 'qrcode.react';

/**
 * NEW: Roster Panel Component - Shows expected students with join/absent status
 */
const RosterPanel = ({ roster, session, isLoading }) => {
  // Don't show panel if no class association
  if (!session?.class_id) {
    return null;
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PeopleIcon sx={{ mr: 1, fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
            Class Roster Attendance
          </Typography>
          {!isLoading && roster && (
            <Chip
              label={`${roster.total_joined}/${roster.total_expected} Joined`}
              color={roster.join_rate >= 0.8 ? 'success' : roster.join_rate >= 0.5 ? 'warning' : 'error'}
              size="small"
            />
          )}
        </Box>

        {/* Loading State */}
        {isLoading ? (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={120} height={24} sx={{ borderRadius: 1 }} />
            </Box>
            <Divider sx={{ my: 2 }} />
            {Array.from(new Array(3)).map((_, index) => (
              <Skeleton key={index} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Box>
        ) : roster ? (
          <>
            {/* Stats Summary */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`✓ Joined: ${roster.total_joined}`}
                color="success"
                variant="outlined"
                size="small"
              />
              <Chip
                label={`⏳ Absent: ${roster.total_absent}`}
                color="error"
                variant="outlined"
                size="small"
              />
              <Chip
                label={`📊 Join Rate: ${Math.round(roster.join_rate * 100)}%`}
                color="info"
                variant="outlined"
                size="small"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Student List */}
            {roster.entries && roster.entries.length > 0 ? (
              <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                {roster.entries.map((entry) => (
            <ListItem
              key={entry.id}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                backgroundColor: entry.joined ? 'success.lighter' : 'action.hover',
                border: 1,
                borderColor: entry.joined ? 'success.main' : 'divider'
              }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    bgcolor: entry.joined ? 'success.main' : 'grey.400',
                    width: 36,
                    height: 36
                  }}
                >
                  {entry.joined ? '✓' : '⏳'}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="body1" sx={{ fontWeight: entry.joined ? 600 : 400 }}>
                    {entry.student_name}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    ID: {entry.student_school_id}
                    {entry.joined && entry.joined_at && (
                      <> • Joined {new Date(entry.joined_at).toLocaleTimeString()}</>
                    )}
                  </Typography>
                }
              />
              {entry.joined && (
                <Chip
                  label="JOINED"
                  color="success"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              )}
                </ListItem>
              ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <PeopleIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  No students found in this class
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Add students to the class to track attendance
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No roster data available
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * NEW: Outsider Panel Component - Shows students not on expected roster with management features
 */
const OutsiderPanel = ({ outsiders, sessionId, onOutsiderUpdate }) => {
  const [notesDialog, setNotesDialog] = useState({ open: false, outsider: null });
  const [notesText, setNotesText] = useState('');
  const [flaggingId, setFlaggingId] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});

  if (!outsiders || outsiders.length === 0) {
    return null;
  }

  const handleFlagToggle = async (outsider) => {
    setFlaggingId(outsider.id);
    try {
      const newFlaggedStatus = !outsider.flagged_by_teacher;

      // Use service method instead of direct fetch
      await quizService.flagOutsiderStudent(
        sessionId,
        outsider.id,
        newFlaggedStatus,
        outsider.teacher_notes || null
      );

      console.log('[OutsiderPanel] Outsider flagged successfully');
      // Trigger parent refresh
      if (onOutsiderUpdate) {
        onOutsiderUpdate();
      }
    } catch (err) {
      console.error('[OutsiderPanel] Error flagging outsider:', err);
    } finally {
      setFlaggingId(null);
    }
  };

  const handleOpenNotesDialog = (outsider) => {
    setNotesDialog({ open: true, outsider });
    setNotesText(outsider.teacher_notes || '');
  };

  const handleCloseNotesDialog = () => {
    setNotesDialog({ open: false, outsider: null });
    setNotesText('');
  };

  const handleSaveNotes = async () => {
    const outsider = notesDialog.outsider;
    if (!outsider) return;

    try {
      // Use service method instead of direct fetch
      await quizService.flagOutsiderStudent(
        sessionId,
        outsider.id,
        outsider.flagged_by_teacher,
        notesText
      );

      console.log('[OutsiderPanel] Notes saved successfully');
      handleCloseNotesDialog();
      // Trigger parent refresh
      if (onOutsiderUpdate) {
        onOutsiderUpdate();
      }
    } catch (err) {
      console.error('[OutsiderPanel] Error saving notes:', err);
    }
  };

  const toggleExpandNotes = (outsiderId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [outsiderId]: !prev[outsiderId]
    }));
  };

  const flaggedCount = outsiders.filter(o => o.flagged_by_teacher).length;

  return (
    <>
      <Card sx={{ mb: 2, border: 2, borderColor: 'warning.main' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, flex: 1, color: 'warning.dark' }}>
              ⚠️ Outsider Students
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {flaggedCount > 0 && (
                <Chip
                  label={`${flaggedCount} Flagged`}
                  color="error"
                  size="small"
                  icon={<FlagIcon />}
                />
              )}
              <Chip
                label={`${outsiders.length} Total`}
                color="warning"
                size="small"
              />
            </Box>
          </Box>

          <Alert severity="warning" sx={{ mb: 2 }}>
            These students joined but are NOT in the expected class roster. Review and flag suspicious entries.
          </Alert>

          <List dense>
            {outsiders.map((outsider) => (
              <Box key={outsider.id}>
                <ListItem
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor: outsider.flagged_by_teacher ? 'error.lighter' : 'warning.lighter',
                    border: 1,
                    borderColor: outsider.flagged_by_teacher ? 'error.main' : 'warning.main'
                  }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {/* Flag/Unflag Button */}
                      <Tooltip title={outsider.flagged_by_teacher ? 'Unflag as normal' : 'Flag for review'}>
                        <IconButton
                          size="small"
                          onClick={() => handleFlagToggle(outsider)}
                          disabled={flaggingId === outsider.id}
                          sx={{
                            color: outsider.flagged_by_teacher ? 'error.main' : 'action.active'
                          }}
                        >
                          {outsider.flagged_by_teacher ? <FlagIcon /> : <FlagOutlinedIcon />}
                        </IconButton>
                      </Tooltip>

                      {/* Notes Button */}
                      <Tooltip title={outsider.teacher_notes ? 'View/Edit notes' : 'Add notes'}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenNotesDialog(outsider)}
                          color={outsider.teacher_notes ? 'primary' : 'default'}
                        >
                          {outsider.teacher_notes ? <VisibilityIcon /> : <NoteAddIcon />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: outsider.flagged_by_teacher ? 'error.main' : 'warning.main',
                        width: 36,
                        height: 36
                      }}
                    >
                      {outsider.flagged_by_teacher ? '🚩' : '⚠'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {outsider.guest_name}
                        </Typography>
                        {outsider.flagged_by_teacher && (
                          <Chip label="FLAGGED" color="error" size="small" sx={{ height: 20 }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          ID: {outsider.student_school_id} •{' '}
                          {outsider.detection_reason === 'not_in_class' && 'Not in this class'}
                          {outsider.detection_reason === 'student_not_found' && 'Student ID not found'}
                          {outsider.detection_reason === 'no_class_set' && 'No class set for quiz'}
                        </Typography>
                        {outsider.teacher_notes && (
                          <Box sx={{ mt: 0.5 }}>
                            <Button
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => toggleExpandNotes(outsider.id)}
                              sx={{ textTransform: 'none', minWidth: 0, p: 0 }}
                            >
                              {expandedNotes[outsider.id] ? 'Hide' : 'Show'} notes
                            </Button>
                            <Collapse in={expandedNotes[outsider.id]}>
                              <Paper sx={{ p: 1, mt: 1, bgcolor: 'background.default' }}>
                                <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                  {outsider.teacher_notes}
                                </Typography>
                              </Paper>
                            </Collapse>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Notes Dialog */}
      <Dialog open={notesDialog.open} onClose={handleCloseNotesDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {notesDialog.outsider?.teacher_notes ? 'Edit Notes' : 'Add Notes'}
          {notesDialog.outsider && (
            <Typography variant="subtitle2" color="text.secondary">
              For: {notesDialog.outsider.guest_name} ({notesDialog.outsider.student_school_id})
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            label="Teacher Notes"
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Add notes about this outsider student (e.g., reason for joining, follow-up actions needed, etc.)"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNotesDialog}>Cancel</Button>
          <Button onClick={handleSaveNotes} variant="contained">
            Save Notes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * Leaderboard Component
 */
const Leaderboard = ({ participants }) => {
  const getMedalColor = (rank) => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return 'primary';
    }
  };

  return (
    <List sx={{ width: '100%' }}>
      {participants.slice(0, 10).map((participant, index) => (
        <Fade in key={participant.participant_id} timeout={300 * (index + 1)}>
          <ListItem
            sx={{
              mb: 1,
              borderRadius: 2,
              backgroundColor: index < 3 ? 'action.hover' : 'transparent',
              border: index < 3 ? 2 : 1,
              borderColor: index < 3 ? getMedalColor(index + 1) : 'divider'
            }}
          >
            <ListItemAvatar>
              <Avatar
                sx={{
                  bgcolor: getMedalColor(index + 1),
                  fontWeight: 'bold',
                  fontSize: '1.2rem'
                }}
              >
                {index < 3 ? <EmojiEventsIcon /> : index + 1}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography variant="h6" sx={{ fontWeight: index < 3 ? 600 : 400 }}>
                  {participant.display_name}
                </Typography>
              }
              secondary={
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Chip
                    label={`${participant.score} pts`}
                    size="small"
                    color="primary"
                    variant={index < 3 ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label={`${participant.correct_answers} correct`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label={`${(participant.total_time_ms / 1000).toFixed(1)}s`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              }
              secondaryTypographyProps={{ component: 'div' }}
            />
          </ListItem>
        </Fade>
      ))}
    </List>
  );
};

/**
 * Main Quiz Host Control Panel
 */
const QuizHost = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null); // FIX #4: Track reconnection timer for cleanup
  const debounceTimerRef = useRef(null); // FIX #2: Track debounce timer for auto-advance

  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time state
  const [participants, setParticipants] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answersReceived, setAnswersReceived] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  // NEW: Roster tracking state
  const [roster, setRoster] = useState(null);
  const [outsiders, setOutsiders] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  // FIX Issue 2: Auto-advance state - DEFAULT TO TRUE so scheduler is enabled
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(10);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false); // FIX #5: Loading state for config

  // Timer state for teacher display
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const timerRef = useRef(null);

  // Dialogs
  const [endDialog, setEndDialog] = useState(false);

  // Copy feedback state
  const [copySuccess, setCopySuccess] = useState('');

  // Load session data
  useEffect(() => {
    console.log('[QuizHost] Mounting component, sessionId:', sessionId);
    loadSession();

    // FIX #3 & #4: Cleanup function to prevent memory leaks
    return () => {
      console.log('[QuizHost] Component unmounting, cleaning up WebSocket and timers');

      // Close WebSocket connection
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Clear reconnection timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [sessionId]);

  // Connect WebSocket - FIX #3: Only reconnect when session.id changes, not entire object
  useEffect(() => {
    if (!session?.id) {
      console.log('[QuizHost] No session ID, skipping WebSocket connection');
      return;
    }

    console.log('[QuizHost] Session loaded, connecting WebSocket for session:', session.id);
    connectWebSocket();

    // FIX #3: Cleanup function to close WebSocket when effect re-runs or unmounts
    return () => {
      console.log('[QuizHost] WebSocket effect cleanup');
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        console.log('[QuizHost] Closing WebSocket connection');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [session?.id]); // Only re-run when session.id changes, not entire session object

  // FIX: Load auto-advance settings from session config
  useEffect(() => {
    if (session?.config_snapshot) {
      const config = session.config_snapshot;
      if (config.auto_advance_enabled !== undefined) {
        setAutoAdvanceEnabled(config.auto_advance_enabled);
      }
      if (config.cooldown_seconds !== undefined) {
        setCooldownSeconds(config.cooldown_seconds);
      }
    }
  }, [session?.config_snapshot]);

  // REMOVED: Auto-enable logic - now handled by backend on session creation
  // Auto-advance is enabled by default when session is created on the backend
  // This prevents race conditions and ensures scheduler job is always created

  const loadSession = async () => {
    try {
      setIsLoading(true);
      const sessionData = await quizService.getSession(sessionId);
      setSession(sessionData);

      // Load quiz details
      const quizData = await quizService.getQuizById(sessionData.quiz_id);
      setQuiz(quizData);

      // Load initial leaderboard
      const leaderboardData = await quizService.getLeaderboard(sessionId);
      console.log('[QuizHost] Leaderboard API response:', leaderboardData);
      // FIX: Extract entries array from LeaderboardResponse object
      setLeaderboard(leaderboardData.entries || []);

      // NEW: Load roster if session has class_id
      if (sessionData.class_id) {
        console.log('[QuizHost] Session has class_id, loading roster...');
        await loadRosterData(sessionId);
      }

      setError(null);
    } catch (err) {
      console.error("Failed to load session:", err);
      setError(err.message || "Failed to load quiz session.");
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Load roster data for class-based sessions
  const loadRosterData = async (sid) => {
    setIsLoadingRoster(true);
    try {
      console.log('[QuizHost] Fetching roster for session:', sid);

      // Use service methods instead of direct fetch
      const rosterData = await quizService.getSessionRoster(sid);
      console.log('[QuizHost] Roster loaded:', rosterData);
      setRoster(rosterData);

      // Load outsiders
      const outsidersData = await quizService.getSessionOutsiders(sid);
      console.log('[QuizHost] Outsiders loaded:', outsidersData);
      setOutsiders(outsidersData.records || []);
    } catch (err) {
      console.error('[QuizHost] Error loading roster:', err);
      // Don't show error to user - roster is optional
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError("Authentication token not found.");
      return;
    }

    try {
      const ws = quizService.connectWebSocket(sessionId, token, true);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);

        // FIX #4: Clean up previous reconnection timer before creating new one
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }

        // Attempt reconnection after 3 seconds
        reconnectTimerRef.current = setTimeout(() => {
          // Check if we're still mounted and session is still active
          if (wsRef.current === ws && session && session.status !== 'completed') {
            console.log('[WebSocket] Attempting to reconnect...');
            connectWebSocket();
          } else {
            console.log('[WebSocket] Skipping reconnection (component unmounted or session ended)');
          }
        }, 3000);
      };
    } catch (err) {
      console.error("Failed to connect WebSocket:", err);
      setError("Failed to establish real-time connection.");
    }
  };

  const handleWebSocketMessage = (message) => {
    console.log('WebSocket message:', message);

    switch (message.type) {
      case 'connection_established':
        console.log('Connection established');
        break;

      case 'participant_joined':
        // FIX #3: Update participant count from WebSocket message instead of full reload
        console.log('[QuizHost] Participant joined:', message);
        if (message.total_participants !== undefined) {
          setSession(prev => ({
            ...prev,
            participant_count: message.total_participants
          }));
        }
        // Reload roster if class-based quiz
        if (session?.class_id) {
          loadRosterData(sessionId);
        }
        break;

      case 'participant_left':
        // FIX #3: Update participant count from WebSocket message instead of full reload
        console.log('[QuizHost] Participant left:', message);
        if (message.total_participants !== undefined) {
          setSession(prev => ({
            ...prev,
            participant_count: message.total_participants
          }));
        }
        // Reload roster if class-based quiz
        if (session?.class_id) {
          loadRosterData(sessionId);
        }
        break;

      case 'participant_answered':
        // Increment answers received
        setAnswersReceived(prev => prev + 1);
        break;

      case 'stats_update':
        // FIX: Update real-time stats from backend
        console.log('Stats update received:', message);
        setAnswersReceived(message.answers_received || 0);
        // Optionally update session with new participant count
        if (message.total_participants !== undefined) {
          setSession(prev => ({
            ...prev,
            total_participants: message.total_participants
          }));
        }
        break;

      case 'leaderboard_update':
        // Update leaderboard
        setLeaderboard(message.leaderboard || []);
        break;

      // NEW: Roster tracking WebSocket handlers
      case 'roster_updated':
        // Real-time roster update when student joins
        console.log('[QuizHost] Roster updated:', message.roster);
        if (session?.class_id) {
          loadRosterData(sessionId); // Refresh roster data
        }
        break;

      case 'outsider_detected':
        // Real-time outsider alert
        console.log('[QuizHost] Outsider detected:', message.outsider);
        if (session?.class_id) {
          loadRosterData(sessionId); // Refresh to get updated outsiders list
        }
        break;

      case 'question_started':
        // New question started
        setCurrentQuestion(message.question);
        setAnswersReceived(0);
        // FIX: Update session's current_question_index so counter displays correctly
        setSession(prev => ({
          ...prev,
          current_question_index: message.question.order_index
        }));
        // ✅ FIX #3: Pass expires_at timestamp for synchronized timer
        if (message.question.time_limit_seconds) {
          startTimer(message.question.time_limit_seconds, message.expires_at);
        }
        break;

      case 'auto_advance_updated':
        // FIX Issue 2: Auto-advance setting changed
        setAutoAdvanceEnabled(message.enabled);
        setCooldownSeconds(message.cooldown_seconds);
        console.log('[QuizHost] Auto-advance updated:', message.enabled, message.cooldown_seconds);
        break;

      case 'question_ended':
        // FIX BUG #2: Question ended, cooldown starting
        console.log('[QuizHost] Question ended, cooldown starting:', message.cooldown_seconds);
        setTimeRemaining(0);
        setCooldownRemaining(message.cooldown_seconds);
        break;

      case 'cooldown_started':
        // FIX BUG #1: Cooldown started from backend
        console.log('[QuizHost] Cooldown started:', message.cooldown_seconds);
        setCooldownSeconds(message.cooldown_seconds);
        setCooldownRemaining(message.cooldown_seconds);
        break;

      case 'session_ended':
        // FIX BUG #3: Handle session ended (from auto-advance after last question)
        console.log('[QuizHost] Session ended via websocket:', message.reason);
        setSession(prev => ({
          ...prev,
          status: message.final_status || 'completed',
          ended_at: new Date().toISOString()
        }));

        // Clear any pending timers
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        // Navigate to analytics after 2 seconds
        setTimeout(() => {
          console.log('[QuizHost] Navigating to analytics...');
          navigate(`/quizzes/${session.quiz_id}/analytics`);
        }, 2000);
        break;

      case 'ping':
        // Respond to heartbeat
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'pong' }));
        }
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  };

  // FIX Issue 2: Handle auto-advance toggle
  const handleToggleAutoAdvance = async (enabled, cooldownOverride = null) => {
    try {
      const cooldownToUse = cooldownOverride !== null ? cooldownOverride : cooldownSeconds;
      await quizService.toggleAutoAdvance(sessionId, enabled, cooldownToUse);
      setAutoAdvanceEnabled(enabled);
    } catch (err) {
      console.error("Failed to toggle auto-advance:", err);
      setError(err.message || "Failed to toggle auto-advance.");
    }
  };

  // Timer functions for teacher display
  /**
   * ✅ FIX #3: Timestamp-based timer for teacher (same as student)
   *
   * This ensures teacher and students see EXACTLY the same timer.
   * Uses server timestamp when available, falls back to simple countdown.
   */
  const startTimer = (duration, expiresAt) => {
    console.log('[QuizHost] Starting timer:', { duration, expiresAt });

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setCooldownRemaining(0);

    // ✅ FIX #3: Use server timestamp if available for synchronization
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);

      if (!isNaN(expirationDate.getTime())) {
        // Timestamp-based timer (synchronized with server)
        const calculateRemaining = () => {
          const now = new Date();
          const remaining = Math.ceil((expirationDate - now) / 1000);
          return Math.max(0, remaining);
        };

        // Update immediately
        setTimeRemaining(calculateRemaining());

        // Update every 1 second (teacher doesn't need 100ms precision)
        timerRef.current = setInterval(() => {
          const remaining = calculateRemaining();
          setTimeRemaining(remaining);

          if (remaining <= 0) {
            console.log('[QuizHost] Timer expired (timestamp-based)');
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }, 1000);

        return;
      } else {
        console.warn('[QuizHost] Invalid expires_at timestamp, using fallback countdown');
      }
    }

    // Fallback: Simple countdown (for backward compatibility)
    let remaining = duration;
    setTimeRemaining(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        console.log('[QuizHost] Timer expired (countdown)');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 1000);
  };

  // Start cooldown timer when question time expires and auto-advance is enabled
  useEffect(() => {
    if (timeRemaining === 0 && autoAdvanceEnabled && currentQuestion && session?.status === 'active') {
      console.log('[QuizHost] Starting cooldown countdown:', cooldownSeconds, 'seconds');
      let cooldownLeft = cooldownSeconds;
      setCooldownRemaining(cooldownLeft);

      const cooldownInterval = setInterval(() => {
        cooldownLeft -= 1;
        setCooldownRemaining(cooldownLeft);

        if (cooldownLeft <= 0) {
          console.log('[QuizHost] Cooldown finished');
          clearInterval(cooldownInterval);
          setCooldownRemaining(0);
        }
      }, 1000);

      return () => {
        clearInterval(cooldownInterval);
      };
    }
  }, [timeRemaining, autoAdvanceEnabled, cooldownSeconds, currentQuestion, session?.status]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // FIX Issue 6: Auto-navigate to analytics when quiz ends
  useEffect(() => {
    if (session?.status === 'completed') {
      console.log('[QuizHost] Quiz completed, navigating to analytics after 3 seconds...');
      const navigateTimer = setTimeout(() => {
        navigate(`/quizzes/${session.quiz_id}/analytics`);
      }, 3000); // Give teacher 3 seconds to see completion message

      return () => clearTimeout(navigateTimer);
    }
  }, [session?.status, session?.quiz_id, navigate]);

  const handleStart = async () => {
    try {
      await quizService.startSession(sessionId);
      await loadSession();
    } catch (err) {
      console.error("Failed to start session:", err);
      setError(err.message || "Failed to start quiz session.");
    }
  };

  const handleNextQuestion = async () => {
    try {
      await quizService.nextQuestion(sessionId);
      setAnswersReceived(0);
    } catch (err) {
      console.error("Failed to advance question:", err);
      setError(err.message || "Failed to advance to next question.");
    }
  };

  /**
   * ✅ FIX #4A: Handle skip cooldown button click
   */
  const handleSkipCooldown = async () => {
    try {
      console.log('[QuizHost] Skipping cooldown for session:', sessionId);
      await quizService.skipCooldown(sessionId);
      setCooldownRemaining(0); // Immediately hide cooldown UI
    } catch (err) {
      console.error("Failed to skip cooldown:", err);
      setError(err.message || "Failed to skip cooldown period.");
    }
  };

  const handleEnd = async () => {
    try {
      await quizService.endSession(sessionId);
      setEndDialog(false);
      navigate('/quizzes');
    } catch (err) {
      console.error("Failed to end session:", err);
      setError(err.message || "Failed to end quiz session.");
      setEndDialog(false);
    }
  };

  const copyRoomCode = async () => {
    if (session?.room_code) {
      try {
        await navigator.clipboard.writeText(session.room_code);
        setCopySuccess('Room code copied!');
        setTimeout(() => setCopySuccess(''), 2000);
        console.log('[QuizHost] Room code copied to clipboard:', session.room_code);
      } catch (err) {
        console.error('[QuizHost] Failed to copy room code:', err);
        setCopySuccess('Failed to copy');
        setTimeout(() => setCopySuccess(''), 2000);
      }
    }
  };

  // Generate join URL for students
  const getJoinUrl = () => {
    if (!session?.room_code) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/quiz/join/${session.room_code}`;
  };

  // Copy join URL to clipboard
  const copyJoinUrl = async () => {
    const url = getJoinUrl();
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setCopySuccess('Join link copied!');
        setTimeout(() => setCopySuccess(''), 2000);
        console.log('[QuizHost] Join URL copied to clipboard:', url);
      } catch (err) {
        console.error('[QuizHost] Failed to copy join URL:', err);
        setCopySuccess('Failed to copy');
        setTimeout(() => setCopySuccess(''), 2000);
      }
    }
  };

  const getCompletionRate = () => {
    // FIX #1: Use participant_count field from backend
    if (!session || !session.participant_count || session.participant_count === 0) return 0;
    return Math.round((answersReceived / session.participant_count) * 100);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading quiz session...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/quizzes')} sx={{ mt: 2 }}>
          Back to Quizzes
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Room Code and QR Code */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Typography variant="h3" sx={{ mb: 3, fontWeight: 700, textAlign: 'center' }}>
          {quiz?.title}
        </Typography>

        <Grid container spacing={4} alignItems="center">
          {/* Left: Room Code and Join Link */}
          <Grid item xs={12} md={8}>
            <Box sx={{ textAlign: 'center' }}>
              {/* Room Code */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Room Code:
              </Typography>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  border: '3px dashed rgba(255, 255, 255, 0.5)',
                  mb: 3
                }}
              >
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: 8,
                    fontFamily: 'monospace'
                  }}
                >
                  {session?.room_code}
                </Typography>
                <Tooltip title="Copy room code">
                  <IconButton onClick={copyRoomCode} sx={{ color: 'white' }}>
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Join Link */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.9 }}>
                  Student Join Link:
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: 1,
                    px: 2,
                    py: 1,
                    maxWidth: '100%'
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      wordBreak: 'break-all'
                    }}
                  >
                    {getJoinUrl()}
                  </Typography>
                  <Tooltip title="Copy join link">
                    <IconButton onClick={copyJoinUrl} size="small" sx={{ color: 'white' }}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Right: QR Code */}
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Scan to Join:
              </Typography>
              <Box
                sx={{
                  display: 'inline-block',
                  p: 2,
                  backgroundColor: 'white',
                  borderRadius: 2,
                  boxShadow: 3
                }}
              >
                <QRCodeSVG
                  value={getJoinUrl()}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </Box>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.9 }}>
                Students can scan this QR code to join
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Chip
            label={wsConnected ? '🟢 Live Connected' : '🔴 Disconnected'}
            sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
          />
        </Box>
      </Paper>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Left Column - Session Info and Controls */}
        <Grid item xs={12} md={4}>
          {/* ✅ UI FIX: Participants - ALWAYS show at top of left column */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ mr: 1, fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {session?.participant_count || 0}
                  </Typography>
                  <Typography color="text.secondary">Participants</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Timer Display - Show question timer and cooldown timer */}
          {currentQuestion && session?.status === 'active' && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Question Timer</Typography>

                {cooldownRemaining > 0 ? (
                  // Cooldown Timer with Skip Button
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Alert severity="info" sx={{ mb: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center' }}>
                        Next Question Starting In
                      </Typography>
                      <Typography variant="h2" sx={{ fontWeight: 700, color: 'primary.main', textAlign: 'center', mb: 2 }}>
                        {cooldownRemaining}s
                      </Typography>
                      {/* ✅ FIX #4A: Skip Cooldown Button */}
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={handleSkipCooldown}
                        sx={{ mt: 1 }}
                      >
                        Skip Cooldown
                      </Button>
                    </Alert>
                  </Box>
                ) : (
                  // Question Timer
                  <Box sx={{ textAlign: 'center', py: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                      <TimerIcon sx={{ mr: 1, color: timeRemaining > 10 ? 'success.main' : timeRemaining > 5 ? 'warning.main' : 'error.main' }} />
                      <Typography
                        variant="h3"
                        color={timeRemaining > 10 ? 'success.main' : timeRemaining > 5 ? 'warning.main' : 'error.main'}
                        sx={{ fontWeight: 700 }}
                      >
                        {timeRemaining}s
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(timeRemaining / (currentQuestion?.time_limit_seconds || 30)) * 100}
                      color={timeRemaining > 10 ? 'success' : timeRemaining > 5 ? 'warning' : 'error'}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Question */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Current Question</Typography>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 700 }}>
                {session?.current_question_index !== null
                  ? session.current_question_index + 1
                  : '-'}
              </Typography>
              <Typography color="text.secondary">
                of {session?.questions?.length || 0}
              </Typography>

              {session?.status === 'active' && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {/* FIX #1: Use participant_count field from backend */}
                    Answers Received: {answersReceived} / {session?.participant_count || 0}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={getCompletionRate()}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {getCompletionRate()}% complete
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Controls */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Session Controls</Typography>

              {/* FIX Issue 2: Auto-Advance Controls - Only show BEFORE quiz starts */}
              {session?.status === 'waiting' && (
                <Box sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    ⚙️ Auto-Advance Settings (Configure Before Starting)
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoAdvanceEnabled}
                        onChange={(e) => handleToggleAutoAdvance(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Enable Auto-Advance"
                  />
                  <TextField
                    label="Cooldown (seconds)"
                    type="number"
                    value={cooldownSeconds}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 10);
                      setCooldownSeconds(val);

                      // FIX #2: Debounce API calls to prevent race conditions
                      // Clear existing debounce timer
                      if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                      }

                      // Wait 500ms after user stops typing before calling API
                      if (autoAdvanceEnabled) {
                        debounceTimerRef.current = setTimeout(() => {
                          console.log('[QuizHost] Debounced auto-advance update:', val);
                          handleToggleAutoAdvance(true, val);
                        }, 500);
                      }
                    }}
                    disabled={!autoAdvanceEnabled}
                    size="small"
                    sx={{ ml: 2, width: 150 }}
                    inputProps={{ min: 1, max: 60 }}
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                    Auto-advance will automatically move to the next question after the timer + cooldown period.
                  </Typography>
                </Box>
              )}

              {/* Show read-only auto-advance status during active quiz */}
              {session?.status === 'active' && autoAdvanceEnabled && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  🚀 Auto-Advance Enabled ({cooldownSeconds}s cooldown)
                </Alert>
              )}

              {session?.status === 'waiting' && (
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleStart}
                  sx={{ mb: 1 }}
                >
                  Start Quiz
                </Button>
              )}

              {session?.status === 'active' && (
                <>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<SkipNextIcon />}
                    onClick={handleNextQuestion}
                    disabled={
                      session.current_question_index === null ||
                      session.current_question_index >= (session?.questions?.length || 0) - 1
                    }
                    sx={{ mb: 1 }}
                  >
                    Next Question
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={() => setEndDialog(true)}
                  >
                    End Quiz
                  </Button>
                </>
              )}

              {session?.status === 'completed' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Quiz completed! Results are available.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ✅ UI FIX: Right Column - Reordered: Question Preview → Leaderboard → Roster */}
        <Grid item xs={12} md={8}>
          {/* 1. Current Question Preview (FIRST - Most important during active quiz) */}
          {currentQuestion && session?.status === 'active' && (
            <Card sx={{ mb: 2, border: 2, borderColor: 'primary.main', boxShadow: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                    📝 Current Question Preview
                  </Typography>
                  <Chip
                    label={`Question ${session.current_question_index + 1} / ${session?.questions?.length || 0}`}
                    color="primary"
                    size="small"
                  />
                </Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  {currentQuestion.text}
                </Typography>
                {currentQuestion.options && (
                  <Grid container spacing={2}>
                    {currentQuestion.options.map((option, index) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Paper
                          sx={{
                            p: 2,
                            backgroundColor: 'action.hover',
                            border: 1,
                            borderColor: 'divider'
                          }}
                        >
                          <Typography>{option}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          )}

          {/* 2. Live Leaderboard (SECOND - Real-time competition) */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <LeaderboardIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Live Leaderboard
                </Typography>
              </Box>

              {leaderboard.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <PeopleIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary">
                    Waiting for participants to join...
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Share the room code: <strong>{session?.room_code}</strong>
                  </Typography>
                </Box>
              ) : (
                <Leaderboard participants={leaderboard} />
              )}
            </CardContent>
          </Card>

          {/* 3. Class Roster Attendance (THIRD - Show if quiz is linked to a class) */}
          {session?.class_id && (
            <RosterPanel roster={roster} session={session} isLoading={isLoadingRoster} />
          )}

          {/* 4. Outsider Panel (FOURTH - Show if there are outsider students) */}
          {session?.class_id && outsiders && outsiders.length > 0 && (
            <OutsiderPanel
              outsiders={outsiders}
              sessionId={sessionId}
              onOutsiderUpdate={() => loadRosterData(sessionId)}
            />
          )}
        </Grid>
      </Grid>

      {/* End Session Dialog */}
      <Dialog open={endDialog} onClose={() => setEndDialog(false)}>
        <DialogTitle>End Quiz Session?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to end this quiz session? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEndDialog(false)}>Cancel</Button>
          <Button onClick={handleEnd} color="error" variant="contained">
            End Session
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={Boolean(copySuccess)}
        autoHideDuration={2000}
        onClose={() => setCopySuccess('')}
        message={copySuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default QuizHost;
