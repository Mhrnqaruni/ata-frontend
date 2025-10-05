// /src/pages/AdminDashboard.jsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import adminService from '../services/adminService';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const result = await adminService.getDashboardData();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const { summary, users, classes, students, assessments, results, outsider_students, chat_sessions, generations, ai_runs } = data;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" gutterBottom fontWeight="bold" color="primary">
        🔒 Super Admin Dashboard
      </Typography>

      {/* SUMMARY STATISTICS - BOLD AND PROMINENT */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          📊 DATABASE SUMMARY
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {summary.total_users}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  Total Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {summary.total_classes}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  Total Classes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {summary.total_students}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  Total Students
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {summary.total_assessments}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  Total Assessments
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {summary.total_results}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  Total Results
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {summary.total_chat_sessions}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  Chat Sessions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {summary.total_generations}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  AI Generations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}>
              <CardContent>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {summary.total_memberships}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  Class Memberships
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* EXPANDABLE SECTIONS */}

      {/* USERS TABLE */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">
            👥 Users ({users.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Full Name</strong></TableCell>
                  <TableCell><strong>Active</strong></TableCell>
                  <TableCell><strong>Classes</strong></TableCell>
                  <TableCell><strong>Assessments</strong></TableCell>
                  <TableCell><strong>Chat Sessions</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.full_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip label={user.is_active ? 'Yes' : 'No'} color={user.is_active ? 'success' : 'error'} size="small" />
                    </TableCell>
                    <TableCell>{user.classes_count}</TableCell>
                    <TableCell>{user.assessments_count}</TableCell>
                    <TableCell>{user.chat_sessions_count}</TableCell>
                    <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* CLASSES TABLE */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">
            🏫 Classes ({classes.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Owner</strong></TableCell>
                  <TableCell><strong>Students</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell>{cls.name}</TableCell>
                    <TableCell>{cls.description || 'N/A'}</TableCell>
                    <TableCell>{cls.owner_email}</TableCell>
                    <TableCell>{cls.student_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* STUDENTS TABLE */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">
            🎓 Students ({students.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Student ID</strong></TableCell>
                  <TableCell><strong>Overall Grade</strong></TableCell>
                  <TableCell><strong>Classes</strong></TableCell>
                  <TableCell><strong>Class Names</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>{student.overallGrade || 'N/A'}</TableCell>
                    <TableCell>{student.classes_count}</TableCell>
                    <TableCell>{student.classes.join(', ') || 'None'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* ASSESSMENTS TABLE */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">
            📝 Assessments ({assessments.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>ID</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Owner</strong></TableCell>
                  <TableCell><strong>Total Pages</strong></TableCell>
                  <TableCell><strong>Results</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>{assessment.id.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <Chip label={assessment.status} color="primary" size="small" />
                    </TableCell>
                    <TableCell>{assessment.owner_email}</TableCell>
                    <TableCell>{assessment.total_pages || 'N/A'}</TableCell>
                    <TableCell>{assessment.results_count}</TableCell>
                    <TableCell>{assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* RESULTS TABLE (Limited to 100) */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">
            ✅ Results (Showing first 100 of {summary.total_results})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Student</strong></TableCell>
                  <TableCell><strong>Question ID</strong></TableCell>
                  <TableCell><strong>Grade</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Finalized By</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{result.student_name || 'Unknown'}</TableCell>
                    <TableCell>{result.question_id}</TableCell>
                    <TableCell>{result.grade !== null ? result.grade : 'N/A'}</TableCell>
                    <TableCell>
                      <Chip label={result.status} size="small" />
                    </TableCell>
                    <TableCell>{result.finalized_by || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* OUTSIDER STUDENTS TABLE */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">
            👤 Outsider Students ({outsider_students.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Job ID</strong></TableCell>
                  <TableCell><strong>Results Count</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {outsider_students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.job_id.substring(0, 8)}...</TableCell>
                    <TableCell>{student.results_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* CHAT SESSIONS TABLE */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">
            💬 Chat Sessions ({chat_sessions.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Title</strong></TableCell>
                  <TableCell><strong>Owner</strong></TableCell>
                  <TableCell><strong>Messages</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chat_sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{session.title || 'Untitled'}</TableCell>
                    <TableCell>{session.owner_email}</TableCell>
                    <TableCell>{session.messages_count}</TableCell>
                    <TableCell>{session.created_at ? new Date(session.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* AI GENERATIONS TABLE */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">
            🤖 AI Generations ({generations.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Tool Type</strong></TableCell>
                  <TableCell><strong>Owner</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {generations.map((gen) => (
                  <TableRow key={gen.id}>
                    <TableCell>{gen.tool_type}</TableCell>
                    <TableCell>{gen.owner_email}</TableCell>
                    <TableCell>{gen.created_at ? new Date(gen.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* AI MODEL RUNS TABLE */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">
            🧠 AI Model Runs ({ai_runs.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Job ID</strong></TableCell>
                  <TableCell><strong>Question ID</strong></TableCell>
                  <TableCell><strong>Run Index</strong></TableCell>
                  <TableCell><strong>Grade</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ai_runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{run.job_id.substring(0, 8)}...</TableCell>
                    <TableCell>{run.question_id}</TableCell>
                    <TableCell>{run.run_index}</TableCell>
                    <TableCell>{run.grade !== null ? run.grade : 'N/A'}</TableCell>
                    <TableCell>{run.created_at ? new Date(run.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
    </Container>
  );
};

export default AdminDashboard;
