// /src/components/tools/FileUploadZone.jsx

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Button } from '@mui/material';
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';

/**
 * A reusable UI component for handling file selection via drag-and-drop or click.
 *
 * @param {object} props
 * @param {File | null} props.file - The currently selected file object.
 * @param {function} props.setFile - Callback function to update the parent's file state.
 * @param {boolean} props.isLoading - Whether the parent form is in a loading state.
 */
const FileUploadZone = ({ file, setFile, isLoading }) => {
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, [setFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: isLoading,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'application/pdf': [],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    }
  });

  if (file) {
    return (
      <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <DescriptionOutlined color="action" />
          <Typography noWrap sx={{ ml: 1.5 }} title={file.name}>{file.name}</Typography>
        </Box>
        <Button size="small" onClick={() => setFile(null)} disabled={isLoading}>Clear</Button>
      </Box>
    );
  }

  return (
    <Box
      {...getRootProps()}
      sx={{
        p: 4,
        border: '2px dashed',
        borderColor: isDragActive ? 'primary.main' : 'divider',
        borderRadius: 1,
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragActive ? 'action.hover' : 'transparent',
        transition: 'border-color 300ms, background-color 300ms',
        opacity: isLoading ? 0.5 : 1,
      }}
    >
      <input {...getInputProps()} />
      <FileUploadOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
      <Typography>Drag & drop a file</Typography>
      <Typography color="text.secondary">or click to select a file (.pdf, .docx, .png, .jpeg)</Typography>
    </Box>
  );
};

export default FileUploadZone;