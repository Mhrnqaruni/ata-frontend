// /src/pages/Classes.jsx (FINAL, ROBUST VERSION)

// --- Core React Imports ---
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// --- MUI Component Imports ---
import { Box, Button, Typography, Grid, Skeleton, Alert, AlertTitle } from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';

// --- Custom Component Imports ---
import ClassCard from '../components/classes/ClassCard';
import AddClassModal from '../components/classes/AddClassModal';

// --- Service Import for Backend Communication ---
import classService from '../services/classService';

// --- Sub-Component for the Empty State ---
const EmptyState = ({ onAddClass }) => (
  <Box sx={{ textAlign: 'center', mt: 8 }}>
    <Typography variant="h3" gutterBottom>Create your first class</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>
      Get started by adding a class and its students, either manually or by uploading a roster.
    </Typography>
    <Button variant="contained" startIcon={<AddOutlined />} onClick={onAddClass}>
      Add New Class
    </Button>
  </Box>
);

/**
 * The main dashboard page for the "Your Classes" feature. This is the final,
 * robust version with all bug fixes and defensive checks.
 */
const Classes = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalState, setModalState] = useState({ isLoading: false, error: null });

  const fetchClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await classService.getAllClasses();
      setClasses(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch classes:", err);
      setError(err.message || "Could not load your classes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleOpenModal = () => {
    setModalState({ isLoading: false, error: null });
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = async (classData) => {
    setModalState({ isLoading: true, error: null });
    try {
      if (classData.file) {
        await classService.createClassWithUpload(classData.name, classData.file);
      } else {
        await classService.createClass(classData);
      }
      handleCloseModal();
      await fetchClasses();
    } catch (err) {
      console.error("Failed to create class:", err);
      setModalState({ isLoading: false, error: err.message || "Failed to create class." });
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <Grid container spacing={3}>
          {Array.from(new Array(3)).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      );
    }
    if (error) {
      return <Alert severity="error"><AlertTitle>Error</AlertTitle>{error}</Alert>;
    }
    // <<< CORRECTION: Added a defensive check to prevent crashes if the API
    // ever returns something that isn't an array.
    if (!Array.isArray(classes)) {
      return <Alert severity="warning">Could not display class data due to an unexpected format.</Alert>;
    }
    if (classes.length === 0) {
      return <EmptyState onAddClass={handleOpenModal} />;
    }
    return (
      <Grid container spacing={3}>
        {classes.map((classItem) => (
          <ClassCard key={classItem.id} classData={classItem} />
        ))}
      </Grid>
    );
  };

  return (
    <>
      <Box>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 4,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' }
        }}>
          <Typography variant="h2" sx={{ mb: { xs: 2, sm: 0 } }}>
            Your Classes
          </Typography>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={handleOpenModal} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Add New Class
          </Button>
        </Box>
        {renderContent()}
      </Box>

      <AddClassModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        isLoading={modalState.isLoading}
        error={modalState.error}
      />
    </>
  );
};

export default Classes;