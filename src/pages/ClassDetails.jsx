// /src/pages/ClassDetails.jsx (FINAL ENHANCED VERSION)

// --- Core React & Router Imports ---
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';

// --- MUI Component Imports ---
import { Box, Button, Typography, Grid, Skeleton, Alert, AlertTitle, Breadcrumbs, Link, Stack, IconButton, Tooltip, CircularProgress, Menu, MenuItem, ListItemIcon } from '@mui/material';

// --- Icon Imports ---
import AddOutlined from '@mui/icons-material/AddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import FunctionsOutlined from '@mui/icons-material/FunctionsOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';

// --- Custom Component Imports ---
import InfoCard from '../components/home/InfoCard';
import StudentTable from '../components/classes/StudentTable';
import StudentModal from '../components/classes/StudentModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import ClassEditModal from '../components/classes/ClassEditModal';

// --- Service Import ---
import classService from '../services/classService';
import { useSnackbar } from '../hooks/useSnackbar';

/**
 * The "Class Details" page, with full advanced management capabilities.
 */
const ClassDetails = () => {
  // --- Hooks ---
  const { class_id } = useParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  // --- State Management ---
  const [classData, setClassData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State organized by feature for clarity
  const [studentModal, setStudentModal] = useState({ open: false, mode: 'add', data: null, state: { isLoading: false, error: null } });
  const [classEditModal, setClassEditModal] = useState({ open: false, state: { isLoading: false, error: null } });
  const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, type: null, data: null });
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  // --- Data Fetching ---
  const fetchClassDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await classService.getClassById(class_id);
      setClassData(data);
      setError(null);
    } catch (err) {
      console.error(`Error fetching class details:`, err);
      setError(err.message || "Could not load class details.");
    } finally {
      setIsLoading(false);
    }
  }, [class_id]);

  useEffect(() => { fetchClassDetails(); }, [fetchClassDetails]);

  // --- Event Handlers ---
  const handleOpenAddStudentModal = () => setStudentModal({ open: true, mode: 'add', data: null, state: { isLoading: false, error: null } });
  const handleOpenEditStudentModal = (student) => setStudentModal({ open: true, mode: 'edit', data: student, state: { isLoading: false, error: null } });
  const handleStudentModalClose = () => setStudentModal(prev => ({ ...prev, open: false }));

  const handleStudentModalSubmit = async (formData) => {
    setStudentModal(prev => ({ ...prev, state: { isLoading: true, error: null } }));
    try {
      if (studentModal.mode === 'add') {
        await classService.addStudentToClass(class_id, formData);
        showSnackbar('Student added successfully!', 'success');
      } else {
        await classService.updateStudent(class_id, studentModal.data.id, formData);
        showSnackbar('Student updated successfully!', 'success');
      }
      handleStudentModalClose();
      await fetchClassDetails();
    } catch (err) {
      setStudentModal(prev => ({ ...prev, state: { isLoading: false, error: err.message } }));
    }
  };

  const handleOpenConfirmStudentDelete = (student) => setDeleteConfirmation({ open: true, type: 'student', data: student });
  const handleDeleteStudent = async () => {
    try {
      await classService.removeStudent(class_id, deleteConfirmation.data.id);
      showSnackbar('Student removed successfully.', 'success');
      setDeleteConfirmation({ open: false, type: null, data: null });
      await fetchClassDetails();
    } catch (err)
{
      showSnackbar(err.message, 'error');
      setDeleteConfirmation({ open: false, type: null, data: null });
    }
  };

  const handleMenuOpen = (event) => setMenuAnchorEl(event.currentTarget);
  const handleMenuClose = () => setMenuAnchorEl(null);
  const handleOpenClassEditModal = () => { setClassEditModal({ open: true, state: { isLoading: false, error: null } }); handleMenuClose(); };
  const handleClassEditModalClose = () => setClassEditModal(prev => ({ ...prev, open: false }));

  const handleClassEditModalSubmit = async (formData) => {
    setClassEditModal(prev => ({ ...prev, state: { isLoading: true, error: null } }));
    try {
      await classService.updateClass(class_id, formData);
      showSnackbar('Class details updated successfully!', 'success');
      handleClassEditModalClose();
      await fetchClassDetails();
    } catch (err) {
      setClassEditModal(prev => ({ ...prev, state: { isLoading: false, error: err.message } }));
    }
  };

  const handleExportRoster = async () => {
    try {
      showSnackbar('Preparing your download...', 'info');
      await classService.exportClassRoster(class_id);
    } catch(err) {
      showSnackbar(err.message, 'error');
    }
    handleMenuClose();
  };

  const handleOpenConfirmClassDelete = () => { setDeleteConfirmation({ open: true, type: 'class', data: classData }); handleMenuClose(); };
  const handleDeleteClass = async () => {
    try {
      await classService.deleteClass(class_id);
      showSnackbar('Class deleted successfully.', 'success');
      setDeleteConfirmation({ open: false, type: null, data: null });
      navigate('/classes');
    } catch (err) {
      showSnackbar(err.message, 'error');
      setDeleteConfirmation({ open: false, type: null, data: null });
    }
  };
  const handleCloseConfirmDelete = () => setDeleteConfirmation({ open: false, type: null, data: null });

  // --- Render Logic ---
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Alert severity="error"><AlertTitle>Error</AlertTitle>{error}</Alert></Box>;
  if (!classData) return <Box sx={{ p: 3 }}><Alert severity="warning">Could not find class data.</Alert></Box>;

  const confirmationDescription = deleteConfirmation.type === 'student'
    ? `Are you sure you want to remove ${deleteConfirmation.data?.name}? This action cannot be undone.`
    : `Are you sure you want to delete the class "${deleteConfirmation.data?.name}"? All associated students will also be removed. This action is irreversible.`;

  const analyticsCards = [
      { id: 'count', title: 'Total Students', value: classData.analytics.studentCount, icon: <PeopleAltOutlined /> },
      { id: 'avg', title: 'Class Average', value: `${classData.analytics.classAverage}%`, icon: <FunctionsOutlined /> },
      { id: 'graded', title: 'Assessments Graded', value: classData.analytics.assessmentsGraded, icon: <FactCheckOutlined /> },
  ];
  
  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} underline="hover" color="inherit" to="/classes">Your Classes</Link>
          <Typography color="text.primary">{classData.name}</Typography>
        </Breadcrumbs>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            {/* FIX #1: Added wordBreak to prevent long class names from causing overflow */}
            <Typography variant="h2" sx={{ wordBreak: 'break-word' }}>{classData.name}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
                <Button variant="contained" startIcon={<AddOutlined />} onClick={handleOpenAddStudentModal}>Add Student</Button>
                <Tooltip title="Class Options"><IconButton onClick={handleMenuOpen}><MoreVertIcon /></IconButton></Tooltip>
            </Stack>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {analyticsCards.map(card => (<Grid item xs={12} sm={6} md={4} key={card.id}><InfoCard title={card.title} value={card.value} icon={card.icon} /></Grid>))}
      </Grid>
      
      {/* FIX #2: Made the table container more robust to ensure it contains the scroll */}
      <Box sx={{ width: '100%', overflow: 'auto' }}>
        <StudentTable students={classData.students} onEdit={handleOpenEditStudentModal} onDelete={handleOpenConfirmStudentDelete} />
      </Box>

      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleOpenClassEditModal}><ListItemIcon><EditOutlined fontSize="small"/></ListItemIcon>Edit Details</MenuItem>
        <MenuItem onClick={handleExportRoster}><ListItemIcon><DownloadOutlined fontSize="small"/></ListItemIcon>Export Roster (.csv)</MenuItem>
        <MenuItem onClick={handleOpenConfirmClassDelete} sx={{ color: 'error.main' }}><ListItemIcon><DeleteOutlineOutlined fontSize="small" color="error"/></ListItemIcon>Delete Class</MenuItem>
      </Menu>

      <StudentModal open={studentModal.open} onClose={handleStudentModalClose} onSubmit={handleStudentModalSubmit} mode={studentModal.mode} initialData={studentModal.data} isLoading={studentModal.state.isLoading} error={studentModal.state.error}/>
      <ClassEditModal open={classEditModal.open} onClose={handleClassEditModalClose} onSubmit={handleClassEditModalSubmit} initialData={classData} isLoading={classEditModal.state.isLoading} error={classEditModal.state.error}/>
      <ConfirmationModal open={deleteConfirmation.open} onClose={handleCloseConfirmDelete} onConfirm={deleteConfirmation.type === 'student' ? handleDeleteStudent : handleDeleteClass} title={`Delete ${deleteConfirmation.type === 'student' ? 'Student' : 'Class'}`} description={confirmationDescription}/>
    </>
  );
};

export default ClassDetails;