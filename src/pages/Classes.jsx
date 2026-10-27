import TagsPanel from '../components/tags/TagsPanel';
// /src/pages/Classes.jsx (FINAL, ROBUST VERSION)

// --- Core React Imports ---
import React, { useState, useEffect, useCallback } from 'react';
import AddCard from '../components/common/AddCard';
import { useNavigate, useSearchParams } from 'react-router-dom';

// --- MUI Component Imports ---
import { Box, Button, Skeleton, Alert, AlertTitle, Tabs, Tab } from '@mui/material';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';

// --- Custom Component Imports ---
import ClassCard from '../components/classes/ClassCard';
import AddClassModal from '../components/classes/AddClassModal';

// --- Service Import for Backend Communication ---
import classService from '../services/classService';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

// --- Sub-Component for the Empty State ---
/**
 * The main dashboard page for the "Your Classes" feature. This is the final,
 * robust version with all bug fixes and defensive checks.
 */
const Classes = () => {
  const navigate = useNavigate();
  const [searchParams,setSearchParams]=useSearchParams();
  const section=searchParams.get('view')==='tags'?1:0;
  const [newTagRequest,setNewTagRequest]=useState(0);
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
        <div className="mst-grid mst-grid-auto">
          {Array.from(new Array(3)).map((_, index) => (
            <Skeleton height={168} key={index} variant="rectangular" />
          ))}
        </div>
      );
    }
    if (error) {
      return <Alert severity="error"><AlertTitle>Couldn't load your classes</AlertTitle>{error}</Alert>;
    }
    if (!Array.isArray(classes)) {
      return <Alert severity="warning">Could not display class data due to an unexpected format.</Alert>;
    }
    if (classes.length === 0) {
      return (
        <EmptyState
          action={<Button onClick={handleOpenModal} startIcon={<AddOutlined />} variant="contained">Add class</Button>}
          icon={<SchoolOutlined />}
          title="Create your first class"
        >
          Add a class and its students by hand, or upload a roster.
        </EmptyState>
      );
    }
    return (
      <div className="mst-grid mst-grid-auto">
        {classes.map((classItem) => (
          <ClassCard key={classItem.id} classData={classItem} />
        ))}
        <AddCard hint="By hand or from a roster file" label="Add a class" onClick={handleOpenModal} />
      </div>
    );
  };

  return (
    <>
      <Box>
        <PageHeader
          actions={<Button onClick={section===1?()=>setNewTagRequest(value=>value+1):handleOpenModal} startIcon={<AddOutlined />} variant="contained">{section===1?"New tag":"Add class"}</Button>}
          subtitle={section===1?"Private labels for students across your classes. Tags do not change AI grading.":"Your rosters, grades and each student's progress."}
          title={section===1?"Student tags":"Classes"}
        />
        <Tabs value={section} onChange={(_,v)=>setSearchParams(v?{view:'tags'}:{})} aria-label="Classes and tags" sx={{mb:2}}><Tab label="Classes"/><Tab label="Tags"/></Tabs>
        {section===0?renderContent():<TagsPanel newRequest={newTagRequest}/>}
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