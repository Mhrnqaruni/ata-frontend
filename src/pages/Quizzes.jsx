// /src/pages/Quizzes.jsx

// --- Core React Imports ---
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// --- MUI Component Imports ---
import {
  Box,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Skeleton,
  Alert,
  AlertTitle,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import PublishIcon from '@mui/icons-material/Publish';
import AssessmentIcon from '@mui/icons-material/Assessment';

// --- Service Import for Backend Communication ---
import quizService from '../services/quizService';
import classService from '../services/classService';

/**
 * Empty state component for when no quizzes exist
 */
const EmptyState = ({ onAddQuiz }) => (
  <Box sx={{ textAlign: 'center', mt: 8 }}>
    <QuizOutlined sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
    <Typography variant="h3" gutterBottom>Create your first quiz</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>
      Get started by creating an interactive quiz for your students.
      You can add multiple choice, true/false, short answer, and poll questions.
    </Typography>
    <Button variant="contained" startIcon={<AddOutlined />} onClick={onAddQuiz}>
      Create New Quiz
    </Button>
  </Box>
);

/**
 * Quiz card component displaying a single quiz
 */
const QuizCard = ({ quiz, onEdit, onDuplicate, onDelete, onStartSession, onPublish, onReview }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'completed':
        return 'info';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600, flex: 1 }}>
            {quiz.title}
          </Typography>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
        </Box>

        {quiz.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {quiz.description.length > 100
              ? `${quiz.description.substring(0, 100)}...`
              : quiz.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label={getStatusLabel(quiz.status)}
            color={getStatusColor(quiz.status)}
            size="small"
          />
          <Chip
            label={`${quiz.question_count || 0} Questions`}
            size="small"
            variant="outlined"
          />
          {/* NEW: Display class association if quiz is linked to a class */}
          {quiz.class_name && (
            <Chip
              label={`📚 ${quiz.class_name}`}
              size="small"
              variant="outlined"
              color="primary"
            />
          )}
        </Box>

        <Typography variant="caption" color="text.secondary">
          Created: {new Date(quiz.created_at).toLocaleDateString()}
        </Typography>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        {quiz.status === 'completed' ? (
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<AssessmentIcon />}
            onClick={() => onReview(quiz.id)}
          >
            Review Analytics
          </Button>
        ) : quiz.status === 'published' ? (
          <Button
            fullWidth
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => onStartSession(quiz.id)}
          >
            Start Session
          </Button>
        ) : (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => onEdit(quiz.id)}
          >
            Edit Quiz
          </Button>
        )}
      </CardActions>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {quiz.status !== 'completed' && (
          <MenuItem
            onClick={() => {
              handleMenuClose();
              onEdit(quiz.id);
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {quiz.status === 'draft' && (
          <MenuItem
            onClick={() => {
              handleMenuClose();
              onPublish(quiz.id);
            }}
          >
            <PublishIcon fontSize="small" sx={{ mr: 1 }} />
            Publish
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            handleMenuClose();
            onDuplicate(quiz.id);
          }}
        >
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            onDelete(quiz.id);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
};

/**
 * Main Quizzes page component
 */
const Quizzes = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // NEW: Classes for mapping class_id to class_name
  const [classes, setClasses] = useState([]);
  const [classMap, setClassMap] = useState({});

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, quizId: null });

  // Duplicate dialog
  const [duplicateDialog, setDuplicateDialog] = useState({
    open: false,
    quizId: null,
    newTitle: ''
  });

  // NEW: Fetch classes for mapping class_id to class_name
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const fetchedClasses = await classService.getAllClasses();
        setClasses(fetchedClasses || []);

        // Create a map for quick lookup: class_id -> class_name
        const map = {};
        (fetchedClasses || []).forEach(cls => {
          map[cls.id] = cls.name;
        });
        setClassMap(map);
        console.log('[Quizzes] Loaded classes:', fetchedClasses.length);
      } catch (err) {
        console.error('[Quizzes] Failed to load classes:', err);
        // Don't show error - class display is non-critical
        setClasses([]);
        setClassMap({});
      }
    };
    loadClasses();
  }, []);

  const fetchQuizzes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await quizService.getAllQuizzes();

      // NEW: Enrich quiz data with class names
      const enrichedQuizzes = data.map(quiz => ({
        ...quiz,
        class_name: quiz.class_id ? classMap[quiz.class_id] : null
      }));

      setQuizzes(enrichedQuizzes);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch quizzes:", err);
      setError(err.message || "Could not load your quizzes.");
    } finally {
      setIsLoading(false);
    }
  }, [classMap]);

  useEffect(() => {
    // Only fetch quizzes after classMap is populated (or empty)
    if (Object.keys(classMap).length >= 0) {
      fetchQuizzes();
    }
  }, [classMap]);

  const handleCreateQuiz = () => {
    navigate('/quizzes/new');
  };

  const handleEditQuiz = (quizId) => {
    navigate(`/quizzes/${quizId}/edit`);
  };

  const handleStartSession = async (quizId) => {
    try {
      const session = await quizService.createSession(quizId);
      navigate(`/quizzes/sessions/${session.id}/host`);
    } catch (err) {
      console.error("Failed to start session:", err);
      setError(err.message || "Failed to start quiz session.");
    }
  };

  const handlePublish = async (quizId) => {
    try {
      await quizService.publishQuiz(quizId);
      await fetchQuizzes(); // Refresh list
    } catch (err) {
      console.error("Failed to publish quiz:", err);
      setError(err.message || "Failed to publish quiz.");
    }
  };

  const handleOpenDeleteDialog = (quizId) => {
    setDeleteDialog({ open: true, quizId });
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({ open: false, quizId: null });
  };

  const handleConfirmDelete = async () => {
    try {
      await quizService.deleteQuiz(deleteDialog.quizId);
      handleCloseDeleteDialog();
      await fetchQuizzes(); // Refresh list
    } catch (err) {
      console.error("Failed to delete quiz:", err);
      setError(err.message || "Failed to delete quiz.");
      handleCloseDeleteDialog();
    }
  };

  const handleOpenDuplicateDialog = (quizId) => {
    const quiz = quizzes.find(q => q.id === quizId);
    setDuplicateDialog({
      open: true,
      quizId,
      newTitle: quiz ? `${quiz.title} (Copy)` : ''
    });
  };

  const handleCloseDuplicateDialog = () => {
    setDuplicateDialog({ open: false, quizId: null, newTitle: '' });
  };

  const handleConfirmDuplicate = async () => {
    try {
      await quizService.duplicateQuiz(duplicateDialog.quizId, duplicateDialog.newTitle);
      handleCloseDuplicateDialog();
      await fetchQuizzes(); // Refresh list
    } catch (err) {
      console.error("Failed to duplicate quiz:", err);
      setError(err.message || "Failed to duplicate quiz.");
      handleCloseDuplicateDialog();
    }
  };

  const handleReviewAnalytics = (quizId) => {
    // Navigate to analytics page for this quiz
    // We'll need to get the most recent session for this quiz
    navigate(`/quizzes/${quizId}/analytics`);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <Grid container spacing={3}>
          {Array.from(new Array(3)).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      );
    }

    if (error) {
      return (
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      );
    }

    if (!Array.isArray(quizzes)) {
      return (
        <Alert severity="warning">
          Could not display quiz data due to an unexpected format.
        </Alert>
      );
    }

    if (quizzes.length === 0) {
      return <EmptyState onAddQuiz={handleCreateQuiz} />;
    }

    return (
      <Grid container spacing={3}>
        {quizzes.map((quiz) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={quiz.id}>
            <QuizCard
              quiz={quiz}
              onEdit={handleEditQuiz}
              onDuplicate={handleOpenDuplicateDialog}
              onDelete={handleOpenDeleteDialog}
              onStartSession={handleStartSession}
              onPublish={handlePublish}
              onReview={handleReviewAnalytics}
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <>
      <Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mb: 4,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' }
          }}
        >
          <Typography variant="h2" sx={{ mb: { xs: 2, sm: 0 } }}>
            Your Quizzes
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={handleCreateQuiz}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Create New Quiz
          </Button>
        </Box>
        {renderContent()}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Quiz?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this quiz? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialog.open} onClose={handleCloseDuplicateDialog}>
        <DialogTitle>Duplicate Quiz</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter a title for the duplicated quiz:
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="Quiz Title"
            value={duplicateDialog.newTitle}
            onChange={(e) =>
              setDuplicateDialog({ ...duplicateDialog, newTitle: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDuplicateDialog}>Cancel</Button>
          <Button
            onClick={handleConfirmDuplicate}
            variant="contained"
            disabled={!duplicateDialog.newTitle.trim()}
          >
            Duplicate
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Quizzes;
