import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, CircularProgress, Alert } from '@mui/material';
import reviewService from '../../services/reviewService';

const RedirectReviewToFirstStudent = () => {
  const { job_id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const getFirstStudent = async () => {
      try {
        const overview = await reviewService.getResultsOverview(job_id);
        const firstPending = overview.studentsPending?.[0]?.studentId;
        const firstGraded = overview.studentsAiGraded?.[0]?.studentId;
        const studentId = firstPending || firstGraded;

        if (studentId) {
          navigate(`/assessments/${job_id}/review/${studentId}`, { replace: true });
        } else {
          setError('No students found for this assessment.');
        }
      } catch (err) {
        setError(err.message || 'Could not load assessment overview.');
      }
    };

    if (job_id) {
      getFirstStudent();
    }
  }, [job_id, navigate]);

  if (error) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }

  return (
    <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
      <CircularProgress />
    </Container>
  );
};

export default RedirectReviewToFirstStudent;