// The teacher's classes as a grid of cards, with Create a class (with or without class lists) and a Tags tab.
// Area: academics

import { useTeacherData } from '../hooks/useTeacherData';
import QueryNotice from '../components/common/QueryNotice';
import TagsPanel from '../components/tags/TagsPanel';

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

import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

// --- Sub-Component for the Empty State ---
/**
 * The main dashboard page for the "Your Classes" feature. This is the final,
 * robust version with all bug fixes and defensive checks.
 */
const Classes = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('view') === 'tags' ? 1 : 0;
  const [newTagRequest, setNewTagRequest] = useState(0);
  const classesQuery = useTeacherData('classes');
  const classes = classesQuery.data || [];
  const isLoading = classesQuery.isPending;
  const error = classesQuery.data === undefined && classesQuery.error;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  // The new class's page opens with its notice (design §3.6).
  const handleCreated = (made, notice) => {
    setIsModalOpen(false);
    navigate(`/classes/${made.id}`, { state: { notice } });
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
      return null;
    }
    if (!Array.isArray(classes)) {
      return <Alert severity="warning">Could not display class data due to an unexpected format.</Alert>;
    }
    if (classes.length === 0) {
      return (
        <EmptyState
          action={
            <Button
              data-mst="create-class-open"
              onClick={handleOpenModal}
              startIcon={<AddOutlined />}
              variant="contained"
            >
              Create class
            </Button>
          }
          icon={<SchoolOutlined />}
          title="Create your first class"
        >
          Give it a name, and drop in a class list if you have one.
        </EmptyState>
      );
    }
    return (
      <div className="mst-grid mst-grid-auto">
        {classes.map((classItem) => (
          <ClassCard key={classItem.id} classData={classItem} />
        ))}
        <AddCard hint="With or without a class list" label="Create a class" onClick={handleOpenModal} />
      </div>
    );
  };

  return (
    <>
      <Box>
        <PageHeader
          actions={
            <Button
              onClick={section === 1 ? () => setNewTagRequest((value) => value + 1) : handleOpenModal}
              startIcon={<AddOutlined />}
              variant="contained"
            >
              {section === 1 ? 'New tag' : 'Create class'}
            </Button>
          }
          subtitle={
            section === 1
              ? 'Private labels for students across your classes. Tags do not change AI grading.'
              : "Your rosters, grades and each student's progress."
          }
          title={section === 1 ? 'Student tags' : 'Classes'}
        />
        <Tabs
          value={section}
          onChange={(_, v) => setSearchParams(v ? { view: 'tags' } : {})}
          aria-label="Classes and tags"
          sx={{ mb: 2 }}
        >
          <Tab label="Classes" />
          <Tab label="Tags" />
        </Tabs>
        <QueryNotice query={classesQuery} label="classes" />
        {section === 0 ? renderContent() : <TagsPanel newRequest={newTagRequest} />}
      </Box>

      <AddClassModal open={isModalOpen} onClose={handleCloseModal} onCreated={handleCreated} />
    </>
  );
};

export default Classes;
