import RenameActivityDialog from '../components/common/RenameActivityDialog';
// /src/pages/Quizzes.jsx

// --- Core React Imports ---
import React, { useState, useEffect, useCallback } from 'react';
import AddCard from '../components/common/AddCard';
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
  TextField,
  Tabs,
  Tab
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
import quizSPService from '../services/quizSPService';
import { useSnackbar } from '../hooks/useSnackbar';
import PageHeader from '../components/common/PageHeader';
import EmptyStateCard from '../components/common/EmptyState';

/**
 * Empty state component for when no quizzes exist
 */
const EmptyState = ({ onAddQuiz }) => (
  <EmptyStateCard
    action={<Button variant="contained" startIcon={<AddOutlined />} onClick={onAddQuiz}>Create quiz</Button>}
    icon={<QuizOutlined />}
    title="Create your first quiz"
  >
    Run it live with the whole class, or let students take it at their own pace.
  </EmptyStateCard>
);

/**
 * Quiz card component displaying a single quiz
 */
const QuizCard = ({ quiz, displayTitle, onEdit, onDuplicate, onDelete, onRename, onStartSession, onStartSPSession, onResumeSPSession, activeSession, onPublish, onReview }) => {
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
        return 'primary';
      case 'completed':
        return 'success';
      case 'draft':
        return 'default';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const selfPaced = quiz.settings?.mode === 'self_paced';
  const meta = [`${quiz.question_count || 0} ${quiz.question_count === 1 ? 'question' : 'questions'}`, (quiz.audience ? `${quiz.audience.class_ids.length} classes · ${quiz.audience.tag_ids.length} tags${quiz.audience.mode==='filter'?' · filtered':''}` : quiz.class_name)].filter(Boolean).join(' · ');

  return (
    <Card className="mst-rim mst-lift mst-quiz-card" data-enter="">
      <CardContent sx={{ flexGrow: 1 }}>
        <div className="mst-quiz-top">
          <div className="mst-quiz-chips">
            <Chip
              className="mst-status"
              color={selfPaced ? 'default' : 'primary'}
              icon={!selfPaced && activeSession ? <span aria-hidden="true" className="mst-dot mst-chip-dot" data-pulse="true" /> : undefined}
              label={selfPaced ? 'Self-paced' : activeSession ? 'Live now' : 'Live'}
              size="small"
            />
            <Chip color={getStatusColor(quiz.status)} label={getStatusLabel(quiz.status)} size="small" />
          </div>
          <IconButton aria-label={`Options for ${displayTitle}`} onClick={handleMenuOpen} aria-haspopup="menu" aria-expanded={Boolean(anchorEl)} sx={{width:44,height:44}}>
            <MoreVertIcon />
          </IconButton>
        </div>
        <h2 className="mst-quiz-title">{displayTitle}</h2>
        <div className="mst-quiz-meta">{meta}</div>
        {quiz.description && (
          <p className="mst-quiz-desc">{quiz.description}</p>
        )}
        <div className="mst-quiz-date">Created {new Date(quiz.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </CardContent>

      <CardActions className="mst-quiz-actions">
        {quiz.status === 'completed' ? (
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<AssessmentIcon />}
            onClick={() => onReview()}
          >
            View analytics
          </Button>
        ) : quiz.status === 'published' ? (
          quiz.settings?.mode === 'self_paced' ? (
            activeSession ? (
              // Active session exists - show "Resume Session"
              <Button
                fullWidth
                variant="contained"
                startIcon={<span aria-hidden="true" className="mst-dot" data-pulse="true" />}
                onClick={() => onResumeSPSession(activeSession.id)}
              >
                Resume session
              </Button>
            ) : (
              // No active session - show "Start Session"
              <Button
                fullWidth
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={() => onStartSPSession(quiz)}
              >
                Start session
              </Button>
            )
          ) : (
            // Regular quiz - check for active session
            activeSession ? (
              <Button
                fullWidth
                variant="contained"
                startIcon={<span aria-hidden="true" className="mst-dot" data-pulse="true" />}
                onClick={() => navigate(`/quizzes/sessions/${activeSession.id}/host`)}
              >
                Resume session
              </Button>
            ) : (
              <Button
                fullWidth
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={() => onStartSession(quiz.id)}
              >
                Host quiz
              </Button>
            )
          )
        ) : (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => onEdit(quiz.id)}
          >
            Edit quiz
          </Button>
        )}
      </CardActions>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={()=>{handleMenuClose();onRename(quiz);}}><EditIcon fontSize="small" sx={{mr:1}}/>Rename</MenuItem>
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
  const { showSnackbar } = useSnackbar();
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // NEW: Classes for mapping class_id to class_name
  const [classes, setClasses] = useState([]);
  const [classMap, setClassMap] = useState({});

  // NEW: Mode filter state for tabs
  const [modeFilter, setModeFilter] = useState('all');

  // NEW: Track active sessions for each quiz
  const [activeSessions, setActiveSessions] = useState({});
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [renameItem,setRenameItem] = useState(null);

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, quizId: null });
  const [deleting,setDeleting]=useState(false);

  // Duplicate dialog
  const [duplicateDialog, setDuplicateDialog] = useState({
    open: false,
    quizId: null,
    newTitle: ''
  });

  const formatTitle = (quiz) => {
    if (quiz.display_title) return quiz.display_title;
    if (quiz.quiz_phase === 'pre') return `Pre - ${quiz.title}`;
    if (quiz.quiz_phase === 'post') return `Post - ${quiz.title}`;
    return quiz.title;
  };

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

  // NEW: Fetch latest session for all quizzes (both self-paced and regular)
  const fetchLatestSessions = useCallback(async (quizzesList) => {
    try {
      setSessionsLoading(true);

      // Filter self-paced quizzes
      const spQuizzes = quizzesList.filter(q => q.settings?.mode === 'self_paced');

      // Filter regular (live) quizzes
      const regularQuizzes = quizzesList.filter(q => !q.settings?.mode || q.settings?.mode === 'live');

      // Fetch latest session for each SP quiz
      const spSessionPromises = spQuizzes.map(async (quiz) => {
        try {
          const session = await quizSPService.getLatestSPSession(quiz.id);
          return { quizId: quiz.id, session };
        } catch (error) {
          if (error.message.includes('No sessions found')) {
            return { quizId: quiz.id, session: null };
          }
          return { quizId: quiz.id, session: null };
        }
      });

      // Fetch latest session for each regular quiz
      const regularSessionPromises = regularQuizzes.map(async (quiz) => {
        try {
          const session = await quizService.getLatestSession(quiz.id);
          return { quizId: quiz.id, session };
        } catch (error) {
          // getLatestSession returns null for 404, so session will be null
          return { quizId: quiz.id, session: null };
        }
      });

      // Wait for all session fetches to complete
      const allPromises = [...spSessionPromises, ...regularSessionPromises];
      const results = await Promise.all(allPromises);

      // Build activeSessions map
      const sessionsMap = {};
      results.forEach(({ quizId, session }) => {
        if (session && (session.status === 'active' || session.status === 'draft' || session.status === 'waiting')) {
          sessionsMap[quizId] = session;
        }
      });

      setActiveSessions(sessionsMap);
      console.log('[Quizzes] Loaded active sessions:', Object.keys(sessionsMap).length);
    } catch (error) {
      console.error('[Quizzes] Failed to fetch sessions:', error);
      // Don't show error - session tracking is non-critical for page load
    } finally {
      setSessionsLoading(false);
    }
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

      // NEW: Fetch latest sessions after quizzes are loaded
      await fetchLatestSessions(enrichedQuizzes);
    } catch (err) {
      console.error("Failed to fetch quizzes:", err);
      setError(err.message || "Could not load your quizzes.");
    } finally {
      setIsLoading(false);
    }
  }, [classMap, fetchLatestSessions]);

  useEffect(() => {
    // Only fetch quizzes after classMap is populated (or empty)
    if (Object.keys(classMap).length >= 0) {
      fetchQuizzes();
    }
  }, [classMap, fetchQuizzes]);

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
    if(deleting)return;
    setDeleting(true);
    try {
      await quizService.deleteQuiz(deleteDialog.quizId);
      handleCloseDeleteDialog();
      await fetchQuizzes(); // Refresh list
    } catch (err) {
      console.error("Failed to delete quiz:", err);
      setError(err.message || "Failed to delete quiz.");
      handleCloseDeleteDialog();
    }
    finally { setDeleting(false); }
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

  const handleReviewAnalytics = async (quiz) => {
    try {
      // Check if this is a self-paced quiz
      if (quiz.settings?.mode === 'self_paced') {
        // For self-paced quizzes, fetch the latest session
        const latestSession = await quizSPService.getLatestSPSession(quiz.id);
        navigate(`/quizzes/sp-sessions/${latestSession.id}/analytics`);
      } else {
        // For live quizzes, use the quiz analytics page
        navigate(`/quizzes/${quiz.id}/analytics`);
      }
    } catch (error) {
      console.error('Error navigating to analytics:', error);
      showSnackbar(error.message || 'No sessions found for this quiz', 'warning');
    }
  };

  // NEW: Modified to check for existing session first
  const handleCreateSPSession = async (quiz) => {
    const quizId = quiz.id;
    try {
      // Check if active session already exists
      const existingSession = activeSessions[quizId];

      if (existingSession) {
        // Session exists - confirm before creating new one
        const confirmed = window.confirm(
          `An active session already exists for this quiz. Do you want to:\n\n` +
          `- Click "Cancel" to resume the existing session\n` +
          `- Click "OK" to create a NEW session (students in old session will lose access)`
        );

        if (!confirmed) {
          // User chose to resume existing session
          handleResumeSPSession(existingSession.id);
          return;
        }

        // User chose to create new session - proceed
        console.log('[Quizzes] Creating new session despite existing active session');
      }

      // Create new session
      let deadlineMinutes = null;
      if (quiz.settings?.deadline_enabled && quiz.settings?.deadline_minutes) {
        deadlineMinutes = quiz.settings.deadline_minutes;
      }

      const session = await quizSPService.createSPSession(quizId, {
        class_id: quiz.class_id || null,
        deadline_minutes: deadlineMinutes,
        allow_navigation: true,
        allow_review_before_submit: true,
        require_all_answers: false,
        show_timer: true,
        show_results_immediately: false,
        show_final_score_to_students: quiz.settings?.show_final_score_to_students ?? true
      });

      await quizSPService.startSPSession(session.id);

      showSnackbar('Session created!', 'success');

      // Update activeSessions state
      setActiveSessions(prev => ({
        ...prev,
        [quizId]: session
      }));

      navigate(`/quizzes/sp-sessions/${session.id}/host`);
    } catch (error) {
      console.error('Error creating session:', error);
      showSnackbar(error.message, 'error');
    }
  };

  // NEW: Navigate to existing active session
  const handleResumeSPSession = (sessionId) => {
    navigate(`/quizzes/sp-sessions/${sessionId}/host`);
  };

  // NEW: Filter quizzes by mode
  const filteredQuizzes = quizzes.filter(quiz => {
    if (modeFilter === 'all') return true;
    return quiz.settings?.mode === modeFilter || (modeFilter === 'live' && !quiz.settings?.mode);
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="mst-grid mst-grid-auto">
          {Array.from(new Array(3)).map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={232} />
          ))}
        </div>
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
      <div className="mst-grid mst-grid-auto">
        {filteredQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              displayTitle={formatTitle(quiz)}
              onEdit={handleEditQuiz}
              onDuplicate={handleOpenDuplicateDialog}
              onRename={quiz=>setRenameItem({kind:"quiz",id:quiz.id,name:quiz.title})}
              onDelete={handleOpenDeleteDialog}
              onStartSession={handleStartSession}
              onStartSPSession={handleCreateSPSession}
              onResumeSPSession={handleResumeSPSession}
              activeSession={activeSessions[quiz.id]}
              onPublish={handlePublish}
              onReview={() => handleReviewAnalytics(quiz)}
            />
        ))}
        <AddCard hint="Live in class or self-paced" label="Create a quiz" minHeight={232} onClick={handleCreateQuiz} />
      </div>
    );
  };

  return (
    <>
      <Box>
        <PageHeader
          actions={<Button variant="contained" startIcon={<AddOutlined />} onClick={handleCreateQuiz}>Create quiz</Button>}
          subtitle="Live quizzes for the whole class, or self-paced ones they take on their own."
          title="Quizzes"
        />

        {/* NEW: Mode Filter Tabs */}
        <Box sx={{ mb: 3 }}>
          <Tabs aria-label="Filter quizzes" value={modeFilter} onChange={(e, newValue) => setModeFilter(newValue)}>
            <Tab label="All" value="all" />
            <Tab label="Live" value="live" />
            <Tab label="Self-paced" value="self_paced" />
          </Tabs>
        </Box>

        {renderContent()}
      </Box>

      <RenameActivityDialog item={renameItem} onClose={()=>setRenameItem(null)} onSaved={fetchQuizzes}/>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={deleting ? undefined : handleCloseDeleteDialog}>
        <DialogTitle>Delete this quiz?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete this quiz and remove its sessions from normal use? Its grades will no longer count in student, class or tag statistics. Internal history is retained. Open sessions must be ended first.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={deleting} onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button disabled={deleting} onClick={handleConfirmDelete} color="error" variant="contained">
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialog.open} onClose={handleCloseDuplicateDialog}>
        <DialogTitle>Duplicate quiz</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter a title for the duplicated quiz:
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="Title for the copy"
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
