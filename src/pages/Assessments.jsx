// /src/pages/Assessments.jsx (COMPLETE MERGED CODE)

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Stack, Skeleton, Alert, AlertTitle } from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';

import AssessmentCard from '../components/assessments/AssessmentCard';
import ConfirmationModal from '../components/common/ConfirmationModal';
import assessmentService from '../services/assessmentService';
import { useSnackbar } from '../hooks/useSnackbar';

// --- [MISSING PART 1: ADDED BACK] ---
const EmptyState = ({ onGradeNew }) => (
  <Box sx={{ textAlign: 'center', mt: 8, p: 4, backgroundColor: 'grey.50', borderRadius: 2 }}>
    <AssignmentTurnedInOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
    <Typography variant="h3" gutterBottom>
      Grade your first assessment
    </Typography>
    <Typography color="text.secondary" sx={{ mb: 3, maxWidth: '500px', mx: 'auto' }}>
      Save hours of time by letting the AI do the heavy lifting. Create a new grading job to get started.
    </Typography>
    <Button variant="contained" startIcon={<AddOutlined />} onClick={onGradeNew}>
      Grade New Assessment
    </Button>
  </Box>
);
// --- [END OF MISSING PART 1] ---

// --- [MISSING PART 2: ADDED BACK] ---
const LoadingSkeletons = () => (
  <Stack spacing={3}>
    {Array.from(new Array(3)).map((_, index) => (
      <Skeleton key={index} variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
    ))}
  </Stack>
);
// --- [END OF MISSING PART 2] ---

const Assessments = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // --- [MISSING PART 3: ADDED BACK] ---
  const fetchAssessments = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setIsLoading(true);
    try {
      const data = await assessmentService.getAssessments();
      setAssessments(data || []);
      if (isInitialLoad) setError(null);
    } catch (err) {
      console.error("Failed to fetch assessments:", err);
      if (isInitialLoad) {
        setError("Could not load your assessments. Please try refreshing the page.");
      }
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, []);
  // --- [END OF MISSING PART 3] ---

  // --- [MISSING PART 4: ADDED BACK] ---
  useEffect(() => {
    fetchAssessments(true); // Initial fetch
    const intervalId = setInterval(() => fetchAssessments(false), 10000);
    return () => clearInterval(intervalId);
  }, [fetchAssessments]);
  // --- [END OF MISSING PART 4] ---

  const handleOpenConfirm = (job) => {
    setJobToDelete(job);
    setIsConfirmOpen(true);
  };

  const handleCloseConfirm = () => {
    setJobToDelete(null);
    setIsConfirmOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;
    try {
      await assessmentService.deleteAssessment(jobToDelete.id);
      showSnackbar('Assessment deleted successfully.', 'success');
      fetchAssessments(true);
    } catch (err) {
      showSnackbar(err.message || 'Failed to delete assessment.', 'error');
    } finally {
      handleCloseConfirm();
    }
  };

  const handleNavigateToNew = () => {
    navigate('/assessments/new');
  };

  const renderContent = () => {
    if (isLoading) return <LoadingSkeletons />;
    if (error) return <Alert severity="error"><AlertTitle>Error</AlertTitle>{error}</Alert>;
    if (assessments.length === 0) return <EmptyState onGradeNew={handleNavigateToNew} />;
    
    return (
      <Stack spacing={3}>
        {assessments.map((job) => (
          <AssessmentCard 
            key={job.id} 
            job={job}
            onDelete={() => handleOpenConfirm(job)} 
          />
        ))}
      </Stack>
    );
  };

  return (
    <Box>
      <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 4,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' }
        }}>
        <Typography variant="h2" sx={{ mb: { xs: 2, sm: 0 } }}>
          Assessments
        </Typography>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={handleNavigateToNew} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          Grade New Assessment
        </Button>
      </Box>
      {renderContent()}
      
      <ConfirmationModal
        open={isConfirmOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete Assessment?"
        description={`Are you sure you want to permanently delete the assessment "${jobToDelete?.assessmentName}"? This action cannot be undone.`}
      />
    </Box>
  );
};

export default Assessments;