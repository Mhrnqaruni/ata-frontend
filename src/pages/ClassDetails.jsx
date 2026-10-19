// /src/pages/ClassDetails.jsx (FINAL ENHANCED VERSION)

// --- Core React & Router Imports ---
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';

// --- MUI Component Imports ---
import { Box, Button, Skeleton, Alert, AlertTitle, IconButton, Tooltip, Menu, MenuItem, ListItemIcon } from '@mui/material';

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
import FloatingChatWindow from '../components/chatbot/FloatingChatWindow';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PageHeader from '../components/common/PageHeader';

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

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [autoSendMessage, setAutoSendMessage] = useState(null);

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

  // Handler for student progress tracker button
  const handleStudentProgressTracker = (student) => {
    // Create a clear, simple message with student name, ID, and class context
    const className = classData?.name || 'this class';
    const message = `Give me Progress Tracker of student ${student.name} ID(${student.studentId}) from ${className} Class please`;

    // Set message to auto-send
    setAutoSendMessage(message);

    // Open the chat window (or keep it open if already open)
    setChatOpen(true);

    console.log('[ClassDetails] Opening progress tracker for student:', student.name, student.studentId);
  };

  // --- Render Logic ---
  if (isLoading) {
    return (
      <Box>
        <Skeleton height={36} sx={{ mb: 1, maxWidth: 220 }} variant="rounded" />
        <Skeleton height={44} sx={{ mb: 3.5, maxWidth: 360 }} variant="rounded" />
        <div className="mst-grid mst-grid-3">{[0, 1, 2].map((i) => <Skeleton height={104} key={i} variant="rectangular" />)}</div>
        <Skeleton height={320} sx={{ mt: 4 }} variant="rectangular" />
      </Box>
    );
  }
  if (error) return <Alert severity="error"><AlertTitle>Couldn't load this class</AlertTitle>{error}</Alert>;
  if (!classData) return <Alert severity="warning">Could not find class data.</Alert>;

  const confirmationDescription = deleteConfirmation.type === 'student'
    ? `Are you sure you want to remove ${deleteConfirmation.data?.name}? This action cannot be undone.`
    : `Are you sure you want to delete the class "${deleteConfirmation.data?.name}"? All associated students will also be removed. This action is irreversible.`;

  const analyticsCards = [
      { id: 'count', title: 'Students', value: classData.analytics.studentCount, icon: <PeopleAltOutlined /> },
      { id: 'avg', title: 'Class grade', value: classData.analytics.classAverage == null ? 'Unavailable' : `${classData.analytics.classAverage}%`, icon: <FunctionsOutlined /> },
      { id: 'graded', title: 'Assessments graded', value: classData.analytics.assessmentsGraded, icon: <FactCheckOutlined />, tone: 'ok' },
  ];
  
  return (
    <Box>
      <PageHeader
        actions={
          <>
            <Button variant="contained" startIcon={<AddOutlined />} onClick={handleOpenAddStudentModal}>Add student</Button>
            <Button className="mst-ai" startIcon={<AutoAwesomeIcon />} onClick={() => setChatOpen(true)} variant="contained">Analytics with AI</Button>
          </>
        }
        titleAdornment={<Tooltip title="Class options"><IconButton aria-label="Class options" onClick={handleMenuOpen}><MoreVertIcon /></IconButton></Tooltip>}
        breadcrumbs={[{ label: 'Classes', to: '/classes' }, { label: classData.name }]}
        subtitle={classData.description || undefined}
        title={classData.name}
      />

      <div className="mst-grid mst-grid-3">
        {analyticsCards.map((card) => <InfoCard icon={card.icon} key={card.id} title={card.title} tone={card.tone} value={card.value} />)}
      </div>

      <div className="mst-section-label">Students</div>
      <StudentTable
        students={classData.students}
        onEdit={handleOpenEditStudentModal}
        onDelete={handleOpenConfirmStudentDelete}
        onProgressTracker={handleStudentProgressTracker}
      />

      {/* Floating Chat Window */}
      <FloatingChatWindow
        open={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setAutoSendMessage(null);
        }}
        pageContext="class"
        entityId={classData?.id}
        entityType="class"
        entityName={classData?.name}
        autoSendMessage={autoSendMessage}
        onMessageSent={() => setAutoSendMessage(null)}
      />

      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleOpenClassEditModal}><ListItemIcon><EditOutlined fontSize="small"/></ListItemIcon>Edit details</MenuItem>
        <MenuItem onClick={handleExportRoster}><ListItemIcon><DownloadOutlined fontSize="small"/></ListItemIcon>Export roster (.csv)</MenuItem>
        <MenuItem onClick={handleOpenConfirmClassDelete} sx={{ color: 'error.main' }}><ListItemIcon><DeleteOutlineOutlined fontSize="small" color="error"/></ListItemIcon>Delete class</MenuItem>
      </Menu>

      <StudentModal open={studentModal.open} onClose={handleStudentModalClose} onSubmit={handleStudentModalSubmit} mode={studentModal.mode} initialData={studentModal.data} isLoading={studentModal.state.isLoading} error={studentModal.state.error}/>
      <ClassEditModal open={classEditModal.open} onClose={handleClassEditModalClose} onSubmit={handleClassEditModalSubmit} initialData={classData} isLoading={classEditModal.state.isLoading} error={classEditModal.state.error}/>
      <ConfirmationModal open={deleteConfirmation.open} onClose={handleCloseConfirmDelete} onConfirm={deleteConfirmation.type === 'student' ? handleDeleteStudent : handleDeleteClass} title={`Delete ${deleteConfirmation.type === 'student' ? 'Student' : 'Class'}`} description={confirmationDescription}/>
    </Box>
  );
};

export default ClassDetails;
