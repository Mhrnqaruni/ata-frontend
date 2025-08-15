// /src/components/assessments/uploader/GradingModeSelector.jsx

import React, { useState, useEffect } from 'react';
import { Box, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Select, MenuItem, InputLabel, CircularProgress } from '@mui/material';
import libraryService from '../../../services/libraryService';

const GradingModeSelector = ({ config, dispatch, disabled }) => {
  const [libraryIndex, setLibraryIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch the library index only when the user selects that mode.
  useEffect(() => {
    if (config.gradingMode === 'library' && !libraryIndex) {
      setIsLoading(true);
      libraryService.getTree()
        .then(data => setLibraryIndex(data))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [config.gradingMode, libraryIndex]);

  const handleUpdate = (field, value) => {
    dispatch({ type: 'UPDATE_CONFIG_FIELD', payload: { field, value } });
  };

  return (
    <FormControl component="fieldset" fullWidth disabled={disabled}>
      <FormLabel component="legend">Grading Method</FormLabel>
      <RadioGroup
        row
        value={config.gradingMode || 'answer_key_provided'}
        onChange={(e) => handleUpdate('gradingMode', e.target.value)}
      >
        <FormControlLabel value="answer_key_provided" control={<Radio />} label="Answer Key in Document" />
        <FormControlLabel value="library" control={<Radio />} label="Grade from ATA Library" />
      </RadioGroup>
      
      {config.gradingMode === 'library' && (
        <Box sx={{ mt: 2, pl: 2 }}>
          {isLoading ? <CircularProgress size={24} /> : (
            <FormControl fullWidth>
              <InputLabel>Select Library Source</InputLabel>
              <Select
                value={config.librarySource || ''}
                label="Select Library Source"
                onChange={(e) => handleUpdate('librarySource', e.target.value)}
              >
                {/* This would be a recursive function in a real app, but for now we map */}
                <MenuItem value={"Secondary School/Year 9 (Key Stage 3)/Science/Activate for AQA KS3 Science - GCSE-Ready/1. Biology_B1_Chapter1_Cells.txt"}>
                  KS3 Science - Biology Chapter 1: Cells
                </MenuItem>
                <MenuItem value={"GCSE/Years 10 & 11/English Language/Pearson Edexcel GCSE (9-1) English Language Student Book/1. Reading_Skills.txt"}>
                  GCSE English - Reading Skills
                </MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
      )}
    </FormControl>
  );
};

export default GradingModeSelector;