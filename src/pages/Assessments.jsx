import { useTeacherData } from '../hooks/useTeacherData';
import QueryNotice from '../components/common/QueryNotice';
// /src/pages/Assessments.jsx (COMPLETE MERGED CODE)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AddCard from '../components/common/AddCard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, Skeleton, Alert, AlertTitle, TextField, MenuItem } from '@mui/material';
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
    action={<Button variant="contained" startIcon={<AddOutlined />} onClick={onGradeNew}>Create new assessment</Button>}
    icon={<AssignmentTurnedInOutlined />}
    title="Create your first assessment"
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
  const [params,setParams] = useSearchParams();
  const focused = useRef(null);
  const search = params.get('q') || '';
  const statuses = ['Queued','Processing','Summarizing','Pending Review','Completed','Failed'];
  const status = statuses.includes(params.get('status')) ? params.get('status') : '';
  const focus = params.get('focus');
  const updateFilter = (key,value) => { const next=new URLSearchParams(params); next.delete('focus'); value ? next.set(key,value) : next.delete(key); setParams(next,{replace:true}); };

  const { showSnackbar } = useSnackbar();
  const assessmentQuery = useTeacherData('assessments');
  const quickQuery = useTeacherData('quick');
  const assessments = assessmentQuery.data || [];
  const quickPreparations = quickQuery.data || [];
  const visibleAssessments = assessments.filter(job => focus ? job.id === focus :
    (!status || job.status === status) && `${job.assessmentName} ${job.className || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  useEffect(() => {
    if (!focus || focused.current === focus || !assessmentQuery.data) return;
    const card=document.getElementById(`assessment-${focus}`);
    if(card){ card.focus(); card.scrollIntoView({block:'nearest'}); focused.current=focus; }
  },[focus,assessmentQuery.data]);

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
        {visibleAssessments.map((job) => (
          <AssessmentCard 
            key={job.id} 
            job={job}
            onRename={() => setRenameItem({kind:"assessment",id:job.id,name:job.assessmentName})}
            onDelete={() => handleOpenConfirm(job)} 
          />
        ))}
        <AddCard hint="A paper, its mark scheme and the answer sheets" label="Create new assessment" minHeight={188} onClick={handleNavigateToNew} />
      </Box>
    );
  };

  return (
    <Box>
      <PageHeader
        actions={<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}><Button variant="outlined" onClick={() => navigate("/assessments/quick")}>Quick assessment</Button><Button variant="contained" startIcon={<AddOutlined />} onClick={handleNavigateToNew}>Create new assessment</Button></Box>}
        subtitle="Handwritten answers, marked three times by AI and checked by you."
        title="Assessments"
      />
      <QueryNotice query={assessmentQuery} label="assessments" /><QueryNotice query={quickQuery} label="Quick preparations" />
      <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mb:2 }}>
        <TextField size="small" label="Search assessments" value={search} onChange={e=>updateFilter('q',e.target.value)} />
        <TextField size="small" select label="Status" value={status} onChange={e=>updateFilter('status',e.target.value)} sx={{minWidth:160}}>
          <MenuItem value="">All statuses</MenuItem>{statuses.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        {(search||status||focus) && <Button onClick={()=>setParams({}, {replace:true})}>Clear filters</Button>}
      </Box>
      {focus && <Alert severity="info" sx={{mb:2}}>{visibleAssessments.length ? 'Showing the selected assessment. Clear filters to see all.' : assessmentQuery.data ? 'This assessment is no longer available.' : 'Loading the selected assessment…'}</Alert>}
      {!focus && assessments.length > 0 && !visibleAssessments.length && <Alert severity="info">No assessments match these filters.</Alert>}
      {quickPreparations.length > 0 && <h2>Quick preparations</h2>}
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