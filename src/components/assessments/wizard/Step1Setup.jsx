// ata-frontend/src/components/assessments/wizard/Step1Setup.jsx
import React from 'react';
import { Stack, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const Step1Setup = ({ state, handleUpdateField, classes, disabled }) => (
    <Stack spacing={3}>
        <TextField label="Assessment Name" value={state.assessmentName} onChange={(e) => handleUpdateField('assessmentName', e.target.value)} required autoFocus disabled={disabled} />
        <FormControl fullWidth required disabled={disabled}>
            <InputLabel>Select Class</InputLabel>
            <Select value={state.classId} label="Select Class" onChange={(e) => handleUpdateField('classId', e.target.value)}>
                {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
        </FormControl>
    </Stack>
);
export default Step1Setup;