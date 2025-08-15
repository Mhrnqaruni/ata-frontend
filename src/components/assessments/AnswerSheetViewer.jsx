// /src/components/assessments/AnswerSheetViewer.jsx
import React from 'react';
import { Card, CardHeader, Box, Typography } from '@mui/material';
// NOTE: We will create the PDFViewer component in a later instruction. For now, we will link to the file.
// import PDFViewer from './PDFViewer'; 

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
        // For now, we will show a link. We will replace this with the real viewer component next.
        return (
          <Box sx={{p: 4, textAlign: 'center'}}>
             <Typography>PDF viewing will be enabled in the next step.</Typography>
             <a href={fileUrl} target="_blank" rel="noopener noreferrer">Open PDF in new tab</a>
          </Box>
        )
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
      <Box sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', p: 1, backgroundColor: 'grey.100' }}>
        {renderContent()}
      </Box>
    </Card>
  );
};
export default AnswerSheetViewer;