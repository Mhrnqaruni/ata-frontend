// /src/pages/assessments/FinalResultsPage.jsx (FULL, MERGED VERSION)

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'; // Import useRef and useCallback
import { useParams, Link as RouterLink } from 'react-router-dom';
import { 
  Box, Typography, Button, CircularProgress, Alert, Grid, Card, 
  CardContent, CardHeader, Breadcrumbs, Link as MuiLink, Collapse, Stack // Import Collapse and Stack
} from '@mui/material';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import AssessmentOutlined from '@mui/icons-material/AssessmentOutlined'; // New Icon
import Close from '@mui/icons-material/Close'; // New Icon
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toPng } from 'html-to-image'; // Import the new library

import assessmentService from '../../services/assessmentService';
import ResultsTable from '../../components/assessments/ResultsTable';
import { useSnackbar } from '../../hooks/useSnackbar';

const AISummaryCard = ({ summary }) => (
    // This component is unchanged and correct
    <Card sx={{mb: 4, backgroundColor: 'secondary.light'}}>
        <CardHeader title="AI-Powered Summary" />
        <CardContent>
            <Typography whiteSpace="pre-wrap">{summary}</Typography>
        </CardContent>
    </Card>
);

const FinalResultsPage = () => {
  const { job_id } = useParams();
  const { showSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // --- [Part 1 - State & Refs] ---
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const chartsContainerRef = useRef(null); // Create a ref to target the charts container DOM node
  // --- [END OF PART 1] ---

  useEffect(() => {
    // This data fetching logic is unchanged and correct
    assessmentService.getJobResults(job_id)
      .then(data => setResultsData(data))
      .catch(err => setError("Could not load results. The job may still be processing or an error occurred."))
      .finally(() => setIsLoading(false));
  }, [job_id]);

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      await assessmentService.downloadAllReports(job_id);
    } catch (err) { 
      showSnackbar(err.message, 'error'); 
    } finally { 
      setIsDownloading(false); 
    }
  };

  // All useMemo hooks for data transformation are now filled in
  const tableData = useMemo(() => {
    if (!resultsData) return [];
    
    const findReportTokenForStudent = (studentId) => {
        const studentResult = resultsData.results[studentId];
        if (!studentResult) return null;
        const firstQuestionId = Object.keys(studentResult)[0];
        return studentResult[firstQuestionId]?.reportToken || null;
    };
      
    return resultsData.students.map(student => {
        const studentResults = resultsData.results[student.id] || {};
        const grades = Object.values(studentResults).map(q => q.grade).filter(g => g !== null);
        const finalGrade = grades.length > 0 ? grades.reduce((acc, g) => acc + g, 0) : 0;
        const isEdited = Object.values(studentResults).some(q => q.status === 'edited_by_teacher');
        
        return {
            studentId: student.id,
            studentName: student.name,
            finalGrade,
            status: isEdited ? 'Edited' : 'AI-Graded',
            reportToken: findReportTokenForStudent(student.id),
        };
    });
  }, [resultsData]);

  const gradeDistributionData = useMemo(() => {
    if (!tableData) return [];
    const distribution = { 'A (90+)': 0, 'B (80-89)': 0, 'C (70-79)': 0, 'D (60-69)': 0, 'F (<60)': 0 };
    tableData.forEach(s => {
        if (s.finalGrade >= 90) distribution['A (90+)']++;
        else if (s.finalGrade >= 80) distribution['B (80-89)']++;
        else if (s.finalGrade >= 70) distribution['C (70-79)']++;
        else if (s.finalGrade >= 60) distribution['D (60-69)']++;
        else distribution['F (<60)']++;
    });
    return Object.entries(distribution).map(([name, count]) => ({ name, count }));
  }, [tableData]);

  const questionPerformanceData = useMemo(() => {
    if (!resultsData || !resultsData.analytics) return [];
    return Object.entries(resultsData.analytics.performanceByQuestion).map(([qId, avg]) => ({
        name: `Question ${qId.replace('q','')}`,
        averageScore: avg,
    }));
  }, [resultsData]);


  // --- [Part 2 - New Handler Functions] ---
  const handleToggleAnalytics = () => {
    setAnalyticsOpen(prev => !prev);
  };

  const handleDownloadCharts = useCallback(async () => {
    if (!chartsContainerRef.current) {
      showSnackbar('Could not find charts to download.', 'error');
      return;
    }
    setIsCapturing(true);
    try {
      // Use the html-to-image library to convert the referenced DOM node to a PNG data URL
      const dataUrl = await toPng(chartsContainerRef.current, { quality: 0.95, backgroundColor: '#ffffff' });
      // Use a simple link-click trick to trigger the browser download
      const link = document.createElement('a');
      link.download = `Analytics_${resultsData?.assessmentName.replace(/ /g, '_') || job_id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Chart capture failed:', err);
      showSnackbar('Failed to download charts as image.', 'error');
    } finally {
      setIsCapturing(false);
    }
  }, [resultsData, job_id, showSnackbar]);
  // --- [END OF PART 2] ---

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  if (!resultsData) {
    return <Typography>No results data found for this job.</Typography>;
  }

  const { assessmentName, aiSummary } = resultsData;

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <MuiLink component={RouterLink} underline="hover" color="inherit" to="/assessments">
          Assessments
        </MuiLink>
        <Typography color="text.primary">{assessmentName}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h2">{assessmentName} - Results</Typography>
        <Button 
          variant="contained" 
          startIcon={isDownloading ? <CircularProgress size={20} color="inherit" /> : <FileDownloadOutlined />} 
          onClick={handleDownloadAll} 
          disabled={isDownloading}
        >
          {isDownloading ? 'Preparing...' : 'Download All Reports'}
        </Button>
      </Box>

      {aiSummary && <AISummaryCard summary={aiSummary} />}

      {/* --- [Part 3 - New UI Controls & Collapsible Section] --- */}
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Analytics Dashboard</Typography>
          <Button
            variant="outlined"
            onClick={handleToggleAnalytics}
            startIcon={analyticsOpen ? <Close /> : <AssessmentOutlined />}
          >
            {analyticsOpen ? 'Hide Analytics' : 'Show Analytics'}
          </Button>
        </Box>
        
        <Collapse in={analyticsOpen}>
          <Box ref={chartsContainerRef} sx={{ pt: 3 }}>
            <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: 'flex-end' }}>
                <Button 
                    onClick={handleDownloadCharts}
                    disabled={isCapturing}
                    startIcon={isCapturing ? <CircularProgress size={20} /> : <FileDownloadOutlined />}
                >
                    {isCapturing ? 'Capturing...' : 'Download Charts as PNG'}
                </Button>
            </Stack>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                  <Card>
                      <CardHeader title="Grade Distribution" />
                      <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={gradeDistributionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis allowDecimals={false} label={{ value: 'Students', angle: -90, position: 'insideLeft' }} />
                                  <Tooltip />
                                  <Bar dataKey="count" name="Number of Students" fill="#8884d8" />
                              </BarChart>
                          </ResponsiveContainer>
                      </CardContent>
                  </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                   <Card>
                      <CardHeader title="Performance by Question" />
                      <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                              {/* --- [THE FIX IS APPLIED HERE] --- */}
                              <BarChart data={questionPerformanceData} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis type="number" domain={[0, 100]} />
                                  <YAxis type="category" dataKey="name" />
                                  <Tooltip formatter={(value) => `${value}%`} />
                                  <Bar dataKey="averageScore" name="Average Score" fill="#82ca9d" />
                              </BarChart>
                              {/* --- [END OF FIX] --- */}
                          </ResponsiveContainer>
                      </CardContent>
                  </Card>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Box>
      {/* --- [END OF PART 3] --- */}

      <ResultsTable 
        tableData={tableData} 
        onDownloadReport={(studentId) => assessmentService.downloadStudentReport(job_id, studentId)} 
      />
    </Box>
  );
};
export default FinalResultsPage;