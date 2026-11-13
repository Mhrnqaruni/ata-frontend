// A reusable confirmation dialog with Cancel and a red confirm button, shown before deleting something.
// Used on the class, assessment and AI tool history screens.
// Area: platform

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
 * @param {string} [props.cancelLabel] - The words on the button that keeps things as they are.
 */
const ConfirmationModal = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  busy = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}) => {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
      PaperProps={{ 'data-mst': 'confirm-dialog' }}
    >
      <DialogTitle id="confirmation-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description">{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button data-mst="cancel" disabled={busy} onClick={onClose} variant="outlined">
          {cancelLabel}
        </Button>
        <Button data-mst="confirm" disabled={busy} onClick={onConfirm} color="error" variant="contained">
          {busy ? 'Deleting…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;
