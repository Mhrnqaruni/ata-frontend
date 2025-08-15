// /src/components/classes/ClassEditModal.jsx

// --- Core React Imports ---
import React, { useState, useEffect } from 'react';

// --- MUI Component Imports ---
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, IconButton, CircularProgress, Alert } from '@mui/material';

// --- Icon Imports ---
import CloseOutlined from '@mui/icons-material/CloseOutlined';

/**
 * A controlled modal component for editing an existing class's details.
 * It is a near-copy of the StudentModal, demonstrating a reusable pattern.
 *
 * @param {object} props
 * @param {boolean} props.open - Controls whether the modal is visible.
 * @param {function} props.onClose - Callback to close the modal.
 * @param {function} props.onSubmit - Async callback to handle form submission.
 * @param {object|null} props.initialData - The current class data for pre-filling the form.
 * @param {boolean} props.isLoading - Whether a submission is in progress.
 * @param {string|null} props.error - An error message from a failed submission.
 */
const ClassEditModal = ({ open, onClose, onSubmit, initialData, isLoading, error }) => {
  // --- Internal State Management for Form Fields ---
  const [formData, setFormData] = useState({ name: '', description: '' });

  // --- Side Effect to Synchronize Form State ---
  // This populates the form with the current class data when the modal opens.
  useEffect(() => {
    if (open && initialData) {
      setFormData({ 
        name: initialData.name || '', 
        description: initialData.description || '' 
      });
    }
  }, [open, initialData]);

  // --- Event Handlers ---
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formData);
  };

  // --- Real-time Client-Side Validation ---
  const isFormValid = formData.name.trim() !== '';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" disableEscapeKeyDown={isLoading}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Edit Class Details
        <IconButton aria-label="close" onClick={onClose} disabled={isLoading}>
          <CloseOutlined />
        </IconButton>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            
            <TextField
              autoFocus
              required
              id="name"
              name="name"
              label="Class Name"
              type="text"
              fullWidth
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
            />
            <TextField
              id="description"
              name="description"
              label="Description (Optional)"
              multiline
              rows={4}
              fullWidth
              value={formData.description}
              onChange={handleChange}
              disabled={isLoading}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} variant="outlined" disabled={isLoading}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isFormValid || isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ClassEditModal;