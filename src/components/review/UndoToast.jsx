// The review pages' toast (design.md §3.9): "Mark changed · Undo" for 6 s after a card saves, then "Restored" once
// Undo has put the earlier mark back. It looks like the app's other messages (.mst-toast).
// Area: platform

import { Alert, Button, IconButton, Snackbar } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { REVIEW } from './words';

// toast: useReviewSaves' { open, key, message, undo? }; onClose hides it.
export default function UndoToast({ toast, onClose }) {
  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      autoHideDuration={6000}
      key={toast.key}
      onClose={(event, reason) => reason !== 'clickaway' && onClose()}
      open={toast.open}
    >
      <Alert
        action={
          <>
            {toast.undo ? (
              <Button
                color="inherit"
                onClick={() => {
                  onClose();
                  toast.undo();
                }}
                size="small"
              >
                {REVIEW.undo}
              </Button>
            ) : null}
            <IconButton aria-label={REVIEW.close} color="inherit" onClick={onClose} size="small">
              <CloseRounded fontSize="small" />
            </IconButton>
          </>
        }
        className="mst-toast"
        severity="success"
        sx={{ width: '100%', alignItems: 'center' }}
      >
        {toast.message}
      </Alert>
    </Snackbar>
  );
}
