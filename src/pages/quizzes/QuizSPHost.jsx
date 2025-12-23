// /src/pages/quizzes/QuizSPHost.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Container,
  Card,
  CardHeader,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { QRCodeSVG } from 'qrcode.react';

import quizSPService from '../../services/quizSPService';
import { useSnackbar } from '../../hooks/useSnackbar';
import { useAuth } from '../../hooks/useAuth';

/**
 * Deadline Countdown Component
 */
const DeadlineCountdown = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(deadline);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        mt: 0.5,
        color: isExpired ? 'error.main' : 'text.secondary',
        fontWeight: isExpired ? 700 : 400
      }}
    >
      {isExpired ? 'Time expired' : `${timeLeft} remaining`}
    </Typography>
  );
};

/**
 * RosterPanel - Displays class students with join/absent status
 */
const RosterPanel = ({ roster, session, isLoading }) => {
  if (!session?.class_id) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        <AlertTitle>No Class Roster</AlertTitle>
        This quiz is not linked to a class, so roster tracking is not available.
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography>Loading roster...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!roster) {
    return null;
  }

  const { statistics, entries } = roster;
  const joinedStudents = entries.filter((entry) => entry.joined);
  const absentStudents = entries.filter((entry) => !entry.joined);

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader
        title="Class Roster"
        subheader={`${statistics.total_joined} of ${statistics.total_expected} students joined (${Math.round(statistics.join_rate * 100)}% attendance)`}
      />
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip
            icon={<CheckCircleIcon />}
            label={`Joined: ${statistics.total_joined}`}
            color="success"
            variant="outlined"
          />
          <Chip
            icon={<HourglassEmptyIcon />}
            label={`Absent: ${statistics.total_absent}`}
            color="default"
            variant="outlined"
          />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Student ID</TableCell>
                <TableCell>Joined At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {joinedStudents.map((entry) => (
                <TableRow
                  key={entry.id}
                  sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)' }}
                >
                  <TableCell>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Joined"
                      color="success"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{entry.student_name}</TableCell>
                  <TableCell>{entry.student_school_id}</TableCell>
                  <TableCell>
                    {entry.joined_at ? new Date(entry.joined_at).toLocaleTimeString() : '-'}
                  </TableCell>
                </TableRow>
              ))}

              {absentStudents.map((entry) => (
                <TableRow
                  key={entry.id}
                  sx={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
                >
                  <TableCell>
                    <Chip
                      icon={<HourglassEmptyIcon />}
                      label="Absent"
                      color="default"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{entry.student_name}</TableCell>
                  <TableCell>{entry.student_school_id}</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

/**
 * OutsiderPanel - Displays students who joined but weren't on roster
 */
const OutsiderPanel = ({ outsiders, sessionId, onOutsiderUpdate }) => {
  const [loading, setLoading] = React.useState(false);
  const [assigningOutsiderId, setAssigningOutsiderId] = React.useState(null);
  const [assignStudentId, setAssignStudentId] = React.useState('');

  if (!outsiders || outsiders.length === 0) {
    return null;
  }

  const handleStartAssign = (outsider) => {
    setAssigningOutsiderId(outsider.id);
    setAssignStudentId('');
  };

  const handleCancelAssign = () => {
    setAssigningOutsiderId(null);
    setAssignStudentId('');
  };

  const handleConfirmAssign = async (outsider) => {
    if (!assignStudentId.trim()) {
      alert('Please enter a student ID');
      return;
    }

    try {
      setLoading(true);
      const result = await quizSPService.assignOutsiderToStudent(
        sessionId,
        outsider.id,
        assignStudentId.trim()
      );
      alert(`Successfully assigned to ${result.assigned_to.name}`);
      setAssigningOutsiderId(null);
      setAssignStudentId('');
      onOutsiderUpdate();
    } catch (error) {
      console.error('Error assigning outsider:', error);
      alert(`Assignment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDetectionReasonText = (reason) => {
    const reasons = {
      not_in_class: 'Student ID found but not enrolled in this class',
      student_not_found: 'Student ID not found in database',
      roster_not_synced: 'Student is in class but roster was not synced',
      no_class_set: 'Quiz has no class association'
    };
    return reasons[reason] || reason;
  };

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title="Outsider Students"
          subheader={`${outsiders.length} student(s) joined but were not on expected roster`}
        />
        <CardContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>What are Outsiders?</AlertTitle>
            Outsiders are students who joined the quiz but were not on the expected
            class roster. This could be due to:
            <ul>
              <li>Student is enrolled in a different class</li>
              <li>Student ID doesn't exist in the system</li>
              <li>Roster wasn't synced before quiz started</li>
            </ul>
          </Alert>

          <TableContainer>
            <Table size="small">
              <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Student ID</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell align="right">Assign</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
                {outsiders.map((outsider) => (
                  <TableRow key={outsider.id}>
                    <TableCell>{outsider.student_name}</TableCell>
                    <TableCell>{outsider.student_school_id}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {getDetectionReasonText(outsider.detection_reason)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {outsider.assigned_student_id ? (
                        <Chip
                          label="Assigned"
                          color="success"
                          size="small"
                          icon={<CheckCircleIcon />}
                        />
                      ) : assigningOutsiderId === outsider.id ? (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <TextField
                            size="small"
                            placeholder="Enter Student ID"
                            value={assignStudentId}
                            onChange={(event) => setAssignStudentId(event.target.value)}
                            autoFocus
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                handleConfirmAssign(outsider);
                              }
                            }}
                          />
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleConfirmAssign(outsider)}
                            disabled={loading}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton size="small" onClick={handleCancelAssign}>
                            <CloseIcon />
                          </IconButton>
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleStartAssign(outsider)}
                          disabled={loading}
                        >
                          Assign
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </>
  );
};

const QuizSPHost = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [roster, setRoster] = useState(null);
  const [outsiders, setOutsiders] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Fetch session and participants
  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);

      const [sessionData, participantsData] = await Promise.all([
        quizSPService.getSPSession(sessionId),
        quizSPService.getSPParticipants(sessionId)
      ]);

      setSession(sessionData);
      setParticipants(participantsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar(error.message, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [sessionId, showSnackbar]);

  const fetchRosterData = useCallback(async () => {
    if (!session?.class_id) {
      setRoster(null);
      setOutsiders([]);
      return;
    }

    try {
      setRosterLoading(true);
      const [rosterData, outsidersData] = await Promise.all([
        quizSPService.getSPSessionRoster(sessionId).catch(() => null),
        quizSPService.getSPSessionOutsiders(sessionId).catch(() => ({ records: [] }))
      ]);

      setRoster(rosterData);
      setOutsiders(outsidersData.records || []);
    } catch (error) {
      console.error('Error fetching roster data:', error);
    } finally {
      setRosterLoading(false);
    }
  }, [sessionId, session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (session && session.class_id) {
      fetchRosterData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Copy access code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(session.access_code);
    showSnackbar('Access code copied!', 'success');
  };

  // Copy join link
  const handleCopyJoinLink = () => {
    const joinUrl = `${window.location.origin}/quiz/sp/join/${session.access_code}`;
    navigator.clipboard.writeText(joinUrl);
    showSnackbar('Join link copied!', 'success');
  };

  // End session
  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this session? Students will no longer be able to submit answers.')) {
      return;
    }

    try {
      await quizSPService.endSPSession(sessionId);
      showSnackbar('Session ended', 'success');
      fetchData();
    } catch (error) {
      console.error('Error ending session:', error);
      showSnackbar(error.message, 'error');
    }
  };

  // View analytics
  const handleViewAnalytics = () => {
    navigate(`/quizzes/sp-sessions/${sessionId}/analytics`);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading session...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 8 }}>
          <Alert severity="error">Session not found</Alert>
        </Box>
      </Container>
    );
  }

  const joinUrl = `${window.location.origin}/quiz/sp/join/${session.access_code}`;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with Access Code and QR Code */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Typography variant="h3" sx={{ mb: 3, fontWeight: 700, textAlign: 'center' }}>
          {session.quiz_title}
        </Typography>

        <Grid container spacing={4} alignItems="center">
          {/* Left: Access Code and Join Link */}
          <Grid item xs={12} md={8}>
            <Box sx={{ textAlign: 'center' }}>
              {/* Access Code */}
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
                  {session.access_code}
                </Typography>
                <Tooltip title="Copy access code">
                  <IconButton onClick={handleCopyCode} sx={{ color: 'white' }}>
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
                    {joinUrl}
                  </Typography>
                  <Tooltip title="Copy join link">
                    <IconButton onClick={handleCopyJoinLink} size="small" sx={{ color: 'white' }}>
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
                  value={joinUrl}
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
      </Paper>

      {/* Session Info */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Status
              </Typography>
              <Chip
                label={session.status.toUpperCase()}
                color={session.status === 'active' ? 'success' : 'default'}
                sx={{ fontWeight: 600 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Participants
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {session.participant_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Submitted
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {session.submitted_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Deadline
              </Typography>
              {session.deadline ? (
                <>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {new Date(session.deadline).toLocaleTimeString()}
                  </Typography>
                  <DeadlineCountdown deadline={session.deadline} />
                </>
              ) : (
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  No deadline
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={async () => {
            await fetchData(false);
            if (session?.class_id) {
              await fetchRosterData();
            }
          }}
          disabled={isRefreshing || rosterLoading}
        >
          {isRefreshing || rosterLoading ? 'Refreshing...' : 'Refresh All'}
        </Button>

        <Button
          variant="outlined"
          startIcon={<AnalyticsIcon />}
          onClick={handleViewAnalytics}
          disabled={session.status !== 'completed'}
        >
          View Analytics
        </Button>

        {session.status === 'active' && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<StopIcon />}
            onClick={handleEndSession}
          >
            End Session
          </Button>
        )}
      </Box>

      <RosterPanel roster={roster} session={session} isLoading={rosterLoading} />

      <OutsiderPanel
        outsiders={outsiders}
        sessionId={sessionId}
        onOutsiderUpdate={fetchRosterData}
      />

      {/* Participants Table */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Participants
          </Typography>
        </Box>

        {participants.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <HourglassEmptyIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">
              No students have joined yet
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Share the access code with your students
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Time Spent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {participants.map((participant) => (
                  <TableRow key={participant.student_id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {participant.student_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {participant.student_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ width: 200 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                            {participant.progress_percentage.toFixed(0)}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Q{participant.current_question_index + 1}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={participant.progress_percentage}
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {participant.score}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={participant.status === 'submitted' ? <CheckCircleIcon /> : <HourglassEmptyIcon />}
                        label={participant.status === 'submitted' ? 'Submitted' : 'In Progress'}
                        color={participant.status === 'submitted' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {Math.floor(participant.time_spent_seconds / 60)}m {participant.time_spent_seconds % 60}s
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

    </Container>
  );
};

export default QuizSPHost;
