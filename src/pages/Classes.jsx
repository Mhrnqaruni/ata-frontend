// The teacher's classes as a grid of cards, with Create a class (with or without class lists), then a Students tab
// (every student, in a class or not) and a Student groups tab.
// Area: academics

import { useTeacherData } from '../hooks/useTeacherData';
import QueryNotice from '../components/common/QueryNotice';
import TagsPanel from '../components/tags/TagsPanel';
import StudentsPanel from '../components/classes/StudentsPanel';

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

// Each tab's header (design §3.2). The tab follows the address's ?view=, not its place, so group links keep working.
const VIEWS = {
  classes: { title: 'Classes', subtitle: "Your rosters, grades and each student's progress." },
  students: { title: 'Students', subtitle: 'All your students, in a class or not.' },
  tags: {
    title: 'Student groups',
    subtitle: "Private groups of students across your classes. Groups don't change AI grading.",
  },
};

// --- Sub-Component for the Empty State ---
/**
 * The main dashboard page for the "Your Classes" feature. This is the final,
 * robust version with all bug fixes and defensive checks.
 */
const Classes = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = ['students', 'tags'].includes(searchParams.get('view')) ? searchParams.get('view') : 'classes';
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
            view === 'students' ? null : (
              <Button
                onClick={view === 'tags' ? () => setNewTagRequest((value) => value + 1) : handleOpenModal}
                startIcon={<AddOutlined />}
                variant="contained"
              >
                {view === 'tags' ? 'New group' : 'Create class'}
              </Button>
            )
          }
          subtitle={VIEWS[view].subtitle}
          title={VIEWS[view].title}
        />
        {/* The pills scroll in their own row if they ever don't fit, so the page never scrolls sideways. */}
        <Tabs
          value={view}
          onChange={(_, next) => setSearchParams(next === 'classes' ? {} : { view: next })}
          aria-label="Classes, students and student groups"
          scrollButtons={false}
          variant="scrollable"
          sx={{ mb: 2 }}
        >
          <Tab label="Classes" value="classes" />
          <Tab label="Students" value="students" />
          <Tab label="Student groups" value="tags" />
        </Tabs>
        {view === 'classes' ? (
          <>
            <QueryNotice query={classesQuery} label="classes" />
            {renderContent()}
          </>
        ) : view === 'students' ? (
          <StudentsPanel onCreateClass={handleOpenModal} />
        ) : (
          <TagsPanel newRequest={newTagRequest} />
        )}
      </Box>

      <AddClassModal open={isModalOpen} onClose={handleCloseModal} onCreated={handleCreated} />
    </>
  );
};

export default Classes;
