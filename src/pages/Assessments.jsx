import { useTeacherData } from '../hooks/useTeacherData';
import QueryNotice from '../components/common/QueryNotice';
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
  const assessmentQuery = useTeacherData('assessments');
  const quickQuery = useTeacherData('quick');
  const assessments = assessmentQuery.data || [];
  const quickPreparations = quickQuery.data || [];
  const isLoading = assessmentQuery.isPending;
  const error = assessmentQuery.data === undefined && assessmentQuery.error;
  const [renameItem, setRenameItem] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [deleting,setDeleting]=useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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
    if (error) return null;
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
      <QueryNotice query={assessmentQuery} label="assessments" /><QueryNotice query={quickQuery} label="Quick preparations" />
      {quickPreparations.map(p => <Alert key={p.id} severity={['failed','interrupted','needs_input'].includes(p.status) ? 'warning' : 'info'} sx={{ mb: 2 }} action={<Button onClick={() => navigate(`/assessments/quick?id=${p.id}`)}>Open</Button>}>
        {p.settings.assessmentName} · {p.stage.replaceAll('_', ' ')}
      </Alert>)}
      {quickPreparations.length && !assessments.length ? null : renderContent()}
      
      <RenameActivityDialog item={renameItem} onClose={()=>setRenameItem(null)}/>
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