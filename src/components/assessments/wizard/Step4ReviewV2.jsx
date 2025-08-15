// /src/components/assessments/wizard/Step4ReviewV2.jsx

import React from 'react';
import { List, ListItem, ListItemText, Typography, Divider } from '@mui/material';

const Step4ReviewV2 = ({ state, classes }) => {
  // Helper to count total questions from the new V2 config structure.
  const totalQuestions = state.config?.sections?.reduce((acc, section) => acc + section.questions.length, 0) || 0;

  return (
    <List>
      <ListItem>
        <ListItemText 
          primary="Assessment Name" 
          secondary={state.assessmentName} 
        />
      </ListItem>
      <Divider />
      <ListItem>
        <ListItemText 
          primary="Class" 
          secondary={classes.find(c => c.id === state.classId)?.name || 'N/A'} 
        />
      </ListItem>
      <Divider />
      <ListItem>
        <ListItemText 
          primary="Assessment Structure" 
          secondary={
            <Typography variant="body2" color="text.secondary">
              {state.config?.sections?.length || 0} Sections, {totalQuestions} Questions
            </Typography>
          }
        />
      </ListItem>
      <Divider />
      <ListItem>
        <ListItemText 
          primary="Student Answer Sheets" 
          secondary={`${state.answerSheetFiles.length} files uploaded`} 
        />
      </ListItem>
    </List>
  );
};

export default Step4ReviewV2;