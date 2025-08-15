// /src/pages/AITools.jsx

import React, { useState } from 'react'; // <<< IMPORT useState
import { Box, Typography, Grid, Button } from '@mui/material'; // <<< IMPORT Button

// Custom Component Imports
import ToolCard from '../components/tools/ToolCard';
import HistoryModal from '../components/tools/HistoryModal'; // <<< NEW IMPORT

// Icon Imports
import QuestionAnswerOutlined from '@mui/icons-material/QuestionAnswerOutlined';
import SlideshowOutlined from '@mui/icons-material/SlideshowOutlined';
import RuleOutlined from '@mui/icons-material/RuleOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined'; // <<< NEW IMPORT

const aiToolsData = [
  {
    id: 'question-generator',
    title: 'Question Generator',
    description: 'Create quizzes and checks for understanding.',
    icon: <QuestionAnswerOutlined />,
    path: '/tools/question-generator',
  },
  {
    id: 'slide-generator',
    title: 'Slide Generator',
    description: 'Produce structured presentation outlines.',
    icon: <SlideshowOutlined />,
    path: '/tools/slide-generator',
  },
  {
    id: 'rubric-generator',
    title: 'Rubric Generator',
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
        {/* --- [START] UPGRADED PAGE HEADER --- */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h2">
            AI Tools
          </Typography>
          <Button
            variant="outlined"
            startIcon={<HistoryOutlined />}
            onClick={() => setIsHistoryOpen(true)}
          >
            View History
          </Button>
        </Box>
        {/* --- [END] UPGRADED PAGE HEADER --- */}

        <Grid container spacing={3}>
          {aiToolsData.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </Grid>
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