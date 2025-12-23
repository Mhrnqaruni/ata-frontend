// /src/pages/quizzes/QuizAnalytics.jsx - ENHANCED VERSION

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Divider,
  CircularProgress,
  DialogContentText,
  Snackbar,
  TextField
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import PeopleIcon from '@mui/icons-material/People';
import QuizIcon from '@mui/icons-material/Quiz';
import ScoreIcon from '@mui/icons-material/Score';
import TimerIcon from '@mui/icons-material/Timer';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import quizService from '../../services/quizService';

/**
 * Summary stat cards component
 */
const SessionSummaryCards = ({ analytics }) => {
  const stats = [
    {
      title: 'Total Participants',
      value: analytics.total_participants,
      icon: <PeopleIcon fontSize="large" />,
      color: 'primary.main'
    },
    {
      title: 'Average Score',
      value: `${analytics.average_score.toFixed(1)} pts`,
      icon: <ScoreIcon fontSize="large" />,
      color: 'success.main'
    },
    {
      title: 'Questions Completed',
      value: `${analytics.questions_completed}/${analytics.total_questions}`,
      icon: <QuizIcon fontSize="large" />,
      color: 'info.main'
    },
    {
      title: 'Duration',
      value: analytics.duration_minutes ? `${analytics.duration_minutes.toFixed(1)} min` : 'N/A',
      icon: <TimerIcon fontSize="large" />,
      color: 'warning.main'
    }
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    bgcolor: stat.color,
                    color: 'white',
                    p: 1,
                    borderRadius: 1,
                    mr: 2
                  }}
                >
                  {stat.icon}
                </Box>
                <Typography variant="h4" component="div">
                  {stat.value}
                </Typography>
              </Box>
              <Typography color="text.secondary">
                {stat.title}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

/**
 * Class Students Table - Shows all rostered students with ABSENT status for non-participants
 */
