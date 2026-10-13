// /src/components/classes/AddClassModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField,
  Tabs, Tab, Box, Typography, IconButton, CircularProgress, Alert
} from '@mui/material';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import UploadDropzone from '../common/UploadDropzone';

const TabPanel = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const ROSTER_TYPES = {
  'image/jpeg': [],
  'image/png': [],
  'application/pdf': [],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
};

const FileUploadZone = ({ file, setFile, isLoading }) => (
  <UploadDropzone
    accept={ROSTER_TYPES}
    disabled={isLoading}
    files={file ? [file] : []}
    hint="CSV, Excel, Word, PDF, JPG or PNG"
    label="Roster file"
    onDrop={(files) => setFile(files[0])}
    onRemove={() => setFile(null)}
    size="compact"
    title={file ? 'Drop a different roster' : 'Drop your roster here'}
  />
);

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
        Add a class
        <IconButton aria-label="close" onClick={onClose} disabled={isLoading}><CloseOutlined /></IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 0 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Tabs aria-label="How to add the class" value={activeTab} onChange={handleTabChange}>
            <Tab label="Create by hand" disabled={isLoading} />
            <Tab label="Upload a roster" disabled={isLoading} />
          </Tabs>
          <TabPanel value={activeTab} index={0}>
            <Stack spacing={3}>
              <TextField autoFocus required name="classNameManual" label="Class name" value={className} onChange={(e) => setClassName(e.target.value)} fullWidth disabled={isLoading} />
              <TextField name="description" label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline rows={3} disabled={isLoading} />
            </Stack>
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <Stack spacing={3}>
              <TextField required name="classNameUpload" label="Class name" value={className} onChange={(e) => setClassName(e.target.value)} fullWidth disabled={isLoading} />
              <FileUploadZone file={file} setFile={setFile} isLoading={isLoading} />
            </Stack>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="outlined" disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitDisabled} startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}>
            {activeTab === 0 ? 'Create class' : 'Create and upload'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddClassModal;