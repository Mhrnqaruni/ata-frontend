// /src/components/assessments/uploader/AssessmentUploader.jsx

import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Paper, CircularProgress, Stack } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { styled } from '@mui/material/styles';

// Styled component for the dropzone area for a better look and feel.
// Justification: This encapsulates the complex styling, keeping the main component's JSX clean and readable.
const DropzoneContainer = styled(Paper)(({ theme, isDragActive }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  borderWidth: 2,
  borderRadius: theme.shape.borderRadius,
  borderColor: isDragActive ? theme.palette.primary.main : theme.palette.divider,
  borderStyle: 'dashed',
  backgroundColor: isDragActive ? theme.palette.action.hover : theme.palette.background.default,
  color: theme.palette.text.secondary,
  transition: 'border .24s ease-in-out, background-color .24s ease-in-out',
  cursor: 'pointer',
  textAlign: 'center',
  minHeight: 200,
}));

const AssessmentUploader = ({ onParse, isParsing }) => {
  // Setup react-dropzone hook to handle file drops.
  // Justification: Using a dedicated library for this is a best practice, as it handles all edge cases and accessibility concerns for file inputs.
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => onParse(acceptedFiles[0]), // We only handle one file at a time.
    multiple: false,
    disabled: isParsing, // Disable the dropzone while the AI is working.
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
  });

  return (
    <Box>
      {/* Conditional rendering to show a loading state while parsing. */}
      {/* Justification: This provides critical, immediate feedback to the user, assuring them that the system is working on their request. */}
      {isParsing ? (
        <Stack alignItems="center" spacing={2} minHeight={200} justifyContent="center">
          <CircularProgress />
          <Typography variant="h6">Analyzing Document...</Typography>
          <Typography variant="body2" color="text.secondary">
            The AI is structuring your assessment. This may take a moment.
          </Typography>
        </Stack>
      ) : (
        // The main dropzone UI.
        // Justification: This provides a large, clear, and intuitive target for the user to drag their file onto.
        <DropzoneContainer {...getRootProps({ isDragActive })}>
          <input {...getInputProps()} />
          <UploadFileIcon sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h6">Drag & drop your assessment file here</Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>or click to select a file</Typography>
          <Typography variant="caption">(PDF, DOCX, JPG, PNG)</Typography>
        </DropzoneContainer>
      )}
    </Box>
  );
};

export default AssessmentUploader;