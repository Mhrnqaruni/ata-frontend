// /src/components/assessments/uploader/StructureReviewer.jsx (WITH MAX SCORE HIDDEN)

import React from 'react';
import {
  Box, Typography, Paper, TextField, Stack, IconButton, Fab, Divider,
  Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const StructureReviewer = ({ config, dispatch, disabled }) => {
  // All handler functions are correct and remain unchanged.
  const handleSectionUpdate = (sectionId, field, value) => {
    dispatch({ type: 'UPDATE_SECTION_FIELD', payload: { sectionId, field, value } });
  };
  
  const handleQuestionUpdate = (sectionId, questionId, field, value) => {
    dispatch({ type: 'UPDATE_QUESTION_FIELD', payload: { sectionId, questionId, field, value } });
  };

  const handleAddQuestion = (sectionId) => {
    dispatch({ type: 'ADD_QUESTION', payload: { sectionId } });
  };

  const handleDeleteQuestion = (sectionId, questionId) => {
    dispatch({ type: 'REMOVE_QUESTION', payload: { sectionId, questionId } });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Our AI has analyzed your document and structured it into the sections and questions below. Please review, edit, and confirm the details before proceeding.
      </Typography>
      
      {config.sections.map((section, sectionIndex) => (
        <Paper key={section.id} elevation={2} sx={{ overflow: 'hidden' }}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">{`Section ${sectionIndex + 1}: ${section.title}`}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {section.questions.map((q, questionIndex) => (
                  <React.Fragment key={q.id}>
                    <ListItem
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleDeleteQuestion(section.id, q.id)} disabled={disabled}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText primary={<Typography variant="subtitle1" component="div">{`Question ${questionIndex + 1}`}</Typography>} />
                    </ListItem>
                    <Stack spacing={2} sx={{ pl: 4, pt: 1, pb: 2 }}>
                      <TextField fullWidth multiline rows={3} label="Question Text" value={q.text || ''} onChange={(e) => handleQuestionUpdate(section.id, q.id, 'text', e.target.value)} disabled={disabled} />

                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Model Answer / Answer Key"
                        value={q.answer || ''}
                        onChange={(e) => handleQuestionUpdate(section.id, q.id, 'answer', e.target.value)}
                        disabled={disabled}
                        helperText="The correct answer extracted from the answer key document"
                      />

                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Grading Rubric / Marking Scheme"
                        value={q.rubric || ''}
                        onChange={(e) => handleQuestionUpdate(section.id, q.id, 'rubric', e.target.value)}
                        disabled={disabled}
                        helperText="Key points for marking and grading criteria"
                      />

                      <TextField
                        type="number"
                        label="Max Score"
                        value={q.maxScore || ''}
                        onChange={(e) => handleQuestionUpdate(section.id, q.id, 'maxScore', parseInt(e.target.value, 10) || 0)}
                        disabled={disabled}
                        sx={{ maxWidth: '150px' }}
                        inputProps={{ min: 1 }}
                        placeholder="e.g., 10"
                      />

                    </Stack>
                    {questionIndex < section.questions.length - 1 && <Divider sx={{ my: 2 }} />}
                  </React.Fragment>
                ))}
              </List>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Fab size="small" color="secondary" aria-label="add question" onClick={() => handleAddQuestion(section.id)} disabled={disabled}>
                  <AddIcon />
                </Fab>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Paper>
      ))}
    </Stack>
  );
};

export default StructureReviewer;