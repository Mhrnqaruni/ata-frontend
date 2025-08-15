// /src/components/assessments/uploader/ScoringConfigurator.jsx

import React from 'react';
import { FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, TextField } from '@mui/material';

const ScoringConfigurator = ({ config, dispatch, disabled }) => {
  const handleUpdate = (field, value) => {
    dispatch({ type: 'UPDATE_CONFIG_FIELD', payload: { field, value } });
  };
  
  return (
    <FormControl component="fieldset" fullWidth sx={{ mt: 4 }} disabled={disabled}>
      <FormLabel component="legend">Scoring Configuration</FormLabel>
      <RadioGroup
        row
        value={config.scoringMethod || 'per_question'}
        onChange={(e) => handleUpdate('scoringMethod', e.target.value)}
      >
        <FormControlLabel value="per_question" control={<Radio />} label="Per-Question Marks" />
        <FormControlLabel value="total_score" control={<Radio />} label="Single Total Score" />
      </RadioGroup>

      {config.scoringMethod === 'total_score' && (
        <TextField
          label="Total Score for Assessment"
          type="number"
          value={config.totalScore || 100}
          onChange={(e) => handleUpdate('totalScore', parseInt(e.target.value, 10) || 0)}
          sx={{ mt: 2, maxWidth: '250px' }}
          inputProps={{ min: 1 }}
        />
      )}
    </FormControl>
  );
};

export default ScoringConfigurator;