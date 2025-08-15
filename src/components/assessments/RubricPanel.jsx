// /src/components/assessments/RubricPanel.jsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, Box, Tabs, Tab, Typography } from '@mui/material';

const TabPanel = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>{children}</Box>}
  </div>
);

const RubricPanel = ({ question, rubric }) => {
  const [activeTab, setActiveTab] = useState(0);
  const handleTabChange = (_, newValue) => setActiveTab(newValue);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="Question" />
          <Tab label="Rubric" />
        </Tabs>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <TabPanel value={activeTab} index={0}>
          <Typography variant="h4" gutterBottom>Question {question?.id || ''}</Typography>
          <Typography variant="body1" whiteSpace="pre-wrap">{question?.text}</Typography>
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{rubric || 'No rubric provided.'}</ReactMarkdown>
        </TabPanel>
      </Box>
    </Card>
  );
};
export default RubricPanel;