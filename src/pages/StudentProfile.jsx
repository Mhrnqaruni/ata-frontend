import '../components/common/responsive-table.css';
import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Button, Chip, Card, CardContent, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Divider, Snackbar, Tooltip, IconButton, Menu, MenuItem } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import studentService from '../services/studentService';
import reviewService from '../services/reviewService';
import api from '../services/api';
import useTableSort from '../hooks/useTableSort';
import FloatingChatWindow from '../components/chatbot/FloatingChatWindow';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import PageHeader from '../components/common/PageHeader';
import { initialsOf } from '../components/classes/StudentTable';

/**
 * AssessmentsTable component with sorting capability
 * Extracted to allow use of hooks (can't use hooks in map)
 */
const AssessmentsTable = ({ assessments, theme, renderTypeChip, renderMarkCell, handleDownloadReport, handleDownloadQuizReport, reportBusy }) => {
    // Configure sortable columns
    const columnConfig = {
        assessmentName: { type: 'string' },
        createdAt: { type: 'date' },
        totalScore: { type: 'number' }
    };

    // Use sorting hook - default sort by date descending (most recent first)
    const { sortedData, requestSort, sortColumn, sortDirection } = useTableSort(
        assessments || [],
        columnConfig,
        'createdAt',
        'desc'
    );

    if (!assessments || assessments.length === 0) {
        return <Alert severity="info">No assessments for this class yet.</Alert>;
    }

    return (
        <TableContainer>
            <Table className="mst-responsive-table mst-sortable-table mst-table" aria-label="Assessments">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 96 }}>Type</TableCell>
                        <TableCell sx={{ width: '34%' }}>
                            <TableSortLabel
                                active={sortColumn === 'assessmentName'}
                                direction={sortColumn === 'assessmentName' ? sortDirection : 'asc'}
                                onClick={() => requestSort('assessmentName')}
                            >
                                Assessment
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>
                            <TableSortLabel
                                active={sortColumn === 'createdAt'}
                                direction={sortColumn === 'createdAt' ? sortDirection : 'asc'}
                                onClick={() => requestSort('createdAt')}
                            >
                                Date
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>
                            <TableSortLabel
                                active={sortColumn === 'totalScore'}
                                direction={sortColumn === 'totalScore' ? sortDirection : 'asc'}
                                onClick={() => requestSort('totalScore')}
                            >
                                Mark
                            </TableSortLabel>
                        </TableCell>
                        <TableCell align="right" sx={{ width: 200 }}>Report</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedData.map((assessment, index) => (
                        <TableRow
                            key={assessment.type === 'quiz' ? `quiz-${assessment.sessionId}` : `exam-${assessment.jobId}`}
                        >
                            <TableCell data-label="Type">
                                {renderTypeChip(assessment.type)}
                            </TableCell>
                            <TableCell component="th" scope="row" data-label="Assessment">
                                <span className="mst-cell-strong">{assessment.assessmentName}</span>
                            </TableCell>
                            <TableCell data-label="Date">
                                <span className="mst-cell-muted">
                                    {assessment.createdAt
                                        ? new Date(assessment.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                                        : '—'}
                                </span>
                            </TableCell>
                            <TableCell data-label="Mark">
                                {renderMarkCell(assessment)}
                            </TableCell>
                            <TableCell align="right" data-label="Actions">
                                {assessment.type === 'exam' && assessment.jobId && assessment.status === 'GRADED' && (
                                    <Button
                                        size="small"
                                        startIcon={<DownloadRounded />}
                                        variant="outlined"
                                        onClick={event => handleDownloadReport(event,assessment.jobId)}
                                        disabled={reportBusy}
                                        aria-haspopup="menu"
                                    >
                                        Download report
                                    </Button>
                                )}
                                {assessment.type === 'quiz' && assessment.status === 'GRADED' && (
                                    <Button
                                        size="small"
                                        startIcon={<DownloadRounded />}
                                        variant="outlined"
                                        onClick={() => handleDownloadQuizReport(assessment)}
                                    >
                                        Download report
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

const GradeRing = ({ value }) => {
    const pct = value === null || value === undefined ? null : Math.max(0, Math.min(100, value));
    return (
        <div className="mst-ring" role="img" aria-label={pct === null ? 'Overall grade not available' : `Overall grade ${pct.toFixed(0)} percent`}>
            <svg viewBox="0 0 96 96" aria-hidden="true">
                <circle className="mst-ring-track" cx="48" cy="48" r="40" />
                {pct !== null ? <circle className="mst-ring-value" cx="48" cy="48" pathLength="100" r="40" strokeDasharray={`${pct} 100`} /> : null}
            </svg>
            <span className="mst-ring-text">{pct === null ? '—' : `${pct.toFixed(0)}%`}</span>
        </div>
    );
};

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
    const [reportMenu,setReportMenu]=useState(null);
    const [reportBusy,setReportBusy]=useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    // Chat state
    const [chatOpen, setChatOpen] = useState(false);

    useEffect(() => {
        let active = true;
        const fetchStudentData = async () => {
            if (!student_id || !user) return;
            try {
                setLoading(true);
                const data = await studentService.getStudentTranscript(student_id);
                if (!active) return;
                setStudentData(data);
                setError(null);
            } catch (err) {
                if (!active) return;
                setError(err.response?.data?.detail || 'Failed to fetch student data.');
                console.error(err);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchStudentData();
        return () => {active=false;};
    }, [student_id, user]);

    const handleDownloadReport = (event,jobId) => {if(!reportBusy)setReportMenu({anchor:event.currentTarget,jobId});};
    const downloadAssessmentReport = async format => {
        if(reportBusy||!reportMenu)return;
        const jobId=reportMenu.jobId;setReportMenu(null);setReportBusy(true);
        setSnackbarMessage(`Preparing ${format==='pdf'?'PDF':'Word'} report…`);setSnackbarOpen(true);
        try {await reviewService.downloadReport(jobId,student_id,format);setSnackbarMessage('Report downloaded.');}
        catch {setSnackbarMessage('Report download failed. Please try again or choose another format.');}
        finally {setReportBusy(false);setSnackbarOpen(true);}
    };

    const handleDownloadQuizReport = async (assessment) => {
        try {
            // Show notification that report is being generated
            setSnackbarMessage('Generating report with AI feedback...');
            setSnackbarOpen(true);

            if (!assessment || !assessment.sessionId) {
                setSnackbarMessage('Missing quiz session data. Please refresh the page and try again.');
                return;
            }

            const isSelfPaced = assessment.deliveryKind === 'self_paced';
            const studentName = studentData?.name || 'Student';
            let response;

            if (isSelfPaced) {
                if (!assessment.reportStudentId) {
                    setSnackbarMessage('Missing student school ID. Please refresh the page and try again.');
                    return;
                }
                response = await api.get(
                    `/api/quiz-sp-sessions/${assessment.sessionId}/student/${encodeURIComponent(assessment.reportStudentId)}/report.docx`,
                    { responseType: 'blob' }
                );
            } else {
                if (!assessment.participantId) {
                    setSnackbarMessage('Missing participant data. Please refresh the page and try again.');
                    return;
                }
                response = await api.get(
                    `/api/quiz-sessions/${assessment.sessionId}/participants/${assessment.participantId}/report.docx`,
                    { responseType: 'blob' }
                );
            }

            // Create blob URL
            const url = window.URL.createObjectURL(new Blob([response.data]));

            // Create temporary link to trigger download
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from Content-Disposition header or use default
            let filename = `${studentName}_Quiz_Report.docx`;
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
        if (assessment.status === 'UNAVAILABLE') return <Chip label="Unavailable" size="small"/>;
        if (assessment.status === 'PENDING_GRADE') return <Chip label="Awaiting grading" size="small"/>;
        if (assessment.status === 'FAILED') return <Chip label="Grading failed" size="small"/>;
        if (assessment.status === 'ABSENT') {
            return <Chip label="Absent" color="default" size="small" />;
        }
        if (assessment.status === 'PENDING_REVIEW') {
            return <Chip label="Pending" color="warning" size="small" />;
        }
        if (assessment.totalScore !== null && assessment.maxTotalScore) {
            const percentage = Math.round((assessment.totalScore / assessment.maxTotalScore) * 100);
            return (
                <span className="mst-mark">
                    <span className="mst-mark-value">{assessment.totalScore} / {assessment.maxTotalScore}</span>
                    <span className="mst-mark-pct">{percentage}%</span>
                </span>
            );
        }
        return <span className="mst-cell-muted">—</span>;
    };

    const renderTypeChip = (type) => {
        if (type === 'quiz') {
            return <Chip label="Quiz" color="secondary" size="small" />;
        }
        return <Chip label="Exam" color="primary" size="small" />;
    };

    if (loading) {
        return (
            <Box>
                <Skeleton height={64} sx={{ mb: 3.5, maxWidth: 420 }} variant="rounded" />
                <Skeleton height={168} sx={{ mb: 3 }} variant="rectangular" />
                <Skeleton height={260} variant="rectangular" />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    if (!studentData) {
        return <Alert severity="info">No student data found.</Alert>;
    }

    const overallAveragePercent = (() => {
        if (studentData.aggregateAvailable === false) return null;
        const rows = (studentData.classSummaries || []).flatMap((summary) => summary.assessments || []);
        const gradedRows = rows.filter(
            (row) => row.status === 'GRADED' && row.totalScore !== null && row.maxTotalScore
        );
        if (gradedRows.length === 0) return null;
        const percentages = gradedRows.map((row) => (row.totalScore / row.maxTotalScore) * 100);
        const sum = percentages.reduce((acc, val) => acc + val, 0);
        return sum / percentages.length;
    })();

    return (
        <Box>
            <PageHeader
                actions={<Button className="mst-ai" onClick={() => setChatOpen(true)} startIcon={<AutoAwesomeIcon />} variant="contained">Analytics with AI</Button>}
                breadcrumbs={[{ label: 'Classes', to: '/classes' }, { label: studentData.name }]}
                leading={<span aria-hidden="true" className="mst-avatar" data-size="lg">{initialsOf(studentData.name)}</span>}
                subtitle={`Student ID ${studentData.studentId}`}
                title={studentData.name}
            />

            <section aria-label="Grades" className="mst-g1 mst-rim mst-profile-hero" data-enter="">
                <GradeRing value={studentData.overallAveragePercent} />
                <div className="mst-profile-hero-text">
                    <div className="mst-profile-hero-label">Overall grade</div>
                    <div className="mst-profile-hero-note">Weighted by points across every graded quiz and exam.</div>
                    <div className="mst-profile-hero-avg">
                        Overall average <strong>{overallAveragePercent !== null ? `${overallAveragePercent.toFixed(1)}%` : '—'}</strong>
                        <Tooltip title="Overall average is the simple mean of graded quiz and exam percentages. Overall grade is weighted by points.">
                            <IconButton aria-label="What's the difference between overall grade and overall average?" size="small">
                                <HelpOutlineIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </div>
                </div>
                {(() => {
                    if (studentData.aggregateAvailable === false) return null;
        const rows = (studentData.classSummaries || []).flatMap((summary) => summary.assessments || []);
                    const count = (status) => rows.filter((row) => row.status === status).length;
                    return (
                        <div className="mst-minis mst-profile-minis">
                            <div className="mst-mini"><span className="mst-mini-value">{count('GRADED')}</span><span className="mst-mini-label">Graded</span></div>
                            <div className="mst-mini"><span className="mst-mini-value">{count('PENDING_REVIEW')}</span><span className="mst-mini-label">Waiting for you</span></div>
                            <div className="mst-mini"><span className="mst-mini-value">{count('ABSENT')}</span><span className="mst-mini-label">Absent</span></div>
                        </div>
                    );
                })()}
                <div className="mst-profile-hero-classes" hidden={(studentData.classSummaries || []).length < 2}>
                    {(studentData.classSummaries || []).map((summary) => (
                        <div className="mst-profile-hero-class" key={summary.classId}>
                            <span>{summary.className}</span>
                            <strong>{summary.averagePercent !== null ? `${summary.averagePercent.toFixed(1)}%` : '—'}</strong>
                        </div>
                    ))}
                </div>
            </section>

            {studentData.classSummaries.length === 0 ? (
                <Alert severity="info">No classes or assessments found for this student.</Alert>
            ) : (
                studentData.classSummaries.map((classData) => (
                    <Card className="mst-rim mst-class-section" data-enter="" key={classData.classId}>
                        <div className="mst-card-head">
                            <h2 className="mst-card-title">{classData.className}</h2>
                            {studentData.classSummaries.length > 1 ? <Chip color="primary" label={`Class grade ${classData.averagePercent !== null ? `${classData.averagePercent.toFixed(1)}%` : '—'}`} size="small" /> : null}
                        </div>
                        <AssessmentsTable
                            assessments={classData.assessments}
                            theme={theme}
                            renderTypeChip={renderTypeChip}
                            renderMarkCell={renderMarkCell}
                            reportBusy={reportBusy}
                            handleDownloadReport={handleDownloadReport}
                            handleDownloadQuizReport={handleDownloadQuizReport}
                        />
                    </Card>
                ))
            )}

            <Menu anchorEl={reportMenu?.anchor} open={Boolean(reportMenu)} onClose={()=>setReportMenu(null)}>
                <MenuItem onClick={()=>downloadAssessmentReport('pdf')}>PDF (.pdf)</MenuItem>
                <MenuItem onClick={()=>downloadAssessmentReport('docx')}>Word (.docx)</MenuItem>
            </Menu>
            {/* Floating Chat Window */}
            <FloatingChatWindow
                open={chatOpen}
                onClose={() => setChatOpen(false)}
                pageContext="student"
                entityId={studentData?.id}
                entityType="student"
                entityName={studentData?.name}
            />

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
                                                <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
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
