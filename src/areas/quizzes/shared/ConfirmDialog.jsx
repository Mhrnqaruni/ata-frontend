// The one in-app confirmation window for the quiz pages, never the browser's (R-X9; design.md §3): a question, what
// happens, and buttons that repeat the verb, such as "Finish quiz" · "Keep going", or "Archive instead".
// Area: quizzes

import { useId } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { WORDS } from '../words';

// title: the question ("Finish the quiz?"); children: the consequence; confirmLabel repeats the verb. tone 'bad' is
// for deleting only: Finish and Close stay accent (design.md §7). busy disables both buttons while the action runs,
// and error shows the action's own failure inside the window. extraAction is one more choice, { label, onClick }.
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = WORDS.cancel,
  onConfirm,
  onCancel,
  tone = 'accent',
  busy = false,
  busyLabel,
  error,
  extraAction,
}) {
  const id = useId();
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      PaperProps={{ 'data-mst': 'quiz-confirm' }}
    >
      <DialogTitle id={`${id}-title`}>{title}</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <DialogContentText component="div" id={`${id}-text`}>
          {children}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onCancel}>
          {cancelLabel}
        </Button>
        {extraAction ? (
          <Button disabled={busy} onClick={extraAction.onClick} variant="outlined">
            {extraAction.label}
          </Button>
        ) : null}
        <Button
          disabled={busy}
          onClick={onConfirm}
          variant="contained"
          color={tone === 'bad' ? 'error' : 'primary'}
          data-mst="confirm"
        >
          {busy && busyLabel ? busyLabel : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
