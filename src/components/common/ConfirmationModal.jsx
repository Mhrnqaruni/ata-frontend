// /src/components/common/ConfirmationModal.jsx

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

/**
 * A generic, reusable modal for confirming a user action.
 *
 * @param {object} props
 * @param {boolean} props.open - Controls whether the modal is visible.
 * @param {function} props.onClose - Callback to close the modal (e.g., clicking Cancel).
 * @param {function} props.onConfirm - Callback to execute when the confirm button is clicked.
 * @param {string} props.title - The title to display in the modal header.
 * @param {string} props.description - The descriptive text/question for the modal body.
 */
const ConfirmationModal = ({ open, onClose, onConfirm, title, description }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
    >
      <DialogTitle id="confirmation-dialog-title">
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description">
          {description}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" autoFocus>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;