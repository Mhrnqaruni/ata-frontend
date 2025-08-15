// ata-frontend/src/components/assessments/wizard/Step4Review.jsx

import React from 'react';
import { List, ListItem, ListItemText } from '@mui/material';

const Step4Review = ({ state, classes }) => (
    <List>
      <ListItem><ListItemText primary="Assessment Name" secondary={state.assessmentName} /></ListItem>
      <ListItem><ListItemText primary="Class" secondary={classes.find(c => c.id === state.classId)?.name || 'N/A'} /></ListItem>
      <ListItem><ListItemText primary="Questions Source" secondary={state.questionsFile?.name || 'Text Input'} /></ListItem>
      <ListItem><ListItemText primary="Rubric Source" secondary={state.rubricFile?.name || 'Text Input'} /></ListItem>
      <ListItem><ListItemText primary="Answer Sheets" secondary={`${state.answerSheetFiles.length} files uploaded`} /></ListItem>
    </List>
);
export default Step4Review;