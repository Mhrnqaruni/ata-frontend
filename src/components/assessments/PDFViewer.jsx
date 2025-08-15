// ata-frontend/src/components/assessments/PDFViewer.jsx

import React from 'react';
import { Card, CardHeader, Box, Typography } from '@mui/material';
import PDFViewer from './PDFViewer'; // Import the new component

const getFileType = (url) => {
  if (!url) return null;
  const extension = url.split('.').pop().toLowerCase().split('?')[0];
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'image';
  if (extension === 'pdf') return 'pdf';
  return 'unknown';
};

const AnswerSheetViewer = ({ fileUrl, studentName }) => {
  const fileType = getFileType(fileUrl);

  const renderContent = () => {
    switch (fileType) {
      case 'image':
        return (
          <img src={fileUrl} alt={`Answer sheet for ${studentName}`} style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }} />
        );
      case 'pdf':
        return <PDFViewer fileUrl={fileUrl} />;
      default:
        return (
          <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
            <Typography color="text.secondary">{fileUrl ? 'Unsupported file type.' : 'No answer sheet available.'}</Typography>
          </Box>
        );
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader title="Student Answer Sheet" />
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        {renderContent()}
      </Box>
    </Card>
  );
};

export default AnswerSheetViewer;