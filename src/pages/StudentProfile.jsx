import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Button, Chip, Card, CardContent, Breadcrumbs, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Divider, Snackbar } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import studentService from '../services/studentService';
import reviewService from '../services/reviewService';
import api from '../services/api';

const StudentProfile = () => {
    const { student_id } = useParams();
    const { user } = useAuth();
    const theme = useTheme();
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Quiz details modal state
    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [quizDetails, setQuizDetails] = useState(null);
    const [quizDetailsLoading, setQuizDetailsLoading] = useState(false);

    // Snackbar state for download notification
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    useEffect(() => {
        const fetchStudentData = async () => {
            if (!student_id || !user) return;
            try {
                setLoading(true);
                const data = await studentService.getStudentTranscript(student_id);
                setStudentData(data);
                setError(null);
            } catch (err) {
                setError(err.response?.data?.detail || 'Failed to fetch student data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentData();
    }, [student_id, user]);

    const handleDownloadReport = async (jobId) => {
        try {
            await reviewService.downloadReport(jobId, student_id);
        } catch (downloadError) {
            console.error('Failed to download report', downloadError);
        }
    };

    const handleDownloadQuizReport = async (sessionId, participantId, studentName) => {
        try {
            // Show notification that report is being generated
            setSnackbarMessage('Generating report with AI feedback...');
            setSnackbarOpen(true);

            const response = await api.get(
                `/api/quiz-sessions/${sessionId}/participants/${participantId}/report.docx`,
                { responseType: 'blob' }
            );

            // Create blob URL
            const url = window.URL.createObjectURL(new Blob([response.data]));

            // Create temporary link to trigger download
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from Content-Disposition header or use default
            let filename = `${studentName || 'Student'}_Quiz_Report.docx`;
            const contentDisposition = response.headers['content-disposition'];
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
            link.setAttribute('download', filename);

            // Trigger download
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

            // Cleanup
            window.URL.revokeObjectURL(url);

            // Update notification to success
            setSnackbarMessage('Report downloaded successfully!');
        } catch (downloadError) {
            console.error('Failed to download quiz report', downloadError);
            setSnackbarMessage('Failed to download report. Please try again.');
        }
    };

    const handleViewQuizDetails = async (participantId, sessionId) => {
        try {
            setQuizDetailsLoading(true);
            setQuizModalOpen(true);

            // Fetch detailed quiz analytics for this participant
            const response = await api.get(`/api/quiz-sessions/${sessionId}/participants/${participantId}/analytics`);
            setQuizDetails(response.data);
        } catch (err) {
            console.error('Failed to load quiz details', err);
            setQuizDetails(null);
        } finally {
            setQuizDetailsLoading(false);
        }
    };

    const handleCloseQuizModal = () => {
        setQuizModalOpen(false);
        setQuizDetails(null);
    };

    const handleCloseSnackbar = () => {
        setSnackbarOpen(false);
    };

    const renderMarkCell = (assessment) => {
        if (assessment.status === 'ABSENT') {
            return <Chip label="Absent" color="default" size="small" />;
        }
        if (assessment.status === 'PENDING_REVIEW') {
            return <Chip label="Pending" color="warning" size="small" />;
        }
        if (assessment.totalScore !== null && assessment.maxTotalScore) {
            const percentage = Math.round((assessment.totalScore / assessment.maxTotalScore) * 100);
            return `${assessment.totalScore} / ${assessment.maxTotalScore} (${percentage}%)`;
        }
        return 'N/A';
    };

    const renderTypeChip = (type) => {
        if (type === 'quiz') {
            return <Chip label="Quiz" color="info" size="small" sx={{ mr: 1 }} />;
        }
        return <Chip label="Exam" color="primary" size="small" sx={{ mr: 1 }} />;
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    if (!studentData) {
        return <Alert severity="info">No student data found.</Alert>;
    }

    return (
        <Box>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link component={RouterLink} underline="hover" color="inherit" to="/classes">
                    Classes
                </Link>
                <Typography color="text.primary">{studentData.name}</Typography>
            </Breadcrumbs>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h4" gutterBottom>{studentData.name}</Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                    Student ID: {studentData.studentId}
                </Typography>
                <Typography variant="h5" color="primary" sx={{ mt: 2 }}>
                    Overall Average: {studentData.overallAveragePercent !== null
                        ? `${studentData.overallAveragePercent.toFixed(2)}%`
                        : 'N/A'}
                </Typography>
            </Paper>

            {studentData.classSummaries.length === 0 ? (
                <Alert severity="info">No classes or assessments found for this student.</Alert>
            ) : (
                studentData.classSummaries.map((classData) => (
                    <Card key={classData.classId} sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h5" gutterBottom>
                                {classData.className}
                            </Typography>
                            <Typography variant="h6" color="secondary" sx={{ mb: 2 }}>
                                Class Average: {classData.averagePercent !== null
                                    ? `${classData.averagePercent.toFixed(2)}%`
                                    : 'N/A'}
                            </Typography>

                            {classData.assessments.length === 0 ? (
                                <Alert severity="info">No assessments for this class yet.</Alert>
                            ) : (
                                <TableContainer>
                                    <Table aria-label="assessments table">
                                        <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Assessment</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Mark</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {classData.assessments.map((assessment, index) => (
                                                <TableRow
                                                    key={assessment.type === 'quiz' ? `quiz-${assessment.sessionId}` : `exam-${assessment.jobId}`}
                                                    hover
                                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                                >
                                                    <TableCell>
                                                        {renderTypeChip(assessment.type)}
                                                    </TableCell>
                                                    <TableCell component="th" scope="row">
                                                        <Typography variant="body1">{assessment.assessmentName}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {assessment.createdAt
                                                                ? new Date(assessment.createdAt).toLocaleDateString()
                                                                : 'N/A'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body1">
                                                            {renderMarkCell(assessment)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {assessment.type === 'exam' && assessment.jobId && assessment.status !== 'ABSENT' && assessment.status !== 'PENDING_REVIEW' && (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => handleDownloadReport(assessment.jobId)}
                                                            >
                                                                Download Report
                                                            </Button>
                                                        )}
                                                        {assessment.type === 'quiz' && assessment.status === 'GRADED' && (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => handleDownloadQuizReport(
                                                                    assessment.sessionId,
                                                                    assessment.participantId,
                                                                    studentData.name
                                                                )}
                                                            >
                                                                Download Report
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </CardContent>
                    </Card>
                ))
            )}

            {/* Quiz Details Modal */}
            <Dialog
                open={quizModalOpen}
                onClose={handleCloseQuizModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Quiz Performance Details
                </DialogTitle>
                <DialogContent>
                    {quizDetailsLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : quizDetails ? (
                        <Box>
                            {/* Summary Section */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom>
                                        {quizDetails.quiz_title}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="primary">
                                            {quizDetails.score || 0}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Total Score
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="success.main">
                                            {quizDetails.correct_answers || 0}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Correct Answers
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4">
                                            {quizDetails.total_answers || 0}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Total Questions
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="info.main">
                                            {quizDetails.accuracy ? `${quizDetails.accuracy.toFixed(0)}%` : '0%'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Accuracy
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            {/* Question-by-Question Breakdown */}
                            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                Question Breakdown
                            </Typography>
                            {quizDetails.responses && quizDetails.responses.length > 0 ? (
                                quizDetails.responses.map((response, idx) => (
                                    <Card key={response.response_id} sx={{ mb: 2 }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                    Question {idx + 1}: {response.question_text}
                                                </Typography>
                                                <Chip
                                                    label={response.is_correct ? 'Correct' : 'Incorrect'}
                                                    color={response.is_correct ? 'success' : 'error'}
                                                    size="small"
                                                />
                                            </Box>

                                            {/* Show student's answer */}
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                <strong>Student Answer:</strong> {response.student_answer || 'No answer'}
                                            </Typography>

                                            {/* Show correct answer if student was wrong */}
                                            {!response.is_correct && response.correct_answer && (
                                                <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                                                    <strong>Correct Answer:</strong> {response.correct_answer}
                                                </Typography>
                                            )}

                                            {/* Show explanation if available */}
                                            {response.explanation && (
                                                <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                                    <strong>Explanation:</strong> {response.explanation}
                                                </Typography>
                                            )}

                                            {/* Points earned */}
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                Points: {response.points_earned || 0} / {response.max_points || 0}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <Alert severity="info">No question details available.</Alert>
                            )}
                        </Box>
                    ) : (
                        <Alert severity="error">Failed to load quiz details.</Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseQuizModal} variant="contained">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for download notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    );
};

export default StudentProfile;