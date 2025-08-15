// /src/components/classes/AddClassModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField,
  Tabs, Tab, Box, Typography, IconButton, CircularProgress, Alert
} from '@mui/material';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';

const TabPanel = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const FileUploadZone = ({ file, setFile, isLoading }) => {
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0]);
  }, [setFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxFiles: 1, disabled: isLoading,
    accept: { // <<< THE CRITICAL FIX IS HERE
      'image/jpeg': [],
      'image/png': [],
      'application/pdf': [],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    }
  });

  if (file) {
    return (
      <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <DescriptionOutlined color="action" />
          <Typography noWrap sx={{ ml: 1.5 }}>{file.name}</Typography>
        </Box>
        <Button size="small" onClick={() => setFile(null)} disabled={isLoading}>Clear</Button>
      </Box>
    );
  }

  return (
    <Box {...getRootProps()} sx={{ p: 4, border: '2px dashed', borderColor: isDragActive ? 'primary.main' : 'divider', borderRadius: 1, textAlign: 'center', cursor: 'pointer', backgroundColor: isDragActive ? 'action.hover' : 'transparent', opacity: isLoading ? 0.5 : 1 }}>
      <input {...getInputProps()} />
      <FileUploadOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
      <Typography>Drag & drop your roster file</Typography>
      <Typography color="text.secondary">or click to select a file</Typography>
    </Box>
  );
};

const AddClassModal = ({ open, onClose, onSubmit, isLoading, error }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [className, setClassName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setActiveTab(0);
        setClassName('');
        setDescription('');
        setFile(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleTabChange = (event, newValue) => setActiveTab(newValue);
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ name: className, description, file });
  };

  const isSubmitDisabled = isLoading || (activeTab === 0 ? className.trim() === '' : className.trim() === '' || file === null);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" disableEscapeKeyDown={isLoading}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Add New Class
        <IconButton aria-label="close" onClick={onClose} disabled={isLoading}><CloseOutlined /></IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Tabs value={activeTab} onChange={handleTabChange} centered>
            <Tab label="Create Manually" disabled={isLoading} />
            <Tab label="Upload Roster" disabled={isLoading} />
          </Tabs>
          <TabPanel value={activeTab} index={0}>
            <Stack spacing={3}>
              <TextField autoFocus required name="classNameManual" label="Class Name" value={className} onChange={(e) => setClassName(e.target.value)} fullWidth disabled={isLoading} />
              <TextField name="description" label="Description (Optional)" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline rows={3} disabled={isLoading} />
            </Stack>
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <Stack spacing={3}>
              <TextField required name="classNameUpload" label="Class Name" value={className} onChange={(e) => setClassName(e.target.value)} fullWidth disabled={isLoading} />
              <FileUploadZone file={file} setFile={setFile} isLoading={isLoading} />
            </Stack>
          </TabPanel>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} variant="outlined" disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitDisabled} startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}>
            {activeTab === 0 ? 'Create Class' : 'Create & Upload'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddClassModal;