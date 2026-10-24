import React from 'react';
import { TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

// Step 1: what the assessment is called and which class sat it (side by side on wide screens).
const Step1Setup = ({ state, handleUpdateField, classes, disabled, lockClass = false }) => (
    <div className="mst-form-row">
        <TextField
            autoFocus
            disabled={disabled}
            fullWidth
            label="Assessment name"
            onChange={(e) => handleUpdateField('assessmentName', e.target.value)}
            placeholder="e.g. Biology Paper 1, Autumn mock"
            required
            value={state.assessmentName}
        />
        <FormControl fullWidth required disabled={disabled || lockClass}>
            <InputLabel id="assessment-class-label">Class</InputLabel>
            <Select
                displayEmpty
                labelId="assessment-class-label"
                onChange={(e) => handleUpdateField('classId', e.target.value)}
                renderValue={(id) => (id ? classes.find((c) => c.id === id)?.name : <span className="mst-placeholder">Choose a class</span>)}
                value={state.classId}
            >
                {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
        </FormControl>
    </div>
);

export default Step1Setup;
