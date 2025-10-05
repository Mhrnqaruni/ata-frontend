import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Button, Chip, Card, CardContent, Breadcrumbs, Link } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useAuth } from '../hooks/useAuth';
import studentService from '../services/studentService';
import reviewService from '../services/reviewService';

const StudentProfile = () => {
    const { student_id } = useParams();
    const { user } = useAuth();
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

    const getColumns = (className) => [
        { field: 'assessmentName', headerName: 'Assessment', flex: 2 },
        {
            field: 'createdAt',
            headerName: 'Date',
            width: 120,
            renderCell: (params) => {
                const value = params.row.createdAt;
                if (!value) return 'N/A';
                const date = new Date(value);
                return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
            },
        },
        {
            field: 'mark',
            headerName: 'Mark',
            flex: 1.5,
            renderCell: ({ row }) => {
                if (row.status === 'ABSENT') {
                    return <Chip label="Absent" color="default" size="small" />;
                }
                if (row.status === 'PENDING_REVIEW') {
                    return <Chip label="Pending" color="warning" size="small" />;
                }
                if (row.totalScore !== null && row.maxTotalScore) {
                    const percentage = Math.round((row.totalScore / row.maxTotalScore) * 100);
                    return `${row.totalScore} / ${row.maxTotalScore} (${percentage}%)`;
                }
                return 'N/A';
            },
        },
        {
            field: 'download',
            headerName: 'Report',
            width: 160,
            sortable: false,
            renderCell: ({ row }) => {
                if (row.jobId && row.status !== 'ABSENT' && row.status !== 'PENDING_REVIEW') {
                    const handleDownload = async () => {
                        try {
                            await reviewService.downloadReport(row.jobId, student_id);
                        } catch (downloadError) {
                            console.error('Failed to download report', downloadError);
                        }
                    };
                    return <Button size="small" variant="outlined" onClick={handleDownload}>Download</Button>;
                }
                return null;
            },
        },
    ];

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
                                <Box sx={{ height: 400, width: '100%' }}>
                                    <DataGrid
                                        rows={classData.assessments.map(a => ({ ...a, id: a.jobId }))}
                                        columns={getColumns(classData.className)}
                                        pageSize={5}
                                        rowsPerPageOptions={[5, 10]}
                                        disableSelectionOnClick
                                        density="comfortable"
                                    />
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                ))
            )}
        </Box>
    );
};

export default StudentProfile;