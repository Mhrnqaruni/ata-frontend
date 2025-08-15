// /src/components/assessments/uploader/DocumentUploader.jsx

import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Paper } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { styled } from '@mui/material/styles';

const DropzoneContainer = styled(Paper)(({ theme, isDragActive, hasFile }) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: theme.spacing(2), borderWidth: 2, borderRadius: theme.shape.borderRadius,
  borderColor: hasFile ? theme.palette.success.main : (isDragActive ? theme.palette.primary.main : theme.palette.divider),
  borderStyle: 'dashed',
  backgroundColor: isDragActive ? theme.palette.action.hover : theme.palette.background.default,
  color: hasFile ? theme.palette.success.main : theme.palette.text.secondary,
  transition: 'all .24s ease-in-out', cursor: 'pointer', textAlign: 'center', minHeight: 150,
}));

const DocumentUploader = ({ onFileSelect, selectedFile, title, disabled }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => onFileSelect(acceptedFiles[0]),
    multiple: false, disabled: disabled,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'],
    },
  });

  return (
    <DropzoneContainer {...getRootProps({ isDragActive, hasFile: !!selectedFile })}>
      <input {...getInputProps()} />
      <UploadFileIcon sx={{ fontSize: 40, mb: 1 }} />
      <Typography variant="h6">{title}</Typography>
      {selectedFile ? (
        <Typography variant="body2" sx={{ mt: 1 }}>{selectedFile.name}</Typography>
      ) : (
        <Typography variant="body2">Drag & drop or click to select</Typography>
      )}
    </DropzoneContainer>
  );
};

export default DocumentUploader;