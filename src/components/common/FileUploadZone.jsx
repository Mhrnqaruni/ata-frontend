// /src/components/common/FileUploadZone.jsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography } from '@mui/material';
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined';

const FileUploadZone = ({ onDrop, accept, disabled }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    disabled,
  });

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
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.3s, background-color 0.3s',
      }}
    >
      <input {...getInputProps()} />
      <FileUploadOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
      <Typography>Drag & drop files here</Typography>
      <Typography color="text.secondary">or click to select files</Typography>
    </Box>
  );
};

export default FileUploadZone;