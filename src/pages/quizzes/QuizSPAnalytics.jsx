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

import quizSPService from '../../services/quizSPService';
import { useSnackbar } from '../../hooks/useSnackbar';

const QuizSPAnalytics = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const [analytics, setAnalytics] = useState(null);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
        setParticipants(participantsData);
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
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {analytics.average_score.toFixed(1)}
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
                <TableCell align="right">Total Responses</TableCell>
                <TableCell align="right">Correct</TableCell>
                <TableCell align="right">Incorrect</TableCell>
                <TableCell align="right">Accuracy Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {analytics.question_analytics && analytics.question_analytics.map((q, index) => (
                <TableRow key={q.question_id || index}>
                  <TableCell>Question {index + 1}</TableCell>
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

      {/* Student Performance */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Student Performance
          </Typography>
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
    </Container>
  );
};

export default QuizSPAnalytics;
