import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Button, Chip, Card, CardContent, Breadcrumbs, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import studentService from '../services/studentService';
import reviewService from '../services/reviewService';

const StudentProfile = () => {
    const { student_id } = useParams();
    const { user } = useAuth();
    const theme = useTheme();
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                                                <TableCell sx={{ fontWeight: 600 }}>Assessment</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Mark</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }} align="right">Report</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {classData.assessments.map((assessment) => (
                                                <TableRow
                                                    key={assessment.jobId}
                                                    hover
                                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                                >
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
                                                        {assessment.jobId && assessment.status !== 'ABSENT' && assessment.status !== 'PENDING_REVIEW' && (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => handleDownloadReport(assessment.jobId)}
                                                            >
                                                                Download
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
        </Box>
    );
};

export default StudentProfile;