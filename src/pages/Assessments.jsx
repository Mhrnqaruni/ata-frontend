// /src/pages/Assessments.jsx (COMPLETE MERGED CODE)

import React, { useState, useEffect, useCallback } from 'react';
import AddCard from '../components/common/AddCard';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Skeleton, Alert, AlertTitle } from '@mui/material';
import PageHeader from '../components/common/PageHeader';
import EmptyStateCard from '../components/common/EmptyState';
import AddOutlined from '@mui/icons-material/AddOutlined';
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';

import RenameActivityDialog from '../components/common/RenameActivityDialog';
import AssessmentCard from '../components/assessments/AssessmentCard';
import ConfirmationModal from '../components/common/ConfirmationModal';
import assessmentService from '../services/assessmentService';
import quickService from '../services/quickAssessmentService';
import { useSnackbar } from '../hooks/useSnackbar';

// --- [MISSING PART 1: ADDED BACK] ---
const EmptyState = ({ onGradeNew }) => (
  <EmptyStateCard
    action={<Button variant="contained" startIcon={<AddOutlined />} onClick={onGradeNew}>Grade new assessment</Button>}
    icon={<AssignmentTurnedInOutlined />}
    title="Grade your first assessment"
  >
    Upload a question paper, its mark scheme and your students' answer sheets. AI marks each answer three times.
  </EmptyStateCard>
);
// --- [END OF MISSING PART 1] ---

// --- [MISSING PART 2: ADDED BACK] ---
const LoadingSkeletons = () => (
  <div className="mst-grid mst-grid-3">
    {Array.from(new Array(3)).map((_, index) => (
      <Skeleton key={index} variant="rectangular" height={188} />
    ))}
  </div>
);
// --- [END OF MISSING PART 2] ---

const Assessments = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [assessments, setAssessments] = useState([]);
  const [quickPreparations, setQuickPreparations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncError,setSyncError]=useState(false);
  const [renameItem, setRenameItem] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [deleting,setDeleting]=useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // --- [MISSING PART 3: ADDED BACK] ---
  const fetchAssessments = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setIsLoading(true);
    try {
      const [data, preparations] = await Promise.all([assessmentService.getAssessments(), quickService.list()]);
      setQuickPreparations(preparations);
      setAssessments(data || []);
      setSyncError(false);
      if (isInitialLoad) setError(null);
      return data || [];
    } catch (err) {
      setSyncError(true);
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
    let stopped=false, timer, running=false;
    const poll=async(initial=false)=>{
      if(stopped || running)return;
      running=true;
      const data=await fetchAssessments(initial);
      running=false;
      if(!stopped && !document.hidden)timer=setTimeout(()=>poll(),data?.some(job=>['Queued','Processing','Summarizing'].includes(job.status))?5000:15000);
    };
    const visible=()=>{clearTimeout(timer);if(!document.hidden)poll();};
    poll(true);
    document.addEventListener('visibilitychange',visible);
    return ()=>{stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);};
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
    if (!jobToDelete || deleting) return;
    setDeleting(true);
    try {
      await assessmentService.deleteAssessment(jobToDelete.id);
      showSnackbar('Assessment deleted successfully.', 'success');
      fetchAssessments(true);
    } catch (err) {
      showSnackbar(err.message || 'Failed to delete assessment.', 'error');
    } finally {
      setDeleting(false);
      handleCloseConfirm();
    }
  };

  const handleNavigateToNew = () => {
    navigate('/assessments/new');
  };

  const renderContent = () => {
    if (isLoading) return <LoadingSkeletons />;
    if (error) return <Alert severity="error"><AlertTitle>Couldn't load your assessments</AlertTitle>{error}</Alert>;
    if (assessments.length === 0) return <EmptyState onGradeNew={handleNavigateToNew} />;
    
    return (
      <Box className="mst-grid" sx={{ gridTemplateColumns: 'minmax(0,1fr)', '@media(min-width:1000px)': { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }, '@media(min-width:1280px)': { gridTemplateColumns: 'repeat(3,minmax(0,1fr))' } }}>
        {assessments.map((job) => (
          <AssessmentCard 
            key={job.id} 
            job={job}
            onRename={() => setRenameItem({kind:"assessment",id:job.id,name:job.assessmentName})}
            onDelete={() => handleOpenConfirm(job)} 
          />
        ))}
        <AddCard hint="A paper, its mark scheme and the answer sheets" label="Grade a new assessment" minHeight={188} onClick={handleNavigateToNew} />
      </Box>
    );
  };

  return (
    <Box>
      <PageHeader
        actions={<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}><Button variant="outlined" onClick={() => navigate("/assessments/quick")}>Quick assessment</Button><Button variant="contained" startIcon={<AddOutlined />} onClick={handleNavigateToNew}>Grade new assessment</Button></Box>}
        subtitle="Handwritten answers, marked three times by AI and checked by you."
        title="Assessments"
      />
      {syncError && <Alert severity="warning" sx={{mb:2}}>Reconnecting for status updates. Showing the last known progress.</Alert>}
      {quickPreparations.map(p => <Alert key={p.id} severity={['failed','interrupted','needs_input'].includes(p.status) ? 'warning' : 'info'} sx={{ mb: 2 }} action={<Button onClick={() => navigate(`/assessments/quick?id=${p.id}`)}>Open</Button>}>
        {p.settings.assessmentName} · {p.stage.replaceAll('_', ' ')}
      </Alert>)}
      {quickPreparations.length && !assessments.length ? null : renderContent()}
      
      <RenameActivityDialog item={renameItem} onClose={()=>setRenameItem(null)} onSaved={()=>fetchAssessments()}/>
      <ConfirmationModal
        open={isConfirmOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmDelete}
        busy={deleting}
        confirmLabel="Delete"
        title="Delete this assessment?"
        description={`Delete "${jobToDelete?.assessmentName}"? It will be removed from your assessments and its grades will no longer count in student, class or tag statistics. Internal history is retained.`}
      />
    </Box>
  );
};

export default Assessments;