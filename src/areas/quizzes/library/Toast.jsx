// The quiz list's messages after an action, with Undo where it can be undone ("3 quizzes archived · Undo", design.md
// §5), looking like the app's other messages (.mst-toast); the app's own snackbar has no action button.
// Area: quizzes

import { useCallback, useState } from 'react';
import { Alert, Button, IconButton, Snackbar } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { LIBRARY } from './words';

// Returns [toast, show(message, undo?), close]. The last message stays in `toast` while it fades out.
export function useToast() {
  const [toast, setToast] = useState({ open: false, message: '' });
  const show = useCallback((message, undo) => setToast({ open: true, message, undo, key: Date.now() }), []);
  const close = useCallback(() => setToast((previous) => ({ ...previous, open: false })), []);
  return [toast, show, close];
}

export default function Toast({ toast, onClose }) {
  return (
    <Snackbar
      key={toast.key}
      open={toast.open}
      autoHideDuration={6000}
      onClose={(event, reason) => reason !== 'clickaway' && onClose()}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        className="mst-toast"
        severity="success"
        action={
          <>
            {toast.undo ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  onClose();
                  toast.undo();
                }}
              >
                {LIBRARY.undo}
              </Button>
            ) : null}
            <IconButton aria-label={LIBRARY.close} color="inherit" size="small" onClick={onClose}>
              <CloseRounded fontSize="small" />
            </IconButton>
          </>
        }
        sx={{ width: '100%', alignItems: 'center' }}
      >
        {toast.message}
      </Alert>
    </Snackbar>
  );
}
