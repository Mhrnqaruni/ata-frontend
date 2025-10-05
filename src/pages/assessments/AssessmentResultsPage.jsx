import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Box, CircularProgress, Alert, Grid } from '@mui/material';
import reviewService from '../../services/reviewService';
import ResultsTable from '../../components/assessments/ResultsTable';
import StatusChip from '../../components/assessments/StatusChip';

const AssessmentResultsPage = () => {
  const { job_id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!job_id) {
      setLoading(false);
      return;
    }
    const fetchResults = async () => {
      try {
        setLoading(true);
        const data = await reviewService.getResultsOverview(job_id);
        setResults(data);
      } catch (err) {
        setError(err.message || 'An error occurred while fetching results.');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [job_id]);

  if (loading) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Container>;
  }

  if (error) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Grid container justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
        <Grid item>
          <Typography variant="h4" gutterBottom>{results?.assessmentName || 'Assessment Results'}</Typography>
        </Grid>
        <Grid item>
          {results?.status && <StatusChip status={results.status} />}
        </Grid>
      </Grid>

      <Box mt={2}>
        <ResultsTable rows={results?.students ?? []} />
      </Box>
    </Container>
  );
};

export default AssessmentResultsPage;