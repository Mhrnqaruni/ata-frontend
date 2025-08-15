// ata-frontend/src/components/assessments/wizard/Step2Questions.jsx

import React from 'react';
import { Box, Stack, TextField, ToggleButtonGroup, ToggleButton, Typography, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import FileUploadZone from '../../../components/common/FileUploadZone';

const Step2Questions = ({ state, handleUpdateField, disabled }) => (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" gutterBottom>Exam Questions</Typography>
        <ToggleButtonGroup value={state.questionsSourceType} exclusive onChange={(_, v) => v && handleUpdateField('questionsSourceType', v)} disabled={disabled}>
          <ToggleButton value="text">Text Input</ToggleButton>
          <ToggleButton value="file">File Upload</ToggleButton>
        </ToggleButtonGroup>
        {state.questionsSourceType === 'text' ? (
          <TextField fullWidth multiline rows={6} sx={{ mt: 2 }} value={state.questionsText} onChange={(e) => handleUpdateField('questionsText', e.target.value)} disabled={disabled} />
        ) : (
          <Box sx={{ mt: 2 }}><FileUploadZone onDrop={files => handleUpdateField('questionsFile', files[0])} disabled={disabled} /></Box>
        )}
      </Box>
      <Box>
        <Typography variant="h4" gutterBottom>Grading Rubric</Typography>
        <ToggleButtonGroup value={state.rubricSourceType} exclusive onChange={(_, v) => v && handleUpdateField('rubricSourceType', v)} disabled={disabled}>
          <ToggleButton value="text">Text Input</ToggleButton>
          <ToggleButton value="file">File Upload</ToggleButton>
        </ToggleButtonGroup>
        {state.rubricSourceType === 'text' ? (
          <TextField fullWidth multiline rows={6} sx={{ mt: 2 }} value={state.rubricText} onChange={(e) => handleUpdateField('rubricText', e.target.value)} disabled={disabled} />
        ) : (
          <Box sx={{ mt: 2 }}><FileUploadZone onDrop={files => handleUpdateField('rubricFile', files[0])} disabled={disabled} /></Box>
        )}
      </Box>
      <Box>
         <Typography variant="h4" gutterBottom>Grading Options</Typography>
         <TextField type="number" label="Max Score per Question" value={state.maxScore} onChange={e => handleUpdateField('maxScore', e.target.value)} sx={{mr: 2, width: '200px'}} disabled={disabled} />
         <FormControlLabel control={<Checkbox checked={state.includeImprovementTips} onChange={e => handleUpdateField('includeImprovementTips', e.target.checked)} disabled={disabled} />} label="Include Improvement Tips" />
      </Box>
    </Stack>
);
export default Step2Questions;