const ClassStudentsTable = ({ students, sessionId, onDownloadReport }) => {
  if (!students || students.length === 0) {
    return null;
  }

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Class Students
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          All students enrolled in the class for this quiz
        </Typography>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Name</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Student ID</TableCell>
                <TableCell align="right">Score</TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Correct</TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Accuracy</TableCell>
                <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.student_db_id}>
                  <TableCell>
                    {student.rank ? (
                      <Chip
                        label={`#${student.rank}`}
                        color={student.rank === 1 ? 'primary' : 'default'}
                        size="small"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{student.name}</Typography>
                      {/* Show status on mobile as subtitle */}
                      <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5 }}>
                        {student.status === 'GRADED' && (
                          <Chip label="Graded" color="success" size="small" />
                        )}
                        {student.status === 'ABSENT' && (
                          <Chip label="Absent" color="default" size="small" />
                        )}
                        {student.status === 'PENDING_REVIEW' && (
                          <Chip label="Pending" color="warning" size="small" />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" color="text.secondary">
                      {student.student_school_id}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {student.score !== null ? (
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {student.score}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' } }}>
                          / {student.max_score}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {student.correct_answers !== null ? (
                      `${student.correct_answers} / ${student.total_questions}`
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {student.accuracy !== null ? (
                      <Typography
                        color={
                          student.accuracy >= 0.7 ? 'success.main' :
                          student.accuracy >= 0.4 ? 'warning.main' : 'error.main'
                        }
                      >
                        {(student.accuracy * 100).toFixed(1)}%
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {student.status === 'GRADED' && (
                      <Chip label="Graded" color="success" size="small" />
                    )}
                    {student.status === 'ABSENT' && (
                      <Chip label="Absent" color="default" size="small" />
                    )}
                    {student.status === 'PENDING_REVIEW' && (
                      <Chip label="Pending" color="warning" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {student.status === 'GRADED' && student.participant_id && (
                      <Tooltip title="Download Report">
                        <IconButton
                          size="small"
                          onClick={() => onDownloadReport(sessionId, student.participant_id, student.name)}
                          color="primary"
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {student.status === 'ABSENT' && (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
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
 * Outsiders Table - Shows participants not in the class roster
 */
const OutsidersTable = ({ outsiders, sessionId, onDownloadReport }) => {
  const [assigningOutsiderId, setAssigningOutsiderId] = useState(null);
  const [assignStudentId, setAssignStudentId] = useState('');

  if (!outsiders || outsiders.length === 0) {
    return null;
  }

  const handleStartAssign = (outsider) => {
    setAssigningOutsiderId(outsider.outsider_id || outsider.participant_id);
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
      const outsiderId = outsider.outsider_id || outsider.participant_id;
      const result = await quizService.assignOutsiderToStudent(
        sessionId,
        outsiderId,
        assignStudentId.trim()
      );
      alert(`Successfully assigned to ${result.assigned_to.name}`);
      setAssigningOutsiderId(null);
      setAssignStudentId('');
      window.location.reload();
    } catch (error) {
      console.error('Error assigning outsider:', error);
      alert(`Assignment failed: ${error.message}`);
    }
  };

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Outsider Participants
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Participants who joined but are not enrolled in the class
        </Typography>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Name</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>ID</TableCell>
                <TableCell align="right">Score</TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Correct</TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Accuracy</TableCell>
                <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Status</TableCell>
                <TableCell align="center">Assign</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {outsiders.map((outsider) => (
                <TableRow key={outsider.participant_id}>
                  <TableCell>
                    {outsider.rank ? (
                      <Chip
                        label={`#${outsider.rank}`}
                        color={outsider.rank === 1 ? 'primary' : 'default'}
                        size="small"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{outsider.display_name}</Typography>
                      {/* Show status on mobile as subtitle */}
                      <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5 }}>
                        {outsider.status === 'GRADED' && (
                          <Chip label="Graded" color="success" size="small" />
                        )}
                        {outsider.status === 'PENDING_REVIEW' && (
                          <Chip label="Pending" color="warning" size="small" />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" color="text.secondary">
                      {outsider.student_id || outsider.guest_name || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {outsider.score !== null ? (
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {outsider.score}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' } }}>
                          / {outsider.max_score}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {outsider.correct_answers !== null ? (
                      `${outsider.correct_answers} / ${outsider.total_questions}`
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {outsider.accuracy !== null ? (
                      <Typography
                        color={
                          outsider.accuracy >= 0.7 ? 'success.main' :
                          outsider.accuracy >= 0.4 ? 'warning.main' : 'error.main'
                        }
                      >
                        {(outsider.accuracy * 100).toFixed(1)}%
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {outsider.status === 'GRADED' && (
                      <Chip label="Graded" color="success" size="small" />
                    )}
                    {outsider.status === 'PENDING_REVIEW' && (
                      <Chip label="Pending" color="warning" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {outsider.assigned_student_id ? (
                      <Chip
                        label="Assigned"
                        color="success"
                        size="small"
                        icon={<CheckCircleIcon />}
                      />
                    ) : assigningOutsiderId === (outsider.outsider_id || outsider.participant_id) ? (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <TextField
                          size="small"
                          placeholder="Student ID"
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
                      >
                        Assign
                      </Button>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {outsider.status === 'GRADED' && (
                      <Tooltip title="Download Report">
                        <IconButton
                          size="small"
                          onClick={() => onDownloadReport(sessionId, outsider.participant_id, outsider.display_name)}
                          color="primary"
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
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
 * Question breakdown table component
 */
const QuestionBreakdown = ({ questions }) => {
  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Question Performance
        </Typography>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Question</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Type</TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Responses</TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Correct</TableCell>
                <TableCell align="right">Accuracy</TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Avg Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {questions.map((q, index) => (
                <TableRow key={q.question_id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: { xs: 150, sm: 300 }, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {q.question_text}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Chip label={q.question_type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{q.total_responses}</TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{q.correct_responses}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexDirection: { xs: 'column', sm: 'row' } }}>
                      <Typography variant="body2" sx={{ mr: { xs: 0, sm: 1 }, mb: { xs: 0.5, sm: 0 } }}>
                        {(q.accuracy_rate * 100).toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={q.accuracy_rate * 100}
                        sx={{ width: { xs: 40, sm: 60 } }}
                        color={q.accuracy_rate >= 0.7 ? 'success' : q.accuracy_rate >= 0.4 ? 'warning' : 'error'}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{(q.average_time_ms / 1000).toFixed(1)}s</TableCell>
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
 * Download Progress Dialog
 */
const DownloadProgressDialog = ({ open, onClose, downloading }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Downloading All Reports</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {downloading ?
            'Generating reports with AI feedback for all participants. This may take a minute...' :
            'All reports have been downloaded successfully!'
          }
        </DialogContentText>
        {downloading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={downloading}>
          {downloading ? 'Please wait...' : 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Main QuizAnalytics component
 */
const QuizAnalytics = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [enhancedData, setEnhancedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Download progress state
  const [downloadProgressOpen, setDownloadProgressOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Individual download notification
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    fetchEnhancedAnalyticsData();
  }, [quizId]);

  const fetchEnhancedAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get all sessions for this quiz
      const allSessions = await quizService.getAllSessions();
      const quizSessions = allSessions.filter(s => s.quiz_id === quizId && s.status === 'completed');

      if (quizSessions.length === 0) {
        setError('No completed sessions found for this quiz.');
        return;
      }

      // Get the most recent completed session
      const latestSession = quizSessions.sort((a, b) =>
        new Date(b.ended_at) - new Date(a.ended_at)
      )[0];

      // Fetch enhanced analytics (includes class students, outsiders, and standard analytics)
      const enhancedAnalytics = await quizService.getEnhancedAnalytics(latestSession.id);

      setEnhancedData({
        sessionId: latestSession.id,
        ...enhancedAnalytics
      });

    } catch (err) {
      console.error('Error loading enhanced analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (sessionId, participantId, studentName) => {
    setSnackbarMessage('Generating report with AI feedback...');
    setSnackbarOpen(true);
    try {
      await quizService.downloadParticipantReport(sessionId, participantId, studentName);
      setSnackbarMessage('Report downloaded successfully!');
    } catch (err) {
      console.error('Error downloading report:', err);
      setSnackbarMessage('Failed to download report.');
    }
  };

  const handleDownloadAllReports = async () => {
    setDownloadProgressOpen(true);
    setDownloading(true);

    try {
      await quizService.downloadAllReports(enhancedData.sessionId);
      setDownloading(false);
      // Show success message
      setSnackbarMessage('All reports downloaded successfully!');
      setSnackbarOpen(true);
      // Keep dialog open to show success message
      setTimeout(() => {
        setDownloadProgressOpen(false);
      }, 2000);
    } catch (err) {
      console.error('Error downloading all reports:', err);
      setDownloading(false);
      setDownloadProgressOpen(false);
      setSnackbarMessage('Failed to download all reports.');
      setSnackbarOpen(true);
    }
  };

  const handleExportCSV = async () => {
    if (!enhancedData) return;

    setSnackbarMessage('Generating CSV export...');
    setSnackbarOpen(true);

    try {
      await quizService.exportSessionCSV(enhancedData.sessionId);
      setSnackbarMessage('CSV exported successfully!');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setSnackbarMessage('Failed to export CSV.');
    }
  };

  const handleCloseDownloadProgress = () => {
    if (!downloading) {
      setDownloadProgressOpen(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={60} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/quizzes')}
          sx={{ mb: 2 }}
        >
          Back to Quizzes
        </Button>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!enhancedData || !enhancedData.analytics) {
    return null;
  }

  // Calculate total graded participants
  const gradedClassStudents = enhancedData.class_students?.filter(s => s.status === 'GRADED').length || 0;
  const gradedOutsiders = enhancedData.outsiders?.filter(o => o.status === 'GRADED').length || 0;
  const totalGradedParticipants = gradedClassStudents + gradedOutsiders;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'flex-start' }, mb: 4, gap: 2 }}>
        <Box sx={{ width: '100%' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/quizzes')}
            sx={{ mb: 1 }}
          >
            Back to Quizzes
          </Button>
          <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '1.75rem', md: '3rem' } }}>
            {enhancedData.analytics.quiz_title} - Analytics
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.875rem', md: '1rem' } }}>
            Room Code: {enhancedData.analytics.room_code} • Status: {enhancedData.analytics.status}
          </Typography>
          {enhancedData.analytics.started_at && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
              Started: {new Date(enhancedData.analytics.started_at).toLocaleString()}
              {enhancedData.analytics.ended_at && ` • Ended: ${new Date(enhancedData.analytics.ended_at).toLocaleString()}`}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, width: { xs: '100%', md: 'auto' } }}>
          {totalGradedParticipants > 0 && (
            <Button
              variant="contained"
              startIcon={<CloudDownloadIcon />}
              onClick={handleDownloadAllReports}
              color="primary"
              fullWidth={{ xs: true, sm: false }}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Download All ({totalGradedParticipants})
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            fullWidth={{ xs: true, sm: false }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <SessionSummaryCards analytics={enhancedData.analytics} />

      {/* PARTICIPANTS SECTION - FIRST PRIORITY */}
      <Typography variant="h4" gutterBottom sx={{ mt: 4, mb: 3 }}>
        Participant Results
      </Typography>

      {/* Class Students Table */}
      {enhancedData.session_info.class_id && (
        <ClassStudentsTable
          students={enhancedData.class_students}
          sessionId={enhancedData.sessionId}
          onDownloadReport={handleDownloadReport}
        />
      )}

      {/* Outsiders Table */}
      <OutsidersTable
        outsiders={enhancedData.outsiders}
        sessionId={enhancedData.sessionId}
        onDownloadReport={handleDownloadReport}
      />

      {/* No participants message */}
      {(!enhancedData.class_students || enhancedData.class_students.length === 0) &&
       (!enhancedData.outsiders || enhancedData.outsiders.length === 0) && (
        <Alert severity="info" sx={{ mb: 4 }}>
          No participants found for this session.
        </Alert>
      )}

      {/* Additional Stats */}
      <Grid container spacing={3} sx={{ mb: 4, mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Score Distribution</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Highest</Typography>
                  <Typography variant="h5">{enhancedData.analytics.highest_score}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Median</Typography>
                  <Typography variant="h5">{enhancedData.analytics.median_score.toFixed(1)}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Lowest</Typography>
                  <Typography variant="h5">{enhancedData.analytics.lowest_score}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Overall Performance</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Average Accuracy</Typography>
                  <Typography variant="h5">{(enhancedData.analytics.average_accuracy_rate * 100).toFixed(1)}%</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Active Participants</Typography>
                  <Typography variant="h5">{enhancedData.analytics.active_participants}/{enhancedData.analytics.total_participants}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Question Breakdown - MOVED TO BOTTOM */}
      <Typography variant="h4" gutterBottom sx={{ mt: 4, mb: 3 }}>
        Question Performance
      </Typography>
      {enhancedData.analytics.question_analytics && enhancedData.analytics.question_analytics.length > 0 && (
        <QuestionBreakdown questions={enhancedData.analytics.question_analytics} />
      )}

      {/* Download Progress Dialog */}
      <DownloadProgressDialog
        open={downloadProgressOpen}
        onClose={handleCloseDownloadProgress}
        downloading={downloading}
      />

      {/* Individual Download Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default QuizAnalytics;
