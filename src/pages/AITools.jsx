// /src/pages/AITools.jsx

import React, { useState } from 'react'; // <<< IMPORT useState

import { Box, Button } from '@mui/material';
import PageHeader from '../components/common/PageHeader';

// Custom Component Imports
import ToolCard from '../components/tools/ToolCard';
import HistoryModal from '../components/tools/HistoryModal'; // <<< NEW IMPORT

// Icon Imports
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import SlideshowOutlined from '@mui/icons-material/SlideshowOutlined';
import RuleOutlined from '@mui/icons-material/RuleOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined'; // <<< NEW IMPORT

const aiToolsData = [
  {
    id: 'question-generator',
    title: 'Question generator',
    description: 'Create quizzes and checks for understanding.',
    icon: <QuizOutlined />,
    path: '/tools/question-generator',
  },
  {
    id: 'slide-generator',
    title: 'Slide generator',
    description: 'Produce structured presentation outlines.',
    icon: <SlideshowOutlined />,
    path: '/tools/slide-generator',
  },
  {
    id: 'rubric-generator',
    title: 'Rubric generator',
    description: 'Build detailed grading rubrics for assignments.',
    icon: <RuleOutlined />,
    path: '/tools/rubric-generator',
  },
];

/**
 * The main page for the "AI Tools" feature.
 * UPGRADED to manage and display the Generation History modal.
 */
const AITools = () => {
  // --- [START] NEW STATE MANAGEMENT ---
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  // --- [END] NEW STATE MANAGEMENT ---

  return (
    <>
      <Box>
        <PageHeader
          actions={<Button onClick={() => setIsHistoryOpen(true)} startIcon={<HistoryOutlined />} variant="outlined">History</Button>}
          subtitle="Create classroom materials in seconds, then save what you like."
          title="AI tools"
        />
        {/* --- [END] UPGRADED PAGE HEADER --- */}

        <div className="mst-grid mst-grid-3">
          {aiToolsData.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </Box>

      {/* --- [START] NEW MODAL RENDER --- */}
      <HistoryModal
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
      {/* --- [END] NEW MODAL RENDER --- */}
    </>
  );
};

export default AITools;