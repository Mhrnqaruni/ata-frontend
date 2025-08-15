// /src/components/classes/StudentModal.jsx

// --- Core React Imports ---
import React, { useState, useEffect } from 'react';

// --- MUI Component Imports ---
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, IconButton, CircularProgress, Alert } from '@mui/material';

// --- Icon Imports ---
import CloseOutlined from '@mui/icons-material/CloseOutlined';

/**
 * A controlled modal component for adding a new student or editing an existing one.
 * It manages its own form state but is controlled by its parent for visibility,
 * submission logic, and loading/error states.
 *
 * @param {object} props
 * @param {boolean} props.open - Controls whether the modal is visible.
 * @param {function} props.onClose - Callback to close the modal.
 * @param {function} props.onSubmit - Async callback to handle form submission.
 * @param {'add' | 'edit'} props.mode - Determines the modal's behavior and titles.
 * @param {object|null} props.initialData - Student data for pre-filling the form in 'edit' mode.
 * @param {boolean} props.isLoading - Whether a submission is in progress.
 * @param {string|null} props.error - An error message from a failed submission.
 */
const StudentModal = ({ open, onClose, onSubmit, mode, initialData, isLoading, error }) => {
  // --- Internal State Management for Form Fields ---
  const [formData, setFormData] = useState({ name: '', studentId: '' });

  // --- Side Effect to Synchronize Form State ---
  // This useEffect hook runs whenever the modal's 'open' status changes.
  // It correctly populates the form when opening in 'edit' mode, and clears
  // it for 'add' mode, ensuring the form is always in the correct state.
  useEffect(() => {
    if (open) { // Only run this logic when the modal is opened.
      if (mode === 'edit' && initialData) {
        setFormData({ name: initialData.name, studentId: initialData.studentId });
      } else {
        setFormData({ name: '', studentId: '' });
      }
    }
  }, [open, mode, initialData]); // Dependencies for the effect.

  // --- Event Handlers ---
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault(); // Prevent default browser form submission.
    onSubmit(formData);    // Delegate the submission logic to the parent component.
  };

  // --- Real-time Client-Side Validation ---
  const isFormValid = formData.name.trim() !== '' && formData.studentId.trim() !== '';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" disableEscapeKeyDown={isLoading}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {mode === 'add' ? 'Add New Student' : 'Edit Student Details'}
        <IconButton aria-label="close" onClick={onClose} disabled={isLoading}>
          <CloseOutlined />
        </IconButton>
      </DialogTitle>
      
      {/* The form tag enables submission via the 'Enter' key. */}
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {/* Display any submission error passed down from the parent. */}
            {error && <Alert severity="error">{error}</Alert>}
            
            <TextField
              autoFocus // Automatically focus the first field when the modal opens.
              required
              id="name"
              name="name" // The 'name' must match the key in the formData state.
              label="Student Full Name"
              type="text"
              fullWidth
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
            />
            <TextField
              required
              id="studentId"
              name="studentId"
              label="Student ID Number"
              type="text"
              fullWidth
              value={formData.studentId}
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
            {/* The button text dynamically changes based on the mode. */}
            {mode === 'add' ? 'Add Student' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StudentModal;