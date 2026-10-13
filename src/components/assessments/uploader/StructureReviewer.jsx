// /src/components/assessments/uploader/StructureReviewer.jsx (WITH MAX SCORE HIDDEN)

import React from 'react';
import {
  Box, Typography, Paper, TextField, Stack, IconButton, Fab, Divider, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, Button, Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import useNumberInput from '../../../hooks/useNumberInput';

// Helper component for max score input with empty state support
const MaxScoreField = ({ value, onChange, disabled }) => {
  const inputProps = useNumberInput(
    value || 0,
    onChange,
    {
      defaultValue: 0,
      min: 1,
      max: 1000
    }
  );

  return (
    <TextField
      type="number"
      label="Marks"
      className="mst-sr-marks"
      {...inputProps}
      disabled={disabled}
      sx={{ maxWidth: 150 }}
      inputProps={{ min: 1 }}
      placeholder="e.g., 10"
    />
  );
};

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
      <Typography variant="body1" color="text.secondary">
        AI read your documents and laid out each question. Edit anything that isn't right before you continue.
      </Typography>
      
      {config.sections.map((section, sectionIndex) => (
        <Box key={section.id}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h3" component="h4">{`Section ${sectionIndex + 1} · ${section.title}`}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div className="mst-sr-list">
                {section.questions.map((q, questionIndex) => (
                  <div className="mst-sr-q" key={q.id}>
                    <div className="mst-sr-q-head">
                      <span aria-hidden="true" className="mst-question-num">{questionIndex + 1}</span>
                      <span className="mst-sr-q-title">{`Question ${questionIndex + 1}`}</span>
                      <MaxScoreField
                        value={q.maxScore || 0}
                        onChange={(value) => handleQuestionUpdate(section.id, q.id, 'maxScore', value)}
                        disabled={disabled}
                      />
                      <Tooltip title="Remove question">
                        <span>
                          <IconButton aria-label={`Remove question ${questionIndex + 1}`} className="mst-danger-icon" onClick={() => handleDeleteQuestion(section.id, q.id)} disabled={disabled}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </div>
                    <TextField fullWidth multiline minRows={2} label="Question" value={q.text || ''} onChange={(e) => handleQuestionUpdate(section.id, q.id, 'text', e.target.value)} disabled={disabled} />
                    <div className="mst-form-row">
                      <TextField
                        fullWidth
                        multiline
                        minRows={1}
                        label="Model answer"
                        value={q.answer || ''}
                        onChange={(e) => handleQuestionUpdate(section.id, q.id, 'answer', e.target.value)}
                        disabled={disabled}
                        helperText="Read from the answer key"
                      />
                      <TextField
                        fullWidth
                        multiline
                        minRows={1}
                        label="Marking scheme"
                        value={q.rubric || ''}
                        onChange={(e) => handleQuestionUpdate(section.id, q.id, 'rubric', e.target.value)}
                        disabled={disabled}
                        helperText="What earns the marks"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button disabled={disabled} onClick={() => handleAddQuestion(section.id)} size="small" startIcon={<AddIcon />} sx={{ mt: 1 }} variant="text">
                Add a question
              </Button>
            </AccordionDetails>
          </Accordion>
        </Box>
      ))}
    </Stack>
  );
};

export default StructureReviewer;