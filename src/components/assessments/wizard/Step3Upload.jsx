// ata-frontend/src/components/assessments/wizard/Step3Upload.jsx

import React from 'react';
import { List, ListItem, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileUploadZone from '../../../components/common/FileUploadZone';

const Step3Upload = ({ state, dispatch, disabled }) => (
    <>
        <FileUploadZone onDrop={acceptedFiles => dispatch({ type: 'ADD_ANSWER_SHEETS', payload: acceptedFiles })} disabled={disabled} />
        <List sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
          {state.answerSheetFiles.map(file => (
            <ListItem key={file.path || file.name} secondaryAction={<IconButton edge="end" onClick={() => dispatch({ type: 'REMOVE_ANSWER_SHEET', payload: file.name })} disabled={disabled}><DeleteIcon /></IconButton>}>
              <ListItemText primary={file.name} secondary={`${Math.round(file.size / 1024)} KB`} />
            </ListItem>
          ))}
        </List>
    </>
);
export default Step3Upload;