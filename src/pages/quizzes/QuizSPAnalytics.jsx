// /src/pages/quizzes/QuizSPAnalytics.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Container,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';
import ScoreIcon from '@mui/icons-material/Score';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ImageIcon from '@mui/icons-material/Image';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import quizSPService from '../../services/quizSPService';
import { useSnackbar } from '../../hooks/useSnackbar';
import useTableSort from '../../hooks/useTableSort';
import FloatingChatWindow from '../../components/chatbot/FloatingChatWindow';

const PrePostComparisonSection = ({ comparison }) => {
  if (!comparison) {
    return null;
  }

  if (comparison.available === false) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        Pre/Post comparison unavailable: {comparison.reason || 'No completed pre session.'}
      </Alert>
    );
  }

  const formatMetricLabel = (key) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const formatMetricValue = (key, value) => {
    if (value === null || value === undefined) return 'N/A';
    if (key.includes('accuracy_rate')) {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (key.includes('completion_rate')) {
      return `${Number(value).toFixed(1)}%`;
    }
    if (Number.isInteger(value)) return value;
    return Number(value).toFixed(2);
  };

  const formatDeltaValue = (key, value) => {
    if (value === null || value === undefined) return 'N/A';
    const formatted = formatMetricValue(key, Math.abs(value));
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${formatted}`;
  };

  return (
    <Paper sx={{ mb: 3 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Pre vs Post Comparison
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {comparison.pre_quiz_title || 'Pre Quiz'} vs {comparison.post_quiz_title || 'Post Quiz'}
        </Typography>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Metric</TableCell>
              <TableCell align="right">Pre</TableCell>
              <TableCell align="right">Post</TableCell>
              <TableCell align="right">Delta</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(comparison.metrics || {}).map(([key, values]) => (
              <TableRow key={key}>
                <TableCell>{formatMetricLabel(key)}</TableCell>
                <TableCell align="right">{formatMetricValue(key, values?.pre)}</TableCell>
                <TableCell align="right">{formatMetricValue(key, values?.post)}</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color:
                      values?.delta > 0 ? 'success.main' :
                      values?.delta < 0 ? 'error.main' :
                      'text.secondary'
                  }}
                >
                  {formatDeltaValue(key, values?.delta)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

const QuizSPAnalytics = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const [analytics, setAnalytics] = useState(null);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [classStudents, setClassStudents] = useState([]);  // NEW
  const [outsiders, setOutsiders] = useState([]);  // NEW
  const [absentStudents, setAbsentStudents] = useState([]);  // NEW
  const [isLoading, setIsLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);  // NEW: For floating chat window

  // Sorting configuration for Question Performance table
  const questionColumnConfig = {
    total_responses: { type: 'number' },
    correct_count: { type: 'number' },
    incorrect_count: { type: 'number' },
    accuracy_rate: { type: 'percentage' }
  };

  const {
    sortedData: sortedQuestions,
    requestSort: requestQuestionSort,
    sortColumn: questionSortColumn,
    sortDirection: questionSortDirection
  } = useTableSort(
    analytics?.question_analytics || [],
    questionColumnConfig,
    null,
    'asc'
  );

  // Sorting configuration for Class Students table
  const studentColumnConfig = {
    student_name: { type: 'string' },
    score: { type: 'number' },
    score_percentage: { type: 'percentage' },
    time_spent_seconds: { type: 'number' }
  };

  const {
    sortedData: sortedClassStudents,
    requestSort: requestStudentSort,
    sortColumn: studentSortColumn,
    sortDirection: studentSortDirection
  } = useTableSort(
    classStudents,
    studentColumnConfig,
    'score',
    'desc'
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch analytics, session info, and participants in parallel
        const [analyticsData, sessionData, participantsData] = await Promise.all([
          quizSPService.getSPAnalytics(sessionId),
          quizSPService.getSPSession(sessionId),
          quizSPService.getSPParticipants(sessionId)
        ]);
        setAnalytics(analyticsData);
        setSession(sessionData);

        // NEW: Separate students by roster status
        const classStudentsList = [];
        const outsidersList = [];
        const absentList = [];

        participantsData.forEach(p => {
          if (p.is_outsider) {
            outsidersList.push(p);
          } else {
            classStudentsList.push(p);
          }
        });

        setParticipants(participantsData);
        setClassStudents(classStudentsList);
        setOutsiders(outsidersList);
        // TODO: Fetch absent students from roster endpoint
        setAbsentStudents(absentList);
      } catch (error) {
        console.error('Error fetching data:', error);
        showSnackbar(error.message, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [sessionId, showSnackbar]);

  const handleDownloadReport = async (studentId, studentName) => {
    showSnackbar('Generating report with AI feedback...', 'info');
    try {
      await quizSPService.downloadStudentReport(sessionId, studentId, studentName);
      showSnackbar('Report downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading report:', error);
      showSnackbar('Failed to download report.', 'error');
    }
  };

  const handleDownloadAllReports = async () => {
    const submittedCount = participants.filter((p) => p.status === 'submitted').length;
    if (submittedCount === 0) {
      showSnackbar('No submitted quizzes to download.', 'warning');
      return;
    }

    showSnackbar(`Generating ${submittedCount} reports...`, 'info');
    try {
      await quizSPService.downloadAllReports(sessionId);
      showSnackbar('All reports downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading all reports:', error);
      showSnackbar('Failed to download all reports.', 'error');
    }
  };

  const renderScorePct = (student) => {
    if (typeof student?.score_percentage === 'number') {
      return `${student.score_percentage.toFixed(1)}%`;
    }
    if (analytics?.total_possible_points > 0 && typeof student?.score === 'number') {
      const pct = (student.score / analytics.total_possible_points) * 100;
      return `${pct.toFixed(1)}%`;
    }
    return '—';
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading analytics...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!analytics) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 8 }}>
          <Alert severity="error">Failed to load analytics</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mt: 2 }}
          >
            Go Back
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/quizzes/sp-sessions/${sessionId}/host`)}
        >
          Back to Dashboard
        </Button>
        <Button
          variant="contained"
          startIcon={<CloudDownloadIcon />}
          onClick={handleDownloadAllReports}
          disabled={participants.filter((p) => p.status === 'submitted').length === 0}
        >
          Download All Reports ({participants.filter((p) => p.status === 'submitted').length})
        </Button>
        <Button
          startIcon={<AutoAwesomeIcon />}
          onClick={() => setChatOpen(true)}
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
          Analytics with AI
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
          Quiz Analytics
        </Typography>
      </Box>

      {/* Session Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          {session?.quiz_title || 'Quiz Analytics'}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Session ID
            </Typography>
            <Typography variant="body1">{analytics.session_id}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Status
            </Typography>
            <Chip
              label={session?.status?.toUpperCase() || 'UNKNOWN'}
              color={session?.status === 'completed' ? 'success' : 'default'}
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Total Participants
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {analytics.total_participants}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Submitted
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {analytics.submitted_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScoreIcon color="info" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Average Score
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {typeof analytics.average_score === 'number' ? analytics.average_score.toFixed(1) : '—'}
                </Typography>
                {typeof analytics.total_possible_points === 'number' && analytics.total_possible_points > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    / {analytics.total_possible_points}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScoreIcon color="secondary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Average %
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {typeof analytics.average_percentage === 'number'
                  ? `${analytics.average_percentage.toFixed(1)}%`
                  : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Completion Rate
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {analytics.completion_rate.toFixed(0)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pre/Post Comparison */}
      {analytics.pre_post_comparison && (
        <PrePostComparisonSection comparison={analytics.pre_post_comparison} />
      )}

      {/* Question Performance */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Question Performance
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Question</TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={questionSortColumn === 'total_responses'}
                    direction={questionSortColumn === 'total_responses' ? questionSortDirection : 'asc'}
                    onClick={() => requestQuestionSort('total_responses')}
                  >
                    Total Responses
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={questionSortColumn === 'correct_count'}
                    direction={questionSortColumn === 'correct_count' ? questionSortDirection : 'asc'}
                    onClick={() => requestQuestionSort('correct_count')}
                  >
                    Correct
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={questionSortColumn === 'incorrect_count'}
                    direction={questionSortColumn === 'incorrect_count' ? questionSortDirection : 'asc'}
                    onClick={() => requestQuestionSort('incorrect_count')}
                  >
                    Incorrect
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={questionSortColumn === 'accuracy_rate'}
                    direction={questionSortColumn === 'accuracy_rate' ? questionSortDirection : 'asc'}
                    onClick={() => requestQuestionSort('accuracy_rate')}
                  >
                    Accuracy Rate
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedQuestions.map((q, index) => (
                <TableRow key={q.question_id || index}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">Question {index + 1}</Typography>
                      {q.media_url && (
                        <Tooltip title="View question image">
                          <IconButton
                            size="small"
                            onClick={() => {
                              // Open dialog with image
                              const dialog = document.createElement('div');
                              dialog.innerHTML = `
                                <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;" onclick="this.remove()">
                                  <div style="background: white; padding: 24px; border-radius: 8px; max-width: 90%; max-height: 90%; overflow: auto;" onclick="event.stopPropagation()">
                                    <h3 style="margin-top: 0;">Question ${index + 1}</h3>
                                    <img src="${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${q.media_url}" alt="Question" style="max-width: 100%; border-radius: 8px;" />
                                    <button onclick="this.closest('[style*=fixed]').remove()" style="margin-top: 16px; padding: 8px 16px; cursor: pointer;">Close</button>
                                  </div>
                                </div>
                              `;
                              document.body.appendChild(dialog.firstElementChild);
                            }}
                            sx={{ color: 'primary.main' }}
                          >
                            <ImageIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">{q.total_responses}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={q.correct_count}
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={q.incorrect_count}
                      color="error"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={q.accuracy_rate}
                        sx={{ width: 100, height: 8, borderRadius: 1 }}
                        color={q.accuracy_rate >= 70 ? 'success' : q.accuracy_rate >= 50 ? 'warning' : 'error'}
                      />
                      <Typography variant="body2" sx={{ minWidth: 45 }}>
                        {q.accuracy_rate.toFixed(0)}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Class Students Table */}
      {classStudents.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Class Students ({classStudents.length})
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={studentSortColumn === 'student_name'}
                      direction={studentSortColumn === 'student_name' ? studentSortDirection : 'asc'}
                      onClick={() => requestStudentSort('student_name')}
                    >
                      Student Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Student ID</TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={studentSortColumn === 'score'}
                      direction={studentSortColumn === 'score' ? studentSortDirection : 'asc'}
                      onClick={() => requestStudentSort('score')}
                    >
                      Score
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={studentSortColumn === 'score_percentage'}
                      direction={studentSortColumn === 'score_percentage' ? studentSortDirection : 'asc'}
                      onClick={() => requestStudentSort('score_percentage')}
                    >
                      Score %
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={studentSortColumn === 'time_spent_seconds'}
                      direction={studentSortColumn === 'time_spent_seconds' ? studentSortDirection : 'asc'}
                      onClick={() => requestStudentSort('time_spent_seconds')}
                    >
                      Time Spent
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedClassStudents.map((student, index) => (
                  <TableRow key={student.student_id || index}>
                    <TableCell>{student.student_name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {student.student_id}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="bold">
                        {student.score}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {renderScorePct(student)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {student.status === 'submitted' && (
                        <Chip label="Submitted" color="success" size="small" />
                      )}
                      {student.status === 'in_progress' && (
                        <Chip label="In Progress" color="warning" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {Math.floor(student.time_spent_seconds / 60)}m {student.time_spent_seconds % 60}s
                    </TableCell>
                    <TableCell align="center">
                      {student.status === 'submitted' && (
                        <Tooltip title="Download Report">
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadReport(student.student_id, student.student_name)}
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
        </Paper>
      )}

      {/* Outsider Students Table */}
      {outsiders.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
              Outsider Students ({outsiders.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Students who joined but are not in the class roster
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Student ID</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell align="right">Score %</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {outsiders.map((student, index) => (
                  <TableRow key={student.student_id || index}>
                    <TableCell>{student.student_name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="warning.main">
                        {student.student_id}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="bold">
                        {student.score}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {renderScorePct(student)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {student.status === 'submitted' && (
                        <Chip label="Submitted" color="success" size="small" />
                      )}
                      {student.status === 'in_progress' && (
                        <Chip label="In Progress" color="warning" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          showSnackbar('Assign to student feature coming soon', 'info');
                        }}
                      >
                        Assign to Student
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Student Performance */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            All Students {classStudents.length === 0 && outsiders.length === 0 ? `(${participants.length})` : ''}
          </Typography>
          {classStudents.length === 0 && outsiders.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              This quiz has no class assigned - all participants shown below
            </Typography>
          )}
        </Box>
        {participants.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No students have joined yet
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Student ID</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell align="right">Score %</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Time Spent</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {participants.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell>{student.student_name}</TableCell>
                    <TableCell>{student.student_id}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {student.score}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {renderScorePct(student)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={student.status === 'submitted' ? 'Submitted' : 'In Progress'}
                        color={student.status === 'submitted' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {Math.floor(student.time_spent_seconds / 60)}m {student.time_spent_seconds % 60}s
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {student.status === 'submitted' && (
                        <Tooltip title="Download Report">
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadReport(student.student_id, student.student_name)}
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
        )}
      </Paper>

      {/* Floating Chat Window */}
      <FloatingChatWindow
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        pageContext="quiz_sp_session"
        entityId={sessionId}
        entityType="quiz_sp_session"
        entityName={session?.quiz_title || 'Quiz'}
      />
    </Container>
  );
};

export default QuizSPAnalytics;